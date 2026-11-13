// src/scenes/guinea_pigs.js
// "Home Run": three guinea pigs race through a meadow to their house and tidy veg garden.
// Three shots: A (run) -> B (arrive) -> C (home). Total 14.6 s. Set bpm 120 in src/config.js.
(() => {
  // ---------- timing ----------
  const SA = 4.6, SB = 4.4, SC = 5.6;       // shot lengths (seconds)
  const SPEED = 900;                         // scenery scroll speed in shot A (px/s)
  const S_A_END = SPEED * SA;                // scroll position at the end of A (4140)
  const HOUSE_W = S_A_END + 900 + 1500;      // house x in scroll space (6540)
  const INK2 = '#3E6B3A';                    // dark green outline
  let TK = 0;                                // warm-tone level for the current frame (set in stage())

  // ---------- small helpers (own copies, so nothing depends on engine easing details) ----------
  const P = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const sm = p => { p = Math.min(1, Math.max(0, p)); return p * p * (3 - 2 * p); };
  const eo3 = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const L = (a, b, p) => a + (b - a) * p;
  const wrap = (v, s) => ((v % s) + s) % s;
  const tone = (c, k) => mixCol(c, '#F2A94E', k);
  const K = (t, keys) => {                   // smooth keyframes for scalars
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
        return v0 + (v1 - v0) * sm((t - t0) / (t1 - t0));
      }
    }
    return keys[keys.length - 1][1];
  };
  // a hop: crouch, stretch through the air, squash on landing. dy in u (negative = up)
  const hop = (t, t0, t1, h) => {
    const p = (t - t0) / (t1 - t0);
    if (p < 0 || p > 1) return { dy: 0, sq: 0 };
    if (p < .18) return { dy: 0, sq: .2 * Math.sin(Math.PI * p / .18) };
    if (p < .82) { const a = (p - .18) / .64; return { dy: -h * 4 * a * (1 - a), sq: -.12 * Math.sin(Math.PI * a) }; }
    return { dy: 0, sq: .22 * Math.sin(Math.PI * (p - .82) / .18) };
  };
  const twoHops = (t, t0, h) => {
    const a = hop(t, t0, t0 + .5, h), b = hop(t, t0 + .55, t0 + 1.05, h);
    return { dy: a.dy + b.dy, sq: a.sq + b.sq };
  };
  // a gallop pose from a phase (in cycles)
  const runPose = (ph, amp = 1, run = 1) => {
    const air = Math.max(0, Math.sin(TAU * ph));
    return { ph, run, dy: -1.1 * amp * air * run, sq: run * (.08 * (1 - air) - .05 * air) * amp, earK: .6 * Math.sin(TAU * ph - .8) * run };
  };
  const popK = (t, t0, d) => (t < t0 || t > t0 + d) ? 0 : backOut(P(t, t0, t0 + .28)) * (1 - sm(P(t, t0 + d - .3, t0 + d)));
  const emo = (kind, x, y, u, dy, t, t0, d) => {
    const k = popK(t, t0, d);
    if (k > .01) emote(kind, x + 4.8 * u, y + (dy - 8.2) * u, u * .9, k, t - t0);
  };

  // ---------- the guinea pig (faces right) ----------
  const SIL = [[-5.0, -1.3], [-5.7, -3.0], [-4.7, -5.0], [-2.2, -6.0], [1.0, -6.1], [3.0, -6.0], [4.8, -5.5],
    [6.4, -4.4], [6.95, -3.3], [6.5, -2.2], [5.2, -1.5], [3.5, -1.0], [0.5, -0.9], [-2.5, -0.9]];

  function pig(x, y, u, o = {}) {
    const {
      id = 'p', col = '#D98B4A', patch = '#FFF2D8', patches = [], shade = '#6A9B50',
      ph = 0, run = 0, dy = 0, sq = 0, rot = 0, loaf = false,
      eye = 'open', mouth = 'smile', lookX = 0, earK = 0
    } = o;
    const j = u * .07, ink = PAL.ink;
    const dk = mixCol(col, '#2B1D17', .3), md = mixCol(col, '#2B1D17', .12);
    const lift = Math.min(6, Math.max(0, -dy)) / 6;

    boilSeed(id + 'sh');
    paint(ellPts(x, y + .15 * u, (5.4 - 1.3 * lift) * u, (.75 - .25 * lift) * u, 20, 0), { wash: shade, ink: null });

    push();
    translate(x, y + dy * u);
    rotate(rot);
    scale(1 + sq * .6, 1 - sq);

    const legH = loaf ? .4 : .8, legY = loaf ? -.3 : -.55;
    const leg = (bx, p, far) => {
      const a = TAU * (ph + p);
      const lx = bx + run * 1.7 * Math.sin(a);
      const lf = run * 1.2 * Math.max(0, Math.cos(a));
      boilSeed(id + 'leg' + bx);
      paint(ellPts(lx * u, (legY - lf) * u, .95 * u, legH * u, 12, j * .5), { wash: far ? dk : md, ink, sw: 1 });
    };
    leg(3.1, .12, true); leg(-3.0, .62, true);

    boilSeed(id + 'body');
    paint(SIL.map(([a, b]) => [a * u, b * u]), { wash: col, ink, sw: 1.4, curv: .8 });
    patches.forEach(([cx, cy, rx, ry, r], i) => {
      boilSeed(id + 'pt' + i);
      paint(ellPts(cx * u, cy * u, rx * u, ry * u, 16, j * .5, r || 0), { wash: patch, ink: null });
    });

    leg(3.9, 0, false); leg(-3.7, .5, false);

    boilSeed(id + 'ear');
    paint(ellPts(3.0 * u, -5.5 * u, 1.0 * u, .7 * u, 14, j * .5, -.5 + earK), { wash: '#E3A09C', ink, sw: 1 });

    const ex = (5.15 + lookX * .3) * u, ey = -4.35 * u;
    boilSeed(id + 'eye');
    if (eye === 'open') {
      paint(ellPts(ex, ey, .5 * u, .6 * u, 10, 0), { wash: ink, ink: null });
      paint(ellPts(ex + .12 * u, ey - .2 * u, .17 * u, .17 * u, 8, 0), { wash: PAL.cream, ink: null });
    } else if (eye === 'wide') {
      paint(ellPts(ex, ey, .75 * u, .85 * u, 12, 0), { wash: PAL.cream, ink, sw: 1 });
      paint(ellPts(ex + lookX * .2 * u, ey, .38 * u, .45 * u, 10, 0), { wash: ink, ink: null });
    } else if (eye === 'happy') {
      inkLine([[ex - .5 * u, ey + .2 * u], [ex, ey - .4 * u], [ex + .5 * u, ey + .2 * u]], 2.2, ink, 'ink', 1);
    } else { // closed / squeezed
      inkLine([[ex - .5 * u, ey], [ex, ey + .12 * u], [ex + .5 * u, ey]], 2.2, ink, 'ink', 1);
    }

    boilSeed(id + 'nose');
    paint(ellPts(6.85 * u, -3.35 * u, .5 * u, .42 * u, 10, 0), { wash: '#E58E8E', ink, sw: .8 });

    boilSeed(id + 'mouth');
    if (mouth === 'open') {
      paint(ellPts(5.8 * u, -2.25 * u, .65 * u, .5 * u, 12, 0), { wash: '#8A3B3B', ink, sw: 1 });
    } else {
      inkLine([[6.3 * u, -2.5 * u], [5.75 * u, -2.05 * u], [5.1 * u, -2.4 * u]], 1.6, ink, 'ink', 1);
    }
    boilSeed(id + 'wh');
    inkLine([[6.6 * u, -3.05 * u], [8.0 * u, -3.55 * u]], .8, ink, 'inkfine');
    inkLine([[6.6 * u, -2.85 * u], [8.0 * u, -2.7 * u]], .8, ink, 'inkfine');
    pop();
  }

  const P1 = { id: 'o', col: '#D98B4A', patch: '#FFF2D8', patches: [[-2.3, -3.4, 2.3, 1.6, .3], [5.5, -4.5, .7, 1.0, .6]] };
  const P2 = { id: 'b', col: '#7A4A32', patch: '#EAD2A8', patches: [[-1.0, -2.2, 3.2, .9, 0]] };
  const P3 = { id: 'g', col: '#A9A3A0', patch: '#F7F2EA', patches: [[-3, -4.2, 1.6, 1.3, .2], [1.5, -3.2, 1.4, 1.1, 0]] };

  // ---------- meadow ----------
  const GREENS = ['#6FAE4F', '#7FBF5A', '#5E9E45', '#8ACB62'];
  const FLOWERS = ['#F6A3B8', '#FFE27A', PAL.cream];

  function tuft(x, y, h, key, lt, flower, i) {
    boilSeed(key);
    let fl = null;
    for (let b = 0; b < 4; b++) {
      const off = (b - 1.5) * h * .2, bh = h * (.65 + .35 * hash(i * 4 + b + 1)), w = h * .075;
      const lean = (b - 1.5) * h * .14 + Math.sin(lt * 2.2 + x * .012 + b) * h * .07;
      paint([[x + off - w, y], [x + off + lean * .4 - w * .5, y - bh * .55], [x + off + lean, y - bh],
        [x + off + lean * .4 + w * .5, y - bh * .55], [x + off + w, y]],
        { wash: tone(GREENS[b], TK), ink: tone(INK2, TK), sw: .7, curv: .6 });
      if (b === 1) fl = [x + off + lean, y - bh];
    }
    if (flower && fl) paint(ellPts(fl[0], fl[1] - 5, h * .1, h * .1, 10, 0), { wash: FLOWERS[i % 3], ink: null });
  }

  function tuftRow(S, lt, o) {
    const { par, y, h, seed, span = 2400, n = 11, skipFrom = Infinity, skipTo = Infinity, flowers = false } = o;
    const off = S * par;
    const m0 = Math.floor((off - 250 - span) / span), m1 = Math.ceil((off + 2200) / span);
    for (let i = 0; i < n; i++) for (let m = m0; m <= m1; m++) {
      const w = (i + .15 + .7 * hash(i + seed * 17)) * span / n + m * span;
      const sx = w - off;
      if (sx < -250 || sx > 2200) continue;
      if (w > skipFrom && w < skipTo) continue;
      const ty = y + (hash(i * 3 + seed * 5) - .5) * 30;
      const th = h * (.75 + .5 * hash(i + seed * 9));
      tuft(sx, ty, th, 'tf' + seed + '-' + i + '-' + m, lt, flowers && hash(i * 7 + seed) > .55, i);
    }
  }

  function backdrop(S, lt, k) {
    boilSeed('sky');
    paint(rectPts(-400, -400, W + 800, H + 800), { wash: tone('#BFE3F0', k * 1.5), ink: null });
    const sy = 230 + 480 * k;
    boilSeed('sun');
    glow(420, sy, 320, '#FFE9A8');
    paint(ellPts(420, sy, 62, 62, 24, 1), { wash: tone('#FFF3C4', k * .4), ink: null });
    for (let i = 0; i < 3; i++) {
      const cx = wrap([300, 1150, 1850][i] - S * .05 + lt * 8 + 400, 2800) - 500, cy = [150, 230, 120][i];
      boilSeed('cl' + i);
      [[0, 0, 120, 38], [-80, 10, 80, 28], [85, 12, 90, 30]].forEach(([dx, dyy, rx, ry]) =>
        paint(ellPts(cx + dx, cy + dyy, rx, ry, 20, 2), { wash: tone(PAL.cream, k * .5), ink: null }));
    }
    for (let i = 0; i < 4; i++) {
      const x = wrap(i * 600 - S * .08 + 300, 2400) - 400;
      boilSeed('h1' + i);
      paint(ellPts(x, 730, 430 + 170 * hash(i + 3), 170 + 60 * hash(i + 9), 36, 3), { wash: tone('#A7D1A0', k), ink: null });
    }
    for (let i = 0; i < 3; i++) {
      const x = wrap(i * 800 - S * .2 + 300, 2400) - 400;
      boilSeed('h2' + i);
      paint(ellPts(x, 765, 380 + 120 * hash(i + 21), 120 + 50 * hash(i + 5), 36, 3), { wash: tone('#8CC37F', k), ink: null });
    }
    for (let i = 0; i < 5; i++) {
      const x = wrap(i * 480 + 100 - S * .4 + 300, 2400) - 400;
      boilSeed('bu' + i);
      paint(ellPts(x, 700, 95, 62, 20, 2), { wash: tone('#5FA063', k), ink: tone(INK2, k), sw: 1 });
      paint(ellPts(x + 70, 715, 70, 48, 18, 2), { wash: tone('#68AA6B', k), ink: tone(INK2, k), sw: 1 });
    }
    boilSeed('gr');
    paint(rectPts(-400, 660, W + 800, H), { wash: tone('#8CC468', k), ink: null });
    boilSeed('gr2');
    paint(ellPts(960, 1050, 1800, 190, 40, 3), { wash: tone('#7BB259', k), ink: null });
  }

  // ---------- house and garden ----------
  function arch(cx, yb, w, h, n = 10) {
    const hw = w / 2, cy = yb - h + hw, pts = [[cx - hw, yb], [cx - hw, cy]];
    for (let i = 1; i < n; i++) { const a = Math.PI + Math.PI * i / n; pts.push([cx + hw * Math.cos(a), cy + hw * Math.sin(a)]); }
    pts.push([cx + hw, cy], [cx + hw, yb]);
    return pts;
  }

  function house(x, lt, k, openK) {
    const by = 800, ink = PAL.ink;
    boilSeed('hsh'); paint(ellPts(x, by + 8, 430, 34, 30, 2), { wash: tone('#6FA050', k), ink: null });
    boilSeed('chim'); paint(rectPts(x + 170, 365, 66, 150, 1.5), { wash: tone('#B5654C', k * .5), ink, sw: 1.3 });
    for (let i = 0; i < 4; i++) {
      const a = (lt * .3 + i / 4) % 1;
      boilSeed('smk' + i);
      paint(ellPts(x + 203 + Math.sin(a * 5 + i) * 18 + a * 50, 355 - a * 230, 16 + a * 34, 14 + a * 28, 16, 2),
        { wash: PAL.cream, washOp: 200 * (1 - a), ink: null });
    }
    boilSeed('wall'); paint(rrPts(x - 300, 515, 600, 285, 8, 1.5), { wash: tone('#F2E2BF', k * .6), ink, sw: 1.5 });
    [-195, 195].forEach(sx => {
      boilSeed('win' + sx);
      paint(rrPts(x + sx - 45, 568, 90, 88, 8, 1), { wash: tone('#F7DB8E', k * .3), ink, sw: 1.2 });
      inkLine([[x + sx, 568], [x + sx, 656]], 1.2, ink, 'inkfine');
      inkLine([[x + sx - 45, 612], [x + sx + 45, 612]], 1.2, ink, 'inkfine');
      boilSeed('wbox' + sx);
      paint(rrPts(x + sx - 55, 660, 110, 22, 5, 1), { wash: '#9C6B43', ink, sw: 1 });
      for (let f = 0; f < 5; f++)
        paint(ellPts(x + sx - 40 + f * 20, 656 - 3 * (f % 2), 8, 8, 10, .5), { wash: ['#F28DA6', '#FFD866', '#F28DA6', PAL.cream, '#FFD866'][f], ink: null });
    });
    if (openK > .02) {
      boilSeed('dglow'); glow(x, 720, 340 * openK, '#FFC766');
      glow(x, 830, 230 * openK, '#FFB955');
    }
    const dw = 110, dh = 165;
    if (openK > .01) {
      boilSeed('dint'); paint(arch(x, by, dw, dh), { wash: '#FFD98A', ink, sw: 1.4, curv: .3 });
      boilSeed('dint2'); paint(ellPts(x, by - 70, 38, 62, 16, 1), { wash: '#FFF1B8', ink: null });
    }
    const lw = Math.max(10, dw * (1 - .86 * openK));
    boilSeed('dleaf');
    paint(arch(x - dw / 2 + lw / 2, by, lw, dh), { wash: mixCol(tone('#4E9A94', k * .4), '#2B1D17', .2 * openK), ink, sw: 1.4, curv: .3 });
    if (openK < .2) paint(ellPts(x + 32, by - 78, 6, 6, 8, 0), { wash: '#F6E7B0', ink, sw: .6 });
    boilSeed('mat'); paint(rrPts(x - 38, by + 2, 76, 12, 4, 1), { wash: '#B04A3A', ink, sw: .8 });
    boilSeed('roof');
    paint([[x - 395, 540], [x, 318], [x + 395, 540]], { wash: tone(PAL.clay, k * .4), ink, sw: 1.8 });
    boilSeed('roofl');
    [[470, 230], [420, 140], [380, 70]].forEach(([yy, hw]) => inkLine([[x - hw, yy], [x + hw, yy]], 1, '#9B4636', 'ink'));
  }

  function cabbage(x, y, r, key, k) {
    boilSeed(key);
    paint(ellPts(x, y - r * .7, r, r * .8, 16, 1), { wash: tone('#7FB89A', k), ink: tone(INK2, k), sw: 1 });
    inkLine([[x - r * .4, y - r * .6], [x, y - r * 1.1], [x + r * .4, y - r * .6]], .8, tone(INK2, k), 'inkfine', 1);
  }
  function lettuce(x, y, r, key, k) {
    boilSeed(key);
    paint(starPts(x, y - r * .7, r, r * .65, 9, 0), { wash: tone('#A9D86E', k), ink: tone(INK2, k), sw: .9, curv: .4 });
  }
  function carrot(x, y, lean, key, k) {
    boilSeed(key);
    paint(ellPts(x, y - 3, 7, 4, 10, 0), { wash: tone('#F28C38', k), ink: PAL.ink, sw: .6 });
    for (let b = -1; b <= 1; b++)
      paint([[x + b * 3 - 5, y - 3], [x + b * 13 + lean, y - 38 + Math.abs(b) * 8], [x + b * 3 + 5, y - 3]],
        { wash: tone('#5E9E45', k), ink: tone(INK2, k), sw: .6 });
  }
  function tomato(x, y, lean, key, k) {
    boilSeed(key);
    inkLine([[x, y + 10], [x + lean, y - 115]], 2.4, '#8B6A4A', 'ink');
    for (let n = 0; n < 3; n++)
      paint(ellPts(x + lean * (.3 + n * .3) + (n % 2 ? 14 : -14), y - 30 - n * 28, 16, 8, 12, .5, n % 2 ? .5 : -.5),
        { wash: tone('#5E9E45', k), ink: tone(INK2, k), sw: .7 });
    paint(ellPts(x + 12 + lean * .2, y - 18, 9, 9, 12, .5), { wash: '#E4553F', ink: PAL.ink, sw: .7 });
    paint(ellPts(x - 12 + lean * .5, y - 58, 8, 8, 12, .5), { wash: '#E4553F', ink: PAL.ink, sw: .7 });
  }

  function garden(houseX, lt, k) {
    const gx = houseX - 380, gw = 760;
    [[810, 62], [895, 62]].forEach(([yb, hh], bi) => {
      boilSeed('bedE' + bi); paint(rrPts(gx - 8, yb - 8, gw + 16, hh + 16, 10, 1), { wash: tone('#B98A5B', k * .4), ink: PAL.ink, sw: 1.3 });
      boilSeed('bedS' + bi); paint(rrPts(gx, yb, gw, hh, 6, 1), { wash: tone('#6F4A33', k * .3), ink: null });
      boilSeed('bedL' + bi);
      inkLine([[gx + 14, yb + hh * .3], [gx + gw - 14, yb + hh * .3]], 1, '#55382A', 'dry');
      inkLine([[gx + 14, yb + hh * .75], [gx + gw - 14, yb + hh * .75]], 1, '#55382A', 'dry');
    });
    for (let i = 0; i < 10; i++) {
      const px = gx + 45 + 72 * i, lean = Math.sin(lt * 1.6 + i) * 3;
      if (i % 3 === 0) tomato(px, 846, lean, 'tom' + i, k); else cabbage(px, 846, 24 + 3 * hash(i), 'cab' + i, k);
    }
    for (let i = 0; i < 10; i++) {
      const px = gx + 45 + 72 * i, lean = Math.sin(lt * 1.6 + i + 2) * 3;
      if (i % 2 === 0) lettuce(px, 933, 24 + 3 * hash(i + 5), 'let' + i, k); else carrot(px, 933, lean, 'car' + i, k);
    }
  }

  // ---------- stage: back to front ----------
  function stage(lt, S, k, houseX, openK, pigs) {
    TK = k;
    backdrop(S, lt, k);
    tuftRow(S, lt, { par: .9, y: 790, h: 60, seed: 1, n: 12 });
    if (houseX !== null) { house(houseX, lt, k, openK); garden(houseX, lt, k); }
    pigs[0](); pigs[1]();
    tuftRow(S, lt, { par: 1, y: 905, h: 95, seed: 2, n: 11, flowers: true, skipFrom: HOUSE_W - 440, skipTo: HOUSE_W + 460 });
    pigs[2]();
    tuftRow(S, lt, { par: 1.4, y: 1050, h: 85, seed: 3, n: 9 });
  }

  // =====================================================================
  // SHOT A: the run. Pig 3 (small, grey) lags, pig 1 notices, pig 3 takes a big hop and catches up.
  // reads: 0-.5 iris opens on three pigs running | .5-1.8 grey one falls behind (sweat) |
  //        1.9-2.7 leader notices (?) and slows | 2.7-3.5 big hop | 3.5-4.3 all together, happy
  // =====================================================================
  function shotA(t, lt, dur) {
    const k = 0, S = SPEED * lt, sh = tone('#6A9B50', k);
    camBegin(960 + 10 * Math.sin(lt * .9), 540 + 5 * Math.sin(lt * 3.1), 1.03 + .015 * lt);
    const x1 = K(lt, [[0, 1250], [1.5, 1250], [2.3, 1110], [4.6, 1110]]) + 14 * Math.sin(lt * 1.7);
    const x2 = K(lt, [[0, 1010], [1.6, 1010], [2.4, 930], [4.6, 960]]) + 12 * Math.sin(lt * 1.9 + 1);
    const x3 = K(lt, [[0, 830], [1.8, 500], [2.7, 500], [3.5, 870], [4.6, 880]]);
    const lab = K(lt, [[0, 1], [1, 1], [1.6, .55], [2.5, .55], [2.7, 1]]);
    const h3 = hop(lt, 2.7, 3.5, 5.5);
    const run3 = 1 - .7 * sm(P(lt, 2.7, 2.85)) * (1 - sm(P(lt, 3.35, 3.5)));
    const r1 = runPose(2 * lt, 1, 1), r2 = runPose(2 * lt + .37, 1, 1), r3 = runPose(3 * lt + .71, lab, run3);
    r3.dy += h3.dy; r3.sq += h3.sq;
    r1.earK += .6 * sm(P(lt, 1.9, 2.1)) * (1 - sm(P(lt, 2.6, 2.8)));
    const e1 = lt > 3.5 ? 'happy' : (lt > 1.9 && lt < 2.7 ? 'wide' : 'open');
    const e2 = lt > 3.5 ? 'happy' : 'open';
    const e3 = lt < 1 ? 'open' : lt < 2.6 ? 'closed' : lt < 3.5 ? 'wide' : 'happy';
    const m1 = lt > 3.5 ? 'open' : 'smile', m3 = ((lt > 1 && lt < 2.6) || lt > 3.5) ? 'open' : 'smile';
    stage(lt, S, k, null, 0, [
      () => pig(x1, 850, 23, { ...P1, shade: sh, ...r1, eye: e1, mouth: m1, lookX: 1 }),
      () => pig(x2, 885, 24, { ...P2, shade: sh, ...r2, eye: e2, mouth: m1, lookX: 1 }),
      () => pig(x3, 925, 19, { ...P3, shade: sh, ...r3, eye: e3, mouth: m3, lookX: 1 })
    ]);
    emo('sweat', x3, 925, 19, r3.dy, lt, 1.2, 1.4);
    emo('?', x1, 850, 23, r1.dy, lt, 1.9, .9);
    emo('spark', x3, 925, 19, r3.dy, lt, 3.5, .9);
    const at = toScreen(x1, 830);
    camEnd();
    if (lt < .5) iris(at[0], at[1], L(0, 1700, easeIn(lt / .5)));
    if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6);
  }

  // =====================================================================
  // SHOT B: the arrival. House and garden scroll in, the pigs skid to a halt.
  // reads: 0-1.2 still running | 1.2-2.1 leader spots the house (!) | 2.0-2.9 second pig sparkles |
  //        3.0-3.9 skid stop, panting, grey pig hearts | 3.95-4.4 iris closes on leader
  // =====================================================================
  function shotB(t, lt, dur) {
    const k = .12, sh = tone('#6A9B50', k);
    const x = Math.min(1, lt / 3), trav = 900 * eo3(lt / 3), S = S_A_END + trav, houseX = HOUSE_W - S;
    const cyc = 1 - Math.pow(1 - x, 3), runAmt = lt < 3 ? Math.pow(1 - x, .4) : 0;
    camBegin(960 + 6 * Math.sin(lt * .7), 540, 1 + .012 * lt);
    const x1 = K(lt, [[0, 1110], [3.2, 950]]), x2 = K(lt, [[0, 960], [3.2, 730]]), x3 = K(lt, [[0, 880], [3.2, 520]]);
    const pose = (off, rate, i) => {
      const ph = ((off + rate * SA) % 1) + rate * cyc;
      const r = runPose(ph, 1, runAmt);
      const T = 3 + .1 * i, d = lt - T;
      r.rot = lt < T ? -.12 * sm(P(lt, T - 1.2, T)) : -.12 * Math.exp(-3.5 * d) * Math.cos(12 * d);
      r.sq += (lt > 3 ? .03 * Math.sin(lt * 9 + i) * sm(P(lt, 3, 3.4)) : 0) + (lt > T ? .1 * Math.exp(-5 * d) * Math.abs(Math.cos(9 * d)) : 0);
      return r;
    };
    const r1 = pose(0, 2, 0), r2 = pose(.37, 2, 1), r3 = pose(.71, 3, 2);
    r1.earK += .6 * sm(P(lt, 1.2, 1.4)) * (1 - sm(P(lt, 2.3, 2.5)));
    const pant = i => lt > 3 ? (Math.sin(lt * 10 + i * 2) > 0 ? 'open' : 'smile') : 'smile';
    const e1 = (lt > 1.2 && lt < 2.5) ? 'wide' : lt > 3.2 ? 'happy' : 'open';
    const e2 = (lt > 2.0 && lt < 2.9) ? 'wide' : lt > 3.3 ? 'happy' : 'open';
    const e3 = lt > 3.2 ? 'happy' : 'open';
    stage(lt, S, k, houseX, 0, [
      () => pig(x1, 850, 23, { ...P1, shade: sh, ...r1, eye: e1, mouth: pant(0), lookX: 1 }),
      () => pig(x2, 885, 24, { ...P2, shade: sh, ...r2, eye: e2, mouth: pant(1), lookX: 1 }),
      () => pig(x3, 925, 19, { ...P3, shade: sh, ...r3, eye: e3, mouth: pant(2), lookX: 1 })
    ]);
    emo('!', x1, 850, 23, r1.dy, lt, 1.2, .9);
    emo('spark', x2, 885, 24, r2.dy, lt, 2.0, .9);
    emo('hearts', x3, 925, 19, r3.dy, lt, 3.3, 1.0);
    const at = toScreen(x1, 830);
    camEnd();
    if (lt < .3) brushWipe(.5 + lt / .6);
    if (lt > dur - .5) iris(at[0], at[1], L(1700, 0, easeIn(P(lt, dur - .5, dur))));
  }

  // =====================================================================
  // SHOT C: home. The pigs sit and pant, the door opens with warm light, they hop for joy.
  // reads: 0-.5 iris opens on leader | .5-1.5 pigs rest in front of the garden | 1.55-2.4 pig 2 hears
  //        something (!) | 2.1-3.0 door opens, light floods | 3.0-4.3 hop hop, hearts | 4.3-5.0 hold | iris out
  // =====================================================================
  function shotC(t, lt, dur) {
    const k = .25, sh = tone('#6A9B50', k), S = S_A_END + 900, houseX = 1500;
    const openK = sm(P(lt, 2.1, 2.9));
    camBegin(1150 + 25 * lt, 650, 1.18 + .025 * lt);
    const sit = (i, t0) => {
      const h = twoHops(lt, t0, 2.6);
      return { loaf: true, dy: .55 + h.dy, sq: .08 + .02 * Math.sin(lt * 5 + i) + h.sq, earK: .3 * Math.sin(lt * 6 + i) };
    };
    const r1 = sit(0, 3.25), r2 = sit(1, 3.12), r3 = sit(2, 3.0);
    r2.earK += .6 * sm(P(lt, 1.55, 1.7)) * (1 - sm(P(lt, 2.3, 2.5)));
    const e1 = lt < 1.7 ? 'open' : lt < 3 ? 'wide' : 'happy';
    const e2 = lt < 1.55 ? 'open' : lt < 3 ? 'wide' : 'happy';
    const e3 = lt < 3 ? 'open' : 'happy';
    const mo = lt > 3 && lt < 4.3 ? 'open' : 'smile';
    const m3 = (lt > .5 && lt < 1.6 && Math.sin(lt * 9) > 0) ? 'open' : mo;
    stage(lt, S, k, houseX, openK, [
      () => pig(950, 850, 23, { ...P1, shade: sh, ...r1, eye: e1, mouth: mo, lookX: 1 }),
      () => pig(730, 885, 24, { ...P2, shade: sh, ...r2, eye: e2, mouth: mo, lookX: 1 }),
      () => pig(520, 925, 19, { ...P3, shade: sh, ...r3, eye: e3, mouth: m3, lookX: 1 })
    ]);
    emo('!', 730, 885, 24, r2.dy, lt, 1.55, .9);
    emo('hearts', 950, 850, 23, r1.dy, lt, 3.35, 1.4);
    const at = toScreen(950, 830);
    camEnd();
    if (lt < .5) iris(at[0], at[1], L(0, 1700, easeIn(lt / .5)));
    if (lt > dur - .6) iris(at[0], at[1], L(1700, 0, easeIn(P(lt, dur - .6, dur))));
  }

  shots([[0, shotA], [SA, shotB], [SA + SB, shotC]]);
})();
