/* HTML Reel's clock: one scene of a reel (its hook, its tail, a title)
   drawn from one number. window.__frame(t) sets every element from t, the
   seconds into the scene, on a fixed stage in the reel's shape: 540 × 960
   for 9:16 (1080 × 1920 when it's rendered at 2×), or 4:5, 1:1 or 16:9.
   Three things drive the same page:
   - scripts/render-frames.mjs calls __frame(t) once a frame, screenshots,
     and makes an MP4;
   - Fil's video editor plays it as an HTML scene, stepping its clock
     (performance.now and animation frames) a frame at a time;
   - a browser plays it live, looping, with ?controls for a scrubber.
   Retimed to a real take, it plays t = W(τ): word anchors map τ, the
   seconds of the real delivery, to t, the scratch voice's seconds the
   scene was animated to. Nothing is re-animated, only re-timed.
   No framework, no build: <script src="reel-clock.js"></script>, then
   HTMLReel.scene({ dur, draw }). Works from file:// too. */
(function (root) {
  'use strict';
  // The stage in CSS pixels for each shape, and the safe area's top and
  // bottom on it: on 9:16 the 3:4 band (280–1640 of 1920), clear of the
  // app's buttons, the caption band and a 3:4 crop of the feed; on the
  // others, 8% in from the top and the bottom.
  const SHAPES = { '9:16': [540, 960], '4:5': [540, 675], '1:1': [540, 540], '16:9': [960, 540] };
  const safeOf = (shape = '9:16') => {
    const h = (SHAPES[shape] || SHAPES['9:16'])[1];
    return shape === '9:16' || !SHAPES[shape] ? [140, 820] : [Math.round(h * 0.08), Math.round(h * 0.92)];
  };
  const W = 540,
    H = 960,
    SAFE = safeOf('9:16');

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const k01 = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  /** 0 → 1 between a and b, eased in and out (cubic). */
  const ease = (t, a, b) => {
    const x = k01(t, a, b);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  /** 0 → 1 between a and b, fast then settling (cubic out). */
  const out = (t, a, b) => 1 - Math.pow(1 - k01(t, a, b), 3);
  /** 0 → 1 between a and b, overshooting a little and settling (back out). */
  const back = (t, a, b, c1 = 1.5) => {
    const x = k01(t, a, b) - 1;
    return 1 + (c1 + 1) * x * x * x + c1 * x * x;
  };
  /** from → to between a and b, eased. */
  const mix = (t, a, b, from, to) => from + (to - from) * ease(t, a, b);
  /** A beat: rises to 1 at `at` over `up` s, dies away over `down` s. */
  const pulse = (t, at, up = 0.08, down = 0.5) => (t < at ? Math.exp(-Math.pow((at - t) / up, 2)) : Math.exp(-(t - at) / down));
  /** `text` typed between a and b. */
  const typed = (text, t, a, b) => text.slice(0, Math.round(text.length * k01(t, a, b)));
  /** The value of the last cue at or before t: cue(t, [[1, 'a'], [2, 'b']], 'none'). */
  const cue = (t, list, before) => list.reduce((v, [at, x]) => (t >= at ? x : v), before);
  /** A word that rises into its mask on its word of the voice: 0 → 1 over
      `dur` s from `at`, and out again over the same from `leave`. Hide it
      135% down (translateY((1 - word(…)) * 135%)): the mask has 0.2 em of
      room under the word, and at 100 px and more 110% shows a sliver. */
  const word = (t, at, leave = Infinity, dur = 0.32) => out(t, at, at + dur) * (1 - ease(t, leave, leave + dur));
  /** Shrinks el's type until its line fits `max` stage px (by default its
      stage's width less 24 px each side), measured with every word in
      place (the transforms inside it off while measuring), and returns the
      size in px. For a payoff or a keyword on one line (white-space:
      nowrap) whose length isn't known: call it in setup, after the fonts. */
  function fit(el, max) {
    const doc = el.ownerDocument;
    const stage = el.closest('#stage') || doc.body;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    if (max === undefined) max = stage.offsetWidth - 48;
    const moved = [...el.querySelectorAll('*')].filter((x) => x.style.transform).map((x) => [x, x.style.transform]);
    moved.forEach(([x]) => (x.style.transform = 'none'));
    const r = doc.createRange();
    r.selectNodeContents(el);
    const w = r.getBoundingClientRect().width / k;
    moved.forEach(([x, t]) => (x.style.transform = t));
    const size = parseFloat(root.getComputedStyle(el).fontSize);
    if (w > max) el.style.fontSize = ((size * max) / w).toFixed(2) + 'px';
    return w > max ? (size * max) / w : size;
  }

  /** τ → t through `anchors`, [[τ, t], …] (a real word's time, the same
      word's time in the scratch voice), sorted by τ: straight lines between
      them, at the real pace (slope 1) past either end. Pairs that would
      run backwards are dropped, so the map only ever moves forward. */
  function warp(anchors) {
    const a = [];
    for (const [x, y] of (anchors || []).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((p, q) => p[0] - q[0]))
      if (!a.length || (x > a[a.length - 1][0] && y > a[a.length - 1][1])) a.push([x, y]);
    if (a.length < 2) {
      // None, or one: the same pace, shifted by that one pair.
      const d = a.length ? a[0][1] - a[0][0] : 0;
      const W1 = (x) => x + d;
      W1.inverse = (y) => y - d;
      W1.anchors = a;
      return W1;
    }
    const W_ = (x) => {
      if (x <= a[0][0]) return a[0][1] + (x - a[0][0]);
      if (x >= a[a.length - 1][0]) return a[a.length - 1][1] + (x - a[a.length - 1][0]);
      let i = 0;
      while (x > a[i + 1][0]) i++;
      return a[i][1] + ((x - a[i][0]) * (a[i + 1][1] - a[i][1])) / (a[i + 1][0] - a[i][0]);
    };
    /** t → τ, the other way. */
    W_.inverse = (y) => {
      if (y <= a[0][1]) return a[0][0] + (y - a[0][1]);
      if (y >= a[a.length - 1][1]) return a[a.length - 1][0] + (y - a[a.length - 1][1]);
      let i = 0;
      while (y > a[i + 1][1]) i++;
      return a[i][0] + ((y - a[i][1]) * (a[i + 1][0] - a[i][0])) / (a[i + 1][1] - a[i][1]);
    };
    W_.anchors = a;
    return W_;
  }

  const params = () => {
    try {
      return new URLSearchParams(root.location ? root.location.search : '');
    } catch (e) {
      return new URLSearchParams('');
    }
  };

  /** The scene: `dur` (seconds, the scratch voice's), `draw(t, $)` sets
      every element from t (and may return a promise), `setup()` runs once
      before the first frame (measure, build), `anchors` retimes it to a
      real take ([[τ, t], …], or none), `shape` its frame ('9:16', '4:5',
      '1:1' or '16:9'), `stage` its root (#stage), `cover` the t of its
      best moment, which its first `coverHold` seconds (0.2) show: the
      reel's first frame, the still its grid and feed show. Puts __frame,
      __dur, __cover, __bounds, __shape and __ready on the window, fits
      the stage to the window, and plays it live unless something drives
      it. */
  function scene(o) {
    const doc = root.document;
    const $ = (s) => doc.querySelector(s);
    const stage = typeof o.stage === 'string' || !o.stage ? $(o.stage || '#stage') : o.stage;
    const shape = SHAPES[o.shape] ? o.shape : '9:16';
    const [SW, SH] = SHAPES[shape];
    const safe = safeOf(shape);
    if (stage) {
      stage.style.setProperty('--reel-w', SW + 'px');
      stage.style.setProperty('--reel-h', SH + 'px');
    }
    root.__shape = shape;
    const map = warp(o.anchors);
    const dur = o.dur;
    // How long it plays on the real take's clock.
    const length = Math.max(0, map.inverse(dur));
    const q = params();

    // One CSS scale fits the stage to the window (1 when rendered at
    // 540 × 960; 2 in a 1080 × 1920 frame), unless the page places the
    // stage itself (fit: false).
    const fit = () => {
      if (!stage || o.fit === false) return;
      const k = Math.min(root.innerWidth / SW, root.innerHeight / SH) || 1;
      stage.style.setProperty('--k', String(k));
      doc.documentElement.style.setProperty('--k', String(k));
    };
    root.addEventListener('resize', fit);
    fit();

    let ready = null;
    const prepare = () =>
      ready ||
      (ready = (async () => {
        if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
        await Promise.all([...doc.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
        if (o.setup) await o.setup();
        fit();
      })());

    let driven = q.has('frame') || root.__driven === true;
    const coverFor = o.cover == null ? 0 : (o.coverHold ?? 0.2);
    const at = (tau) => clamp(tau < coverFor ? o.cover : map(tau), 0, dur);
    root.__cover = coverFor ? o.cover : null;
    root.__dur = length;
    root.__ready = prepare;
    /** Draws the frame at τ, the real take's seconds (the scratch voice's
        when there are no anchors). Called from outside, it stops the live
        play: the caller owns the clock from then on. */
    root.__frame = async (tau) => {
      driven = true;
      await prepare();
      return o.draw(at(tau), $);
    };
    /** [top, bottom, left, right] of what's shown of the [data-safe]
        elements this frame, in stage pixels, for the safe-area check
        (__safe, and 16 px in from each side): the boxes of what's drawn
        inside each (its words, pictures and leaf boxes, not the container
        around them), as their masks show them (an ancestor that clips cuts
        them), none of what's hidden or see-through. */
    root.__bounds = () => {
      const s = stage ? stage.getBoundingClientRect() : { top: 0, left: 0, height: SH };
      const k = s.height / SH || 1;
      let top = Infinity,
        bottom = -Infinity,
        left = Infinity,
        right = -Infinity;
      const seen = (e) => {
        for (; e && e !== doc.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (+cs.opacity < 0.02 || cs.visibility === 'hidden' || cs.display === 'none') return false;
        }
        return true;
      };
      const shown = (el) => {
        const b = el.getBoundingClientRect();
        let r = { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
        for (let e = el.parentElement; e && e !== doc.body; e = e.parentElement) {
          if (getComputedStyle(e).overflow === 'visible') continue;
          const c = e.getBoundingClientRect();
          r = { top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom), left: Math.max(r.left, c.left), right: Math.min(r.right, c.right) };
        }
        return r.right - r.left >= 1 && r.bottom - r.top >= 1 ? r : null;
      };
      for (const box of doc.querySelectorAll(o.safe || '[data-safe]')) {
        const leaves = [box, ...box.querySelectorAll('*')].filter((e) => !e.children.length || /^(IMG|SVG|CANVAS|VIDEO)$/i.test(e.tagName));
        for (const el of leaves) {
          if (!seen(el)) continue;
          const r = shown(el);
          if (!r) continue;
          top = Math.min(top, (r.top - s.top) / k);
          bottom = Math.max(bottom, (r.bottom - s.top) / k);
          left = Math.min(left, (r.left - s.left) / k);
          right = Math.max(right, (r.right - s.left) / k);
        }
      }
      return [top, bottom, left, right];
    };

    root.__safe = safe;
    root.__width = SW;
    if (q.has('safe') && stage) {
      // The safe area's lines, for drawing a scene.
      const g = doc.createElement('div');
      g.setAttribute('aria-hidden', 'true');
      g.style.cssText = `position:absolute;left:0;right:0;top:${safe[0]}px;height:${safe[1] - safe[0]}px;box-shadow:inset 0 1px 0 #ff3b8b,inset 0 -1px 0 #ff3b8b;pointer-events:none;z-index:2147483647`;
      stage.append(g);
    }

    // Live: from the page's own clock, which Fil's video editor steps a
    // frame at a time (so its frames are exact), and a browser runs (so it
    // loops, holding its end for `hold` s). One playhead: where it was
    // last put (base), plus the time since, while it plays.
    const hold = o.hold == null ? 1 : o.hold;
    const loops = o.loop !== false && !root.__filScene;
    let paused = false,
      base = 0,
      since = root.performance.now(),
      shown = 0;
    const head = () => {
      const tau = paused ? base : base + (root.performance.now() - since) / 1000;
      return loops ? tau % (length + hold) : tau;
    };
    const live = () => {
      if (driven) return;
      if (!paused) {
        shown = head();
        o.draw(at(shown), $);
      }
      root.requestAnimationFrame(live);
    };
    if (o.autoplay !== false && !driven) prepare().then(() => !driven && root.requestAnimationFrame(live));
    else prepare().then(() => !driven && o.draw(0, $));
    // A tab in the background holds its place, rather than jumping on when
    // it's back (never in Fil's video editor, whose clock is its own).
    let wasPlaying = false;
    if (!root.__filScene)
      doc.addEventListener('visibilitychange', () => {
        if (doc.hidden) {
          wasPlaying = !paused;
          api.pause();
        } else if (wasPlaying) api.play();
      });

    const api = {
      dur,
      length,
      shape,
      safe,
      W: map,
      /** Holds the scene at τ. */
      seek(tau) {
        paused = true;
        base = shown = clamp(tau, 0, length);
        return prepare().then(() => o.draw(at(shown), $));
      },
      /** Holds the scene where it is, drawn there. */
      pause() {
        if (paused) return;
        base = shown = head();
        paused = true;
        if (!driven) prepare().then(() => o.draw(at(shown), $));
      },
      /** Plays on from where it's held. */
      play() {
        if (!paused) return;
        if (base >= length) base = 0;
        since = root.performance.now();
        paused = false;
      },
      get paused() {
        return paused;
      },
      /** τ now. */
      get time() {
        return paused ? base : head();
      },
    };
    if (q.has('controls')) controls(api);
    return api;
  }

  /** A quiet bar for a scene: play and pause, a scrubber over all of it,
      and the time. For previews and demos; a render never shows it. */
  function controls(api, el) {
    const doc = root.document;
    const bar = el || doc.body.appendChild(doc.createElement('div'));
    bar.classList.add('reel-controls');
    bar.innerHTML = '<button type="button" aria-label="Pause"></button><input type="range" min="0" step="0.01" aria-label="The scene’s clock"><output></output>';
    const btn = bar.querySelector('button'),
      range = bar.querySelector('input'),
      say = bar.querySelector('output');
    range.max = String(api.length);
    const show = () => {
      btn.textContent = api.paused ? '\u25B6' : '\u275A\u275A';
      btn.setAttribute('aria-label', api.paused ? 'Play' : 'Pause');
    };
    btn.onclick = () => {
      if (api.paused) api.play();
      else api.pause();
      show();
    };
    range.oninput = () => {
      api.seek(+range.value);
      show();
    };
    // Follows the scene however it's played or held, while the bar is on
    // the page (and leaves the scrubber to a hand dragging it).
    let was = null,
      dragging = false;
    range.addEventListener('pointerdown', () => (dragging = true));
    root.addEventListener('pointerup', () => (dragging = false));
    const tick = () => {
      if (!bar.isConnected) return;
      const tau = Math.min(api.time, api.length);
      if (!dragging) range.value = String(tau);
      say.textContent = tau.toFixed(2) + ' s';
      if (api.paused !== was) {
        was = api.paused;
        show();
      }
      root.requestAnimationFrame(tick);
    };
    show();
    tick();
    return bar;
  }

  root.HTMLReel = { scene, controls, warp, ease, out, back, mix, pulse, typed, cue, word, fit, clamp, W, H, SAFE, SHAPES, safeOf };
})(typeof window !== 'undefined' ? window : globalThis);
