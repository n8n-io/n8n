// tasteskill / charts.js — small, dependency-free charts for app screens, drawn in SVG from your data.
// They follow references/app-screens.md: one question per chart, one series that matters, 3–5 quiet
// horizontal gridlines, round ticks that top out above the largest value, 2px straight lines with no
// markers, square bars, no gradients, a bare tooltip, tabular figures. Colours come from CSS variables:
//   --chart-1 … --chart-4 (series), --chart-muted (other series), --chart-mark (a marked period; ink by default),
//   --chart-span (the opacity of a shaded span: about .06 on light, .12 on dark), --chart-track (a time strip's track),
//   --grid, --axis-ink, --ink, --surface, --raised, --rule, --negative
// Usage (after this file loads):
//   Charts.line(el, { labels: ['1 Oct', …], series: [{ name: 'Requests', values: [...] }], format: Charts.fmt.compact })
//   Charts.bars(el, { labels, values, highlight: 6, format })        one bar (or [indices]) may carry the accent; dim: [indices]
//   Charts.diverging(el, { labels, up, down, above: 'Sold', below: 'Bought', mark: [3, 9], markLabel: 'Car charged' })
//   Charts.ring(el, { value: 0.72, label: '72%', sub: 'of capacity' }) a progress ring with its total inside
//   Charts.barList(el, [{ label: 'Berlin', value: 412 }, …], { format, thin })  a ranked list where the row is the bar
//   Charts.plan(el, [{ label: 'Groceries', planned: 600, spent: 412, committed: 60 }, …], { scale: 'row' | 'plan' })  planned against spent
//   Charts.bullet(el, [{ label: 'Bonds', value: 0.31, target: 0.25 }, …])   share against a target
//   Charts.timeline(el, rows, kinds, { days, today, weekends })      who is away when, each kind of booking its own mark
//   Charts.matrix(el, rows, { cols, comfort: 2, today })             slack against a minimum, team by day
//   Charts.timeStrip(el, rows, { open: '08:00', close: '15:00', compareLabel: 'Last Sunday' })  when, within the day
// line, bars and diverging take annotations: [{ at: index, label: 'Deploy a3f09c1', short: 'a3f09c1' }] or spans
// [{ from, to, label: 'Cloud' }]. Their labels sit in rows above the plot, measured once the fonts have loaded, and no
// leader line crosses another label; the rows are reserved only when a label exists. reference: { value, label }, its
// label set where no series passes.
// line takes step: true for a balance that only changes on given days; today: index (the forecast after it is dashed)
// with todayLabel: 'Now 20:34' (set clear of the line); endLabel: true (the last value at the line's end); max: caps a
// flat series with one spike (the peak is labelled); yTicks: fixed ticks for a bounded quantity (0–100%); tickFormat:
// axis labels apart from the tooltip format; xAt: the indices to label. Without xAt the x labels keep one step.
// diverging, timeline, matrix and timeStrip return { svg, legend }, and line returns { legend } for two series or more:
// the legend is drawn from the same style objects as the marks, so a swatch is always the mark scaled down. Put it in
// the card's header, or pass legend: element (or a selector) to have it filled.
// Numbers follow the page's language (<html lang>). Every chart gets role="img" and an aria-label that states what it shows.
(() => {
  const NS = 'http://www.w3.org/2000/svg', MINUS = '\u2212', ROW = 14, LANE = (rows) => 8 + rows * ROW + (rows ? 4 : 0);
  const css = (el, name, fb) => getComputedStyle(el).getPropertyValue(name).trim() || fb;
  const cssNum = (el, name, fb) => { const v = parseFloat(css(el, name, '')); return Number.isFinite(v) ? v : fb; };
  const svg = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); if (parent) parent.appendChild(n); return n; };
  const text = (parent, str, attrs) => { const t = svg('text', attrs, parent); t.textContent = str; return t; };
  const titled = (parent, str) => { svg('title', {}, parent).textContent = str; return parent; };
  // numbers follow the page's language (<html lang>), so separators match the rest of the screen
  const nf = (o) => new Intl.NumberFormat(document.documentElement.lang || 'en', o);
  // every text value that reaches innerHTML goes through esc: a label from a database is text, never markup
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = {
    int: (v) => nf({ maximumFractionDigits: 0 }).format(v),
    dec: (d) => (v) => nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(v),
    pct: (d = 1) => (v) => nf({ style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d }).format(v),
    money: (cur = 'EUR', d = 0) => (v) => nf({ style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(v),
    compact: (v) => nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v),
    ms: (v) => `${nf({ maximumFractionDigits: 0 }).format(v)} ms`,
    // a sign on every change, with a true minus: fmt.signed() → '+2', '0', '−1'; fmt.signed(fmt.dec(1)) → '+0.4'
    signed: (f = (v) => nf({ maximumFractionDigits: 0 }).format(v)) => (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + f(Math.abs(v)),
    // minutes since midnight as a 24-hour time: 680 → '11:20'
    clock: (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`, // taste-skill-ignore: a clock, not a counter
  };
  const minutes = (t) => (t == null || t === '' ? null : typeof t === 'number' ? t : (([hh, mm]) => hh * 60 + (mm || 0))(String(t).split(':').map(Number)));
  // Round ticks (steps of 1, 2, 2.5 or 5 × 10^n) whose top sits above the largest value.
  function ticks(min, max, count = 4) {
    if (max === min) max = min + 1;
    const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
    const lo = Math.floor(min / step) * step; let hi = Math.ceil(max / step) * step; if (hi <= max) hi += step;
    const out = []; for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  // x labels keep one step all the way: every k-th label, with k chosen so the labels fit the width, and a step that
  // lands on the last label when one gives enough labels. Never a forced end label that breaks the step. Clock labels
  // ('08:30') step in whole hours (or halves and quarters) from a round time, so a half-hourly axis reads 06:00, 09:00.
  function xPicks(labels, span, at) {
    const n = labels.length;
    if (at) return at.filter((i) => i >= 0 && i < n);
    if (n <= 1) return n ? [0] : [];
    const longest = Math.max(...labels.map((l) => String(l).length));
    const cap = Math.max(2, Math.min(8, Math.floor(span / (longest * 7 + 18))));
    if (n <= cap) return [...Array(n).keys()];
    const mins = labels.every((l) => /^\d{1,2}:\d{2}$/.test(String(l))) ? labels.map(minutes) : null;
    const d = mins ? mins[1] - mins[0] : 0;
    let first = null, land = null;
    for (let k = 1; k < n; k++) {
      const stepM = k * d, clock = mins && d > 0;
      if (clock && (stepM >= 60 ? ![1, 2, 3, 4, 6, 12].includes(stepM / 60) : 60 % stepM !== 0)) continue;
      // start on a round time: a multiple of the step (09:00 for three hours), or a whole hour for shorter steps
      let s = clock ? mins.findIndex((m) => m % Math.max(60, stepM) === 0) : 0;
      if (s < 0) s = Math.max(0, mins.findIndex((m) => m % 60 === 0));
      const count = Math.floor((n - 1 - s) / k) + 1;
      if (count > cap) continue;
      if (first == null) first = { k, s };
      if ((n - 1 - s) % k === 0) { land = { k, s, count }; break; }
    }
    const pick = land && land.count >= Math.max(3, Math.ceil(cap * 0.6)) ? land : first || { k: n - 1, s: 0 };
    const out = []; for (let i = pick.s; i < n; i += pick.k) out.push(i);
    return out;
  }
  // colours: tokens resolved to rgb, so a mark can be mixed with the surface (a pale fill, a darker step)
  const swatchProbe = document.createElement('span'); swatchProbe.style.display = 'none';
  const rgb = (el, value) => {
    el.appendChild(swatchProbe); swatchProbe.style.color = ''; swatchProbe.style.color = value;
    const c = getComputedStyle(swatchProbe).color; swatchProbe.remove();
    const m = c.match(/-?[\d.]+/g); if (!m || m.length < 3) return null;
    return c.startsWith('color(') ? m.slice(0, 3).map((v) => Math.round(+v * 255)) : m.slice(0, 3).map(Number);
  };
  const mix = (el, a, b, t) => { const p = rgb(el, a), q = rgb(el, b); return p && q ? `rgb(${p.map((v, i) => Math.round(v * t + q[i] * (1 - t))).join(',')})` : a; };
  // text width, measured in the chart's own face (falls back to an estimate when the chart is hidden)
  const measure = (s, str, size = 11, weight = 400) => { const t = text(s, str, { x: -999, y: -999, 'font-size': size, 'font-weight': weight, visibility: 'hidden' }); let wd = 0; try { wd = t.getComputedTextLength(); } catch {} t.remove(); return wd > 0 ? wd : String(str).length * size * 0.56; };
  const fit = (s, str, max, size, weight) => { str = String(str); if (measure(s, str, size, weight) <= max) return str; while (str.length > 1 && measure(s, str + '\u2026', size, weight) > max) str = str.slice(0, -1); return str.trimEnd() + '\u2026'; };
  function frame(el, h) {
    el.innerHTML = '';
    const w = Math.max(240, el.clientWidth || 600);
    const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', height: h, role: 'img', style: 'display:block;overflow:visible;font-variant-numeric:tabular-nums' }, el);
    return { s, w, h };
  }
  function tooltip(el) {
    let t = el.querySelector('.chart-tip');
    if (!t) { t = document.createElement('div'); t.className = 'chart-tip'; t.style.cssText = 'position:absolute;pointer-events:none;padding:6px 8px;font:inherit;font-size:12px;line-height:1.35;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity 120ms ease;background:var(--surface,#fff);color:var(--ink,#111);border:1px solid var(--grid,#e5e7eb)'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(t); }
    return t;
  }
  function axes(g, el, { w, h, padL, padB, yt, y, labels, x, band = false, at = null, tick, avoid = null }) {
    const grid = css(el, '--grid', '#e8e8e8'), ink = css(el, '--axis-ink', '#6b6b6b'), s = g.ownerSVGElement;
    for (const v of yt) {
      const yy = y(v);
      svg('line', { x1: padL, x2: w, y1: yy, y2: yy, stroke: grid, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
      text(g, tick(v), { x: padL - 8, y: yy + 4, 'text-anchor': 'end', 'font-size': 12, fill: ink });
    }
    const n = labels.length;
    for (const i of xPicks(labels, w - padL, at)) {
      const lab = String(labels[i]), tw = measure(s, lab, 12), xx = x(i);
      // the first and last labels are pulled inside the plot; none runs past either edge
      let left = band ? xx - tw / 2 : i === 0 ? xx : i === n - 1 ? xx - tw : xx - tw / 2;
      left = Math.max(band ? 0 : padL, Math.min(w - tw, left));
      if (avoid && left < avoid[1] + 8 && left + tw > avoid[0] - 8) continue;
      text(g, lab, { x: left, y: h - padB + 18, 'font-size': 12, fill: ink });
    }
  }
  // Annotation labels sit in rows above the plot, never on the data. A label sits beside the top of its own leader
  // line, right of it or left of it, in one of three rows. A place is free when no other label in that row overlaps
  // it, no leader line passes through it, and its own leader passes through no label below it. The layout is searched
  // (close markers often need the first label on the left so the next leader runs clear): full labels first, then
  // short forms (`short`), and only then is a label dropped to its marker's tooltip, with a note in the console.
  function lane(s, items, w, maxRows = 3) {
    const gap = 6, rank = (it) => (it.fixed != null ? 0 : it.span ? 1 : 2);
    // fixed captions first, then spans, then markers from left to right
    const order = [...items].sort((a, b) => rank(a) - rank(b) || (a.x ?? a.x0) - (b.x ?? b.x0));
    const opts = order.map((it) => {
      const out = [];
      for (const str of [it.label, it.short].filter(Boolean)) {
        const tw = measure(s, str, 11) + (it.glyph ? 9 : 0), mid = it.span ? (it.x0 + it.x1) / 2 : 0;
        const cands = it.fixed != null ? [[it.fixed, it.fixed + tw]] : it.span ? [[mid - tw / 2, mid + tw / 2], [it.x0, it.x0 + tw], [it.x1 - tw, it.x1]] : [[it.x + 4, it.x + 4 + tw], [it.x - 4 - tw, it.x - 4]];
        for (let row = 0; row < maxRows; row++) for (const [x0, x1] of cands) if (x0 >= 0 && x1 <= w) out.push({ ...it, text: str, isShort: str !== it.label, row, x0, x1 });
      }
      return out;
    });
    const free = (c, placed) => placed.every((p) => p.dropped || (!(p.row === c.row && c.x0 < p.x1 + gap && c.x1 > p.x0 - gap)
      && !(p.leader != null && p.row >= c.row && p.leader > c.x0 - 3 && p.leader < c.x1 + 3)
      && !(c.leader != null && p.row <= c.row && c.leader > p.x0 - 3 && c.leader < p.x1 + 3)));
    let best = null, steps = 0;
    const solve = (i, placed, allowShort, allowDrop) => {
      if (++steps > 20000) return false;
      if (i === order.length) { best = placed.slice(); return true; }
      for (const c of opts[i]) { if ((c.isShort && !allowShort) || !free(c, placed)) continue; placed.push(c); if (solve(i + 1, placed, allowShort, allowDrop)) return true; placed.pop(); }
      if (allowDrop) { placed.push({ ...order[i], dropped: true }); if (solve(i + 1, placed, allowShort, allowDrop)) return true; placed.pop(); }
      return false;
    };
    for (const [sh, dr] of [[false, false], [true, false], [true, true]]) { steps = 0; if (solve(0, [], sh, dr)) break; }
    const placed = (best || []).filter((p) => !p.dropped), dropped = (best || order.map((it) => ({ ...it, dropped: true }))).filter((p) => p.dropped);
    return { placed, dropped, rows: placed.length ? Math.max(...placed.map((p) => p.row)) + 1 : 0 };
  }
  function prepNotes(s, annotations = [], x, w, extra = []) {
    const items = [];
    for (const a of annotations || []) {
      if (a.from != null) items.push({ span: true, x0: Math.min(x(a.from), x(a.to)), x1: Math.max(x(a.from), x(a.to)), label: a.label, short: a.short, colour: a.colour });
      else if (a.at != null) items.push({ x: x(a.at), at: a.at, leader: x(a.at), label: a.label, short: a.short, colour: a.colour });
    }
    items.push(...extra);
    return { items, ...lane(s, items.filter((it) => it.label), w) };
  }
  // shaded spans go under the data; marker lines and the label rows over it
  function notesUnder(g, el, N, { padT, h, padB }) {
    const ink = css(el, '--axis-ink', '#6b6b6b'), op = cssNum(el, '--chart-span', 0.07);
    for (const it of N.items) if (it.span) svg('rect', { x: it.x0, y: padT, width: it.x1 - it.x0, height: h - padT - padB, fill: ink, opacity: op }, g);
  }
  function notesOver(g, el, N, { padT, h, padB }) {
    const ink = css(el, '--axis-ink', '#6b6b6b');
    // a marker line runs to the plot's foot, or stops above the bar it points at (it.end)
    for (const it of N.items) if (it.leader != null && !it.drawn) svg('line', { x1: it.leader, x2: it.leader, y1: padT, y2: Math.max(padT, it.end ?? h - padB), stroke: ink, 'stroke-width': 1, opacity: 0.45, 'shape-rendering': 'crispEdges' }, g);
    for (const p of N.placed) {
      const base = padT - 9 - p.row * ROW;
      if (p.leader != null) svg('line', { x1: p.leader, x2: p.leader, y1: base - 8, y2: padT, stroke: ink, 'stroke-width': 1, opacity: 0.45, 'shape-rendering': 'crispEdges' }, g);
      if (p.glyph) svg('path', { d: p.glyph === 'up' ? `M${p.x0} ${base - 1}l3 -6l3 6z` : `M${p.x0} ${base - 7}l3 6l3 -6z`, fill: ink }, g);
      text(g, p.text, { x: p.x0 + (p.glyph ? 9 : 0), y: base, 'font-size': 11, fill: p.colour || ink });
    }
    const el2 = g.ownerSVGElement.parentNode; el2._warned = el2._warned || new Set();
    for (const d of N.dropped) {
      if (d.leader != null) { const hit = svg('line', { x1: d.leader, x2: d.leader, y1: padT, y2: h - padB, stroke: 'transparent', 'stroke-width': 8 }, g); titled(hit, d.label, {}); }
      if (!el2._warned.has(d.label)) { el2._warned.add(d.label); console.warn(`Charts: no room above the plot for "${d.label}". Give it a short form (short) or label fewer markers.`); }
    }
  }
  // does a label box touch a drawn line? polylines are [[x, y], …]; a box is { x0, x1, y0, y1 }
  function hits(b, lines) {
    for (const pts of lines) for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], c = pts[k]; if (!a || !c) continue;
      if (a[0] === c[0]) { if (a[0] >= b.x0 - 3 && a[0] <= b.x1 + 3 && Math.max(a[1], c[1]) >= b.y0 - 3 && Math.min(a[1], c[1]) <= b.y1 + 3) return true; continue; }
      const lo = Math.max(b.x0 - 3, Math.min(a[0], c[0])), hi = Math.min(b.x1 + 3, Math.max(a[0], c[0]));
      for (let xx = lo; xx <= hi; xx += 2) { const yy = a[1] + ((xx - a[0]) / (c[0] - a[0])) * (c[1] - a[1]); if (yy >= b.y0 - 3 && yy <= b.y1 + 3) return true; }
    }
    return false;
  }
  const boxHits = (b, boxes) => boxes.some((r) => b.x0 < r.x1 + 3 && b.x1 > r.x0 - 3 && b.y0 < r.y1 + 3 && b.y1 > r.y0 - 3);
  // a reference line (a budget, an SLO) with its label at an end where no series passes
  function references(g, el, refs, { y, padL, w, lines = [], boxes = [] }) {
    const ink = css(el, '--axis-ink', '#6b6b6b'), s = g.ownerSVGElement;
    for (const r of [].concat(refs || [])) {
      const yy = y(r.value);
      svg('line', { x1: padL, x2: w, y1: yy, y2: yy, stroke: ink, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0.7 }, g);
      if (!r.label) continue;
      const tw = measure(s, r.label, 11), right = r.at !== 'left';
      const cand = [[right, -5], [right, 13], [!right, -5], [!right, 13]].map(([rt, dy]) => ({ x0: rt ? w - tw : padL + 4, x1: rt ? w : padL + 4 + tw, y0: yy + dy - 9, y1: yy + dy + 2, base: yy + dy }));
      const b = cand.find((c) => !hits(c, lines) && !boxHits(c, boxes)) || cand[0];
      text(g, r.label, { x: b.x0, y: b.base, 'font-size': 11, fill: ink });
    }
  }
  // One style object per kind of mark draws both the mark and its legend swatch, so the two cannot drift apart.
  function paintRect(parent, st, x, y, w, h, r = 0) {
    let fill = st.fill || 'none';
    if (st.hatch) {
      const s = parent.ownerSVGElement || parent, id = 'h' + Math.random().toString(36).slice(2, 8);
      const p = svg('pattern', { id, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, svg('defs', {}, s));
      svg('rect', { width: 5, height: 5, fill: st.fill }, p); svg('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: st.hatch, 'stroke-width': 1.2 }, p);
      fill = `url(#${id})`;
    }
    const inset = st.stroke ? (st.width || 1) / 2 : 0;
    const n = svg('rect', { x: x + inset, y: y + inset, width: Math.max(0, w - inset * 2), height: Math.max(0, h - inset * 2), rx: r, fill, stroke: st.stroke, 'stroke-width': st.stroke ? st.width || 1 : null, 'stroke-dasharray': st.dash, opacity: st.opacity, 'shape-rendering': r ? null : 'crispEdges' }, parent);
    if (st.edge) svg('rect', { x, y, width: 3, height: h, rx: Math.min(r, 1.5), fill: st.edge }, parent);
    return n;
  }
  const legendCss = ':where(.chart-legend){list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;line-height:16px;color:var(--muted,#5f6368)}:where(.chart-legend li){display:inline-flex;align-items:center;gap:6px;white-space:nowrap}:where(.chart-legend svg){flex:none;overflow:visible}@media (max-width:480px){:where(.chart-legend){display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}';
  function legendEl(items, target) {
    if (!document.getElementById('charts-legend-css')) { const st = document.createElement('style'); st.id = 'charts-legend-css'; st.textContent = legendCss; document.head.appendChild(st); }
    const ul = document.createElement('ul'); ul.className = 'chart-legend';
    for (const it of items) {
      const li = document.createElement('li'), sw = svg('svg', { width: it.w || 14, height: 12, 'aria-hidden': 'true' });
      it.draw(sw); li.append(sw, document.createTextNode(it.label)); ul.appendChild(li);
    }
    const t = typeof target === 'string' ? document.querySelector(target) : target;
    if (t) t.replaceChildren(ul);
    return ul;
  }
  const rectSwatch = (st, w = 14, h = 10, r = 2) => (sw) => paintRect(sw, st, 0, (12 - h) / 2, w, h, r);
  // charts are laid out with measured text: draw again once the page's fonts have arrived
  function settle(draw) { if (document.fonts) { document.fonts.ready.then(draw); document.fonts.addEventListener?.('loadingdone', draw, { once: true }); } }
  const heightOf = (h) => (typeof h === 'function' ? h() : h);

  function line(el, { labels, series, format = fmt.int, tickFormat = null, height = 220, fill = false, min, max, step = false, annotations, reference, today = null, todayLabel = 'Today', endLabel = false, yTicks = null, xAt = null, legend = null }) {
    el._fmt = format;
    const colourOf = (sr, k) => sr.colour || (k === 0 ? css(el, '--chart-1', '#2f6fdf') : css(el, `--chart-${k + 1}`, css(el, '--chart-muted', '#a3a3a3')));
    const draw = () => {
      const { s, w, h } = frame(el, heightOf(height));
      const all = series.flatMap((x) => x.values.filter((v) => v != null)).concat([].concat(reference || []).map((r) => r.value));
      // max caps the range (a flat series with one spike): values above it are clipped and their peak labelled
      const top = max ?? Math.max(...all);
      const yt = yTicks || ticks(min ?? Math.min(0, ...all), top, 4);
      const tick = tickFormat || format;
      const lastVal = series[0].values.filter((v) => v != null).at(-1);
      const padL = 12 + Math.max(...yt.map((v) => measure(s, tick(v), 12))), padB = 26, padR = endLabel ? 10 + measure(s, format(lastVal), 12, 600) : 0;
      const x = (i) => padL + (i * (w - padL - padR)) / Math.max(1, labels.length - 1);
      // the peaks clipped by max are labelled in the rows above the plot, where the line leaves it
      const peaks = [];
      series.forEach((sr, k) => sr.values.forEach((v, i) => { if (v != null && v > yt.at(-1) && (i === 0 || sr.values[i - 1] == null || sr.values[i - 1] <= yt.at(-1))) { let j = i, peak = v; while (j < sr.values.length && sr.values[j] != null && sr.values[j] > yt.at(-1)) { peak = Math.max(peak, sr.values[j]); j++; } peaks.push({ x: x(i), label: format(peak) + ' at ' + labels[i], colour: colourOf(sr, k) }); } }));
      const scale = (N) => { const padT = LANE(N.rows); return { padT, y: (v) => padT + (h - padT - padB) * (1 - (v - yt[0]) / (yt.at(-1) - yt[0])) }; };
      const linesAt = (y) => series.map((sr) => { const out = []; sr.values.forEach((v, i) => { if (v == null) { out.push(null); return; } const p = [x(i), y(Math.min(v, yt.at(-1)))]; const prev = out.at(-1); if (step && prev) out.push([p[0], prev[1]]); out.push(p); }); return out; }).concat([].concat(reference || []).map((r) => [[padL, y(r.value)], [w, y(r.value)]]));
      let N = prepNotes(s, annotations, x, w, peaks), { padT, y } = scale(N), todayBox = null;
      // the today label goes inside the plot on whichever side of its line no series crosses; failing that, above
      if (today != null && todayLabel) {
        const cut = x(today), tw = measure(s, todayLabel, 11), lines = linesAt(y);
        const cand = [[cut + 4, h - padB - 6], [cut - 4 - tw, h - padB - 6], [cut + 4, padT + 11], [cut - 4 - tw, padT + 11]].map(([x0, b]) => ({ x0, x1: x0 + tw, y0: b - 9, y1: b + 2, base: b }));
        todayBox = cand.find((b) => b.x0 >= padL && b.x1 <= w && !hits(b, lines)) || null;
        if (!todayBox) { N = prepNotes(s, annotations, x, w, [...peaks, { x: cut, leader: cut, drawn: true, label: todayLabel }]); ({ padT, y } = scale(N)); }
      }
      const g = svg('g', {}, s);
      axes(g, el, { w, h, padL, padB, yt, y, labels, x, at: xAt, tick });
      notesUnder(g, el, N, { padT, h, padB });
      series.forEach((sr, k) => {
        const col = colourOf(sr, k);
        const pts = sr.values.map((v, i) => (v == null ? null : [x(i), y(Math.min(v, yt.at(-1)))]));
        // step: a balance that only changes on given days holds its value until the next one
        const d = pts.reduce((acc, p, i) => (p ? acc + (acc && pts[i - 1] ? (step ? `L${p[0].toFixed(1)} ${pts[i - 1][1].toFixed(1)}L` : 'L') : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) : acc), '');
        if (fill && k === 0) { const first = pts.find(Boolean), last = [...pts].reverse().find(Boolean); svg('path', { d: `${d}L${last[0]} ${y(yt[0])}L${first[0]} ${y(yt[0])}Z`, fill: col, opacity: 0.12 }, g); }
        if (today == null) svg('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
        else {
          // a forecast: the line after today is dashed, so a projection never reads as a fact
          const cut = x(today), id = 'c' + k + Math.random().toString(36).slice(2, 8);
          const defs = svg('defs', {}, g);
          const a = svg('clipPath', { id: id + 'a' }, defs); svg('rect', { x: 0, y: 0, width: cut, height: h }, a);
          const b = svg('clipPath', { id: id + 'b' }, defs); svg('rect', { x: cut, y: 0, width: w, height: h }, b);
          svg('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'clip-path': 'url(#' + id + 'a)' }, g);
          svg('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0.8, 'clip-path': 'url(#' + id + 'b)' }, g);
          if (k === 0) { svg('line', { x1: cut, x2: cut, y1: padT, y2: h - padB, stroke: css(el, '--axis-ink', '#6b6b6b'), 'stroke-width': 1, opacity: 0.4 }, g); if (todayBox) text(g, todayLabel, { x: todayBox.x0, y: todayBox.base, 'font-size': 11, fill: css(el, '--axis-ink', '#6b6b6b') }); }
        }
        if (endLabel && k === 0) { const li = sr.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).at(-1); text(g, format(sr.values[li]), { x: x(li) + 6, y: y(Math.min(sr.values[li], yt.at(-1))) + 4, 'font-size': 12, 'font-weight': 600, fill: css(el, '--ink', '#111') }); }
      });
      references(g, el, reference, { y, padL, w, lines: linesAt(y).slice(0, series.length) });
      notesOver(g, el, N, { padT, h, padB });
      // hover: a rule, a dot per series and a bare tooltip
      const tip = tooltip(el), rule = svg('line', { y1: padT, y2: h - padB, stroke: css(el, '--axis-ink', '#6b6b6b'), 'stroke-width': 1, opacity: 0 }, g);
      const dots = series.map((sr, k) => svg('circle', { r: 3.5, fill: css(el, '--surface', '#fff'), stroke: colourOf(sr, k), 'stroke-width': 2, opacity: 0 }, g));
      const hit = svg('rect', { x: padL, y: padT, width: w - padL, height: h - padT - padB, fill: 'transparent' }, s);
      const move = (ev) => { const r = s.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * w; const i = Math.max(0, Math.min(labels.length - 1, Math.round(((px - padL) / (w - padL - padR)) * (labels.length - 1)))); rule.setAttribute('x1', x(i)); rule.setAttribute('x2', x(i)); rule.setAttribute('opacity', 0.35); series.forEach((sr, k) => { const v = sr.values[i]; dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', v == null ? -99 : y(Math.min(v, yt.at(-1)))); dots[k].setAttribute('opacity', v == null ? 0 : 1); }); tip.innerHTML = `<div style="opacity:.7">${esc(labels[i])}</div>` + series.map((sr) => `<div><b style="font-weight:600">${sr.values[i] == null ? '–' : esc(format(sr.values[i]))}</b> ${series.length > 1 ? esc(sr.name) : ''}</div>`).join(''); const left = Math.min((x(i) / w) * r.width + 12, r.width - tip.offsetWidth - 4); tip.style.left = `${Math.max(0, left)}px`; tip.style.top = '0px'; tip.style.opacity = 1; };
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerleave', () => { tip.style.opacity = 0; rule.setAttribute('opacity', 0); dots.forEach((d) => d.setAttribute('opacity', 0)); });
      const last = series[0].values.filter((v) => v != null).at(-1);
      s.setAttribute('aria-label', `${series.map((x) => x.name).join(', ')}, ${labels[0]} to ${labels.at(-1)}; latest ${last == null ? 'no data' : format(last)}`);
    };
    draw(); watch(el, draw); settle(draw);
    const lg = series.length > 1 ? legendEl(series.map((sr, k) => ({ label: sr.name, w: 16, draw: (sw) => svg('line', { x1: 0, x2: 16, y1: 6, y2: 6, stroke: colourOf(sr, k), 'stroke-width': 2, 'stroke-dasharray': sr.dash ? '4 3' : null }, sw) })), legend) : null;
    return { legend: lg };
  }
  function bars(el, { labels, values, format = fmt.int, tickFormat = null, height = 200, highlight = null, dim = [], colour, mutedColour, annotations, reference, xAt = null }) {
    el._fmt = format;
    const lit = (i) => highlight == null || (Array.isArray(highlight) ? highlight.includes(i) : highlight === i);
    const draw = () => {
      const { s, w, h } = frame(el, heightOf(height));
      const yt = ticks(0, Math.max(...values, ...[].concat(reference || []).map((r) => r.value)), 4), tick = tickFormat || format;
      const padL = 12 + Math.max(...yt.map((v) => measure(s, tick(v), 12))), padB = 26;
      const band = (w - padL) / values.length, bw = Math.max(2, band * 0.62);
      const x = (i) => padL + band * i + band / 2;
      const N = prepNotes(s, annotations, x, w), padT = LANE(N.rows);
      const y = (v) => padT + (h - padT - padB) * (1 - v / yt.at(-1));
      const g = svg('g', {}, s);
      axes(g, el, { w, h, padL, padB, yt, y, labels, x, band: true, at: xAt, tick });
      notesUnder(g, el, N, { padT, h, padB });
      for (const it of N.items) if (it.at != null && values[it.at] != null) it.end = y(values[it.at]) - 4;
      const main = colour || css(el, '--chart-1', '#2f6fdf'), muted = mutedColour || css(el, '--chart-muted', '#c9c9c9');
      values.forEach((v, i) => { const r = svg('rect', { x: x(i) - bw / 2, y: y(v), width: bw, height: Math.max(0, y(0) - y(v)), fill: lit(i) ? main : muted, opacity: dim.includes(i) ? 0.45 : null, 'shape-rendering': 'crispEdges' }, g); titled(r, `${labels[i]}: ${format(v)}`, {}); });
      references(g, el, reference, { y, padL, w, boxes: values.map((v, i) => ({ x0: x(i) - bw / 2, x1: x(i) + bw / 2, y0: y(v), y1: y(0) })) });
      notesOver(g, el, N, { padT, h, padB });
      s.setAttribute('aria-label', `${labels.length} bars from ${labels[0]} to ${labels.at(-1)}; highest ${format(Math.max(...values))}`);
    };
    draw(); watch(el, draw); settle(draw);
  }
  // Two directions on one scale: what went out above the zero line and what came in below it (sold and bought,
  // income and spend). The axis says which is which, with signed ticks and a caption on each side of zero.
  // mark: [indices] draws those periods in a second tone with their own legend entry (the nights the car charged).
  function diverging(el, { labels, up, down, values, above = 'Above', below = 'Below', mark = [], markLabel = null, markSide = 'below', partial = null, format = fmt.int, tickFormat = null, height = 200, annotations, reference, xAt = null, legend = null }) {
    if (values) { up = values.map((v) => Math.max(0, v || 0)); down = values.map((v) => Math.max(0, -(v || 0))); }
    up = up || labels.map(() => 0); down = down || labels.map(() => 0);
    const st = { above: { fill: css(el, '--chart-1', '#2f6fdf') }, below: { fill: css(el, '--chart-muted', '#c9c9c9') }, mark: { fill: css(el, '--chart-mark', css(el, '--ink', '#111')) } };
    const marked = (i, side) => mark.includes(i) && (markSide === 'both' || markSide === side);
    const tick = (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + (tickFormat || format)(Math.abs(v));
    const draw = () => {
      const { s, w, h } = frame(el, heightOf(height));
      const hiUp = Math.max(0, ...up), hiDown = Math.max(0, ...down);
      const yt = ticks(-hiDown, hiUp || 1, 4); const stp = yt[1] - yt[0]; if (hiDown > 0 && yt[0] >= -hiDown) yt.unshift(+(yt[0] - stp).toFixed(10));
      const padL = 12 + Math.max(...yt.map((v) => measure(s, tick(v), 12))), padB = 26;
      const band = (w - padL) / labels.length, bw = Math.max(2, band * 0.62);
      const x = (i) => padL + band * i + band / 2;
      // the caption for the upper side opens the label rows above the plot; the lower one sits under the plot, at left
      const N = prepNotes(s, annotations, x, w, [{ fixed: padL, glyph: 'up', label: above }]), padT = LANE(N.rows);
      const y = (v) => padT + (h - padT - padB) * (1 - (v - yt[0]) / (yt.at(-1) - yt[0]));
      const g = svg('g', {}, s), ink = css(el, '--axis-ink', '#6b6b6b');
      const bwid = measure(s, below, 11) + 9;
      axes(g, el, { w, h, padL, padB, yt, y, labels, x, band: true, at: xAt, tick, avoid: [padL, padL + bwid] });
      svg('path', { d: `M${padL} ${h - padB + 11}l3 6l3 -6z`, fill: ink }, g); text(g, below, { x: padL + 9, y: h - padB + 18, 'font-size': 11, fill: ink });
      notesUnder(g, el, N, { padT, h, padB });
      for (const it of N.items) if (it.at != null) it.end = y(up[it.at] || 0) - 4;
      labels.forEach((lab, i) => {
        const o = partial === i ? 0.5 : null;
        if (up[i] > 0) { const r = paintRect(g, { ...(marked(i, 'above') ? st.mark : st.above), opacity: o }, x(i) - bw / 2, y(up[i]), bw, Math.max(0, y(0) - y(up[i]) - 1)); titled(r, `${lab}: ${above} ${format(up[i])}`, {}); }
        if (down[i] > 0) { const r = paintRect(g, { ...(marked(i, 'below') ? st.mark : st.below), opacity: o }, x(i) - bw / 2, y(0) + 1, bw, Math.max(0, y(-down[i]) - y(0) - 1)); titled(r, `${lab}: ${below} ${format(down[i])}`, {}); }
      });
      svg('line', { x1: padL, x2: w, y1: y(0), y2: y(0), stroke: ink, 'stroke-width': 1, opacity: 0.8, 'shape-rendering': 'crispEdges' }, g);
      references(g, el, reference, { y, padL, w, boxes: labels.map((_, i) => ({ x0: x(i) - bw / 2, x1: x(i) + bw / 2, y0: y(up[i]), y1: y(-down[i]) })) });
      notesOver(g, el, N, { padT, h, padB });
      s.setAttribute('aria-label', `${above} above the line and ${below} below it, ${labels[0]} to ${labels.at(-1)}`);
    };
    draw(); watch(el, draw); settle(draw);
    const items = [];
    if (up.some((v) => v > 0)) items.push({ label: above, draw: rectSwatch(st.above) });
    if (down.some((v) => v > 0)) items.push({ label: below, draw: rectSwatch(st.below) });
    if (mark.length && markLabel) items.push({ label: markLabel, draw: rectSwatch(st.mark) });
    return { get svg() { return el.querySelector(':scope > svg'); }, legend: legendEl(items, legend) };
  }
  function ring(el, { value, label, sub, size = 132, stroke = 8, colour }) {
    el.innerHTML = '';
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
    const wrap = document.createElement('div'); wrap.style.cssText = `position:relative;width:${size}px;height:${size}px`;
    const s = svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': `${label}${sub ? ' ' + sub : ''}` }, wrap);
    svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: css(el, '--grid', '#e8e8e8'), 'stroke-width': stroke }, s);
    svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: colour || css(el, '--chart-1', '#2f6fdf'), 'stroke-width': stroke, 'stroke-dasharray': `${c * v} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }, s);
    const t = document.createElement('div'); t.style.cssText = 'position:absolute;inset:0;display:grid;place-content:center;text-align:center;font-variant-numeric:tabular-nums';
    t.innerHTML = `<div style="font-size:${Math.round(size / 5.5)}px;font-weight:600;line-height:1">${esc(label)}</div>${sub ? `<div style="font-size:12px;opacity:.7;margin-top:4px">${esc(sub)}</div>` : ''}`;
    wrap.appendChild(t); el.appendChild(wrap);
  }
  // A ranked list. By default the row's fill is the bar (a one-figure list); thin: true puts a 2px grey bar under each
  // label instead, ink for the top item, for a ranked list of money in a narrow card.
  function barList(el, rows, { format = fmt.int, colour, thin = false } = {}) {
    el.innerHTML = '';
    const max = Math.max(...rows.map((r) => r.value)) || 1;
    const list = document.createElement('ol'); list.style.cssText = `list-style:none;margin:0;padding:0;display:grid;gap:${thin ? 10 : 2}px;font-variant-numeric:tabular-nums`;
    const valueCol = Math.max(...rows.map((r) => String(format(r.value)).length)) + 1;
    rows.forEach((r, k) => {
      const li = document.createElement('li'); li.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) ' + valueCol + 'ch;align-items:center;column-gap:12px';
      const a = document.createElement('span'); a.textContent = r.label; a.style.cssText = 'position:relative;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      const b = document.createElement('span'); b.textContent = format(r.value); b.style.cssText = 'font-weight:500;text-align:right';
      if (thin) {
        const bar = document.createElement('span'); bar.style.cssText = `grid-column:1 / -1;height:2px;margin-top:4px;width:${(r.value / max) * 100}%;background:${k === 0 ? colour || 'var(--ink,#111)' : 'var(--chart-muted,#c9c9c9)'}`;
        li.append(a, b, bar);
      } else {
        const track = document.createElement('span'); track.style.cssText = 'position:relative;padding:10px 12px;border-radius:6px;isolation:isolate;min-width:0';
        const bar = document.createElement('span'); bar.style.cssText = `position:absolute;inset:0 auto 0 0;width:${(r.value / max) * 100}%;background:${colour || 'var(--bar-fill, color-mix(in srgb, var(--chart-1, #2f6fdf) 12%, transparent))'};border-radius:inherit;z-index:-1`;
        track.append(bar, a); li.append(track, b);
      }
      list.appendChild(li);
    });
    el.appendChild(list);
  }
  // Planned against spent: the track is the plan, the fill what is spent, a lighter segment what is
  // already committed (bills to come), and an overrun past the track's end in the negative colour.
  // One row per category: label and figures on one line, the 8px track under them.
  function plan(el, rows, { format = fmt.money('EUR', 0), scale = 'row', note = (r) => r.spent > r.planned ? `${format(r.spent - r.planned)} over` : `${format(r.planned - r.spent - (r.committed || 0))} left` } = {}) {
    el.innerHTML = '';
    const list = document.createElement('ul'); list.style.cssText = 'list-style:none;margin:0;padding:0;display:grid;gap:14px;font-variant-numeric:tabular-nums';
    const max = Math.max(...rows.map((r) => Math.max(r.planned, r.spent + (r.committed || 0))));
    for (const r of rows) {
      const over = r.spent > r.planned;
      const li = document.createElement('li');
      const top = document.createElement('div'); top.style.cssText = 'display:flex;justify-content:space-between;gap:12px;margin-bottom:6px';
      top.innerHTML = `<span>${esc(r.label)}</span><span><b style="font-weight:500">${esc(format(r.spent))}</b> <span style="color:var(--muted,#5f6368)">of ${esc(format(r.planned))} · </span><span style="color:${over ? 'var(--negative,#c4242a)' : 'var(--muted,#5f6368)'}">${esc(note(r))}</span></span>`;
      // scale 'row': each track is full width and shows the share used (rows in a grid compare); 'plan': as long as its plan
      const room = over ? 100 / (1 + Math.max(0.06, (r.spent - r.planned) / r.planned)) : 100;
      const track = document.createElement('div'); track.style.cssText = 'position:relative;height:8px;border-radius:999px;background:var(--rule,#eceeef);overflow:visible;width:' + (scale === 'plan' ? (r.planned / max) * room : room) + '%';
      const pct = (v) => (v / r.planned) * 100;
      const spent = Math.min(r.spent, r.planned);
      track.innerHTML = `<span style="position:absolute;inset:0 auto 0 0;width:${pct(spent)}%;border-radius:999px;background:var(--chart-1,#2f6fdf)"></span>`
        + (r.committed ? `<span style="position:absolute;top:0;bottom:0;left:${pct(spent)}%;width:${Math.min(pct(r.committed), 100 - pct(spent))}%;background:var(--chart-1,#2f6fdf);opacity:.35"></span>` : '')
        + (over ? `<span style="position:absolute;top:-3px;bottom:-3px;left:100%;width:1px;background:var(--text,#111)"></span><span style="position:absolute;top:0;bottom:0;left:calc(100% + 2px);width:max(12px, ${pct(r.spent - r.planned)}%);border-radius:0 999px 999px 0;background:var(--negative,#c4242a)"></span>` : '');
      track.setAttribute('role', 'img'); track.setAttribute('aria-label', `${r.label}: ${format(r.spent)} of ${format(r.planned)}${r.committed ? `, ${format(r.committed)} committed` : ''}${over ? ', over plan' : ''}`);
      li.append(top, track); list.appendChild(li);
    }
    el.appendChild(list);
  }
  // Share against a target: one row per part, the current share as a bar and a 1px tick at the target,
  // so drift reads at a glance (never two stacked bars to compare).
  function bullet(el, rows, { format = fmt.pct(1), max = Math.max(...rows.map((r) => Math.max(r.value, r.target))) * 1.15 } = {}) {
    el.innerHTML = '';
    const list = document.createElement('ul'); list.style.cssText = 'list-style:none;margin:0;padding:0;display:grid;gap:12px;font-variant-numeric:tabular-nums';
    for (const r of rows) {
      const drift = r.value - r.target;
      const li = document.createElement('li'); li.style.cssText = 'display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;align-items:center;gap:12px';
      li.innerHTML = `<span>${esc(r.label)}</span><span style="position:relative;height:10px;background:var(--rule,#eceeef);border-radius:2px"><span style="position:absolute;inset:0 auto 0 0;width:${(r.value / max) * 100}%;background:var(--chart-1,#2f6fdf);border-radius:2px"></span><span style="position:absolute;top:-4px;bottom:-4px;left:${(r.target / max) * 100}%;width:2px;margin-left:-1px;background:var(--text,#111)"></span></span><span><b style="font-weight:500">${esc(format(r.value))}</b> <span style="color:${Math.abs(drift) >= (r.tolerance ?? 0.02) ? 'var(--negative,#c4242a)' : 'var(--muted,#5f6368)'}">${drift >= 0 ? '+' : '−'}${esc(format(Math.abs(drift)))} vs ${esc(format(r.target))}</span></span>`;
      li.setAttribute('aria-label', `${r.label}: ${format(r.value)}, target ${format(r.target)}`);
      list.appendChild(li);
    }
    el.appendChild(list);
  }
  // shared by the row charts (timeline, matrix, time strip): a label column with an optional grey subline.
  // A subline needs a 40-44px row pitch; one-line labels sit on 32px.
  function rowLabel(g, s, el, r, { y0, pitch, lw }) {
    const ink = css(el, '--ink', '#111'), muted = css(el, '--axis-ink', '#6b6b6b');
    if (r.sub) { text(g, fit(s, r.label, lw - 12, 14), { x: 0, y: y0 + pitch / 2 - 3, 'font-size': 14, fill: ink }); text(g, fit(s, r.sub, lw - 12, 12), { x: 0, y: y0 + pitch / 2 + 13, 'font-size': 12, fill: muted }); }
    else text(g, fit(s, r.label, lw - 12, 14), { x: 0, y: y0 + pitch / 2 + 5, 'font-size': 14, fill: ink });
  }
  const dayText = (d) => (typeof d === 'object' && d ? d.label : String(d));
  // day headers: the full label when every one fits its column, else the short form ('19'), else every k-th short
  // label with today always shown and its neighbours left out, so no two headers ever touch
  function dayHeads(g, s, el, days, { x0, cw, y, today }) {
    const ink = css(el, '--ink', '#111'), muted = css(el, '--axis-ink', '#6b6b6b');
    const full = days.map(dayText), short = days.map((d) => (typeof d === 'object' && d ? d.short || dayText(d) : dayText(d).split(' ').at(-1)));
    const wide = (labs) => Math.max(...labs.map((t) => measure(s, t, 12))) + 6;
    const labs = wide(full) <= cw ? full : short, k = Math.max(1, Math.ceil(wide(labs) / cw));
    labs.forEach((t, i) => {
      if (i !== today && (i % k || (today != null && k > 1 && Math.abs(i - today) < k))) return;
      text(g, t, { x: x0 + i * cw + cw / 2, y, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': i === today ? 600 : 400, fill: i === today ? ink : muted });
    });
  }
  // The style of each kind of booking: a pale fill, a 1px diagonal hatch, a darker grey step, an outline, or the one
  // chart hue for the screen's main data element. tone: 'negative' turns the edge and the label red (it needs a decision).
  function kindStyle(el, k = {}) {
    const ink = css(el, '--ink', '#111'), surface = css(el, '--surface', '#fff'), neg = css(el, '--negative', '#c4242a'), hue = k.colour || css(el, '--chart-1', '#2f6fdf');
    const tone = k.tone === 'negative' ? { stroke: neg, width: 1.5 } : {};
    const dash = k.dash ? { dash: '3 2' } : {};
    if (k.mark === 'hatch') return { fill: mix(el, ink, surface, 0.04), hatch: mix(el, ink, surface, 0.32), ...tone, ...dash };
    if (k.mark === 'step') return { fill: mix(el, ink, surface, 0.24), ...tone, ...dash };
    if (k.mark === 'outline') return { fill: surface, stroke: mix(el, ink, surface, 0.55), width: 1, ...tone, ...dash };
    if (k.mark === 'hue') return { fill: mix(el, hue, surface, 0.18), edge: hue, ...tone, ...dash };
    return { fill: mix(el, ink, surface, 0.12), ...tone, ...dash };
  }
  // Who is away when: people (or rooms, vans) down the left, days across, a bar per booking told apart by its kind.
  //   rows: [{ label: 'Lena Hoffmann', sub: 'Product design · Berlin', bars: [{ from: 3, to: 7, kind: 'holiday', label, note }] }]
  //         and { group: 'Brand' } rows for a team subheader
  //   kinds: { holiday: { label: 'Holiday', mark: 'fill' | 'hatch' | 'step' | 'outline' | 'hue', code: 'H', tone, dash } }
  //   days: ['Mon 19', …] or [{ label: 'Mon 19', short: '19' }]; weekends: [indices]; today: index;
  //   holidays: [{ day: index, label: 'All Saints’ Day (Lisbon)' }]; onSelect(bar, row) makes the bars buttons.
  // A label that does not fit its bar becomes the kind's code inside it, then goes after the bar's end (never into the
  // days before it), and is always in the bar's tooltip.
  function timeline(el, rows, kinds = {}, { days = [], weekends = [], today = null, holidays = [], labelWidth = null, rowHeight = null, barHeight = 22, onSelect = null, legend = null, extras = true } = {}) {
    const draw = () => {
      const pitch = rowHeight || (rows.some((r) => r.sub) ? 44 : 32), head = 30, groupH = 30;
      const height = head + rows.reduce((a, r) => a + (r.group ? groupH : pitch), 0) + 2;
      const { s, w, h } = frame(el, height);
      const lw = labelWidth || Math.round(Math.min(220, Math.max(w < 480 ? 96 : 120, w * 0.2)));
      const cw = (w - lw) / Math.max(1, days.length), col = (i) => lw + i * cw;
      const ink = css(el, '--ink', '#111'), muted = css(el, '--axis-ink', '#6b6b6b'), rule = css(el, '--rule', '#f0f0f0'), raised = css(el, '--raised', '#f4f5f6'), hue = css(el, '--chart-1', '#2f6fdf');
      const g = svg('g', {}, s);
      // weekends one tone step darker, faint day lines, the day header (today in ink)
      for (const i of weekends) svg('rect', { x: col(i), y: head, width: cw, height: h - head, fill: raised }, g);
      for (let i = 0; i <= days.length; i++) svg('line', { x1: col(i), x2: col(i), y1: head, y2: h, stroke: rule, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
      dayHeads(g, s, el, days, { x0: lw, cw, y: head - 10, today });
      for (const hd of holidays) { const c = svg('circle', { cx: col(hd.day) + cw / 2, cy: head - 3, r: 2, fill: muted }, g); titled(c, hd.label, {}); }
      if (today != null) svg('line', { x1: col(today) + cw / 2, x2: col(today) + cw / 2, y1: head, y2: h, stroke: hue, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
      let y0 = head;
      for (const r of rows) {
        if (r.group) { svg('line', { x1: 0, x2: w, y1: y0 + 0.5, y2: y0 + 0.5, stroke: rule, 'stroke-width': 1 }, g); text(g, r.group, { x: 0, y: y0 + 20, 'font-size': 12, 'font-weight': 500, fill: muted }); y0 += groupH; continue; }
        rowLabel(g, s, el, r, { y0, pitch, lw });
        const bs = (r.bars || []).filter((b) => b.to >= 0 && b.from < days.length).sort((a, b) => a.from - b.from);
        bs.forEach((b, k) => {
          const kind = kinds[b.kind] || {}, st = kindStyle(el, kind);
          const x0 = col(Math.max(0, b.from)) + 2, x1 = col(Math.min(days.length - 1, b.to) + 1) - 2, by = y0 + (pitch - barHeight) / 2;
          const grp = svg('g', onSelect ? { tabindex: 0, role: 'button', style: 'cursor:pointer' } : {}, g);
          paintRect(grp, st, x0, by, x1 - x0, barHeight, 4);
          const label = b.label ?? kind.label ?? '', code = b.code ?? kind.code, tw = measure(s, label, 12), labInk = kind.tone === 'negative' ? css(el, '--negative', '#c4242a') : ink;
          const next = bs[k + 1] ? col(Math.max(0, bs[k + 1].from)) : w;
          // over a hatch the label keeps a halo of the bar's own fill, so the lines never run through the words
          const halo = st.hatch ? { stroke: st.fill, 'stroke-width': 4, 'stroke-linejoin': 'round', 'paint-order': 'stroke' } : {};
          if (label && tw + 16 <= x1 - x0) text(grp, label, { x: x0 + 8 + (st.edge ? 2 : 0), y: by + barHeight / 2 + 4, 'font-size': 12, fill: labInk, ...halo });
          else if (code && measure(s, code, 12) + 8 <= x1 - x0) text(grp, code, { x: (x0 + x1) / 2, y: by + barHeight / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, fill: labInk, ...halo });
          else if (label && x1 + 6 + tw <= Math.min(next - 6, w)) text(grp, label, { x: x1 + 6, y: by + barHeight / 2 + 4, 'font-size': 12, fill: kind.tone === 'negative' ? labInk : muted });
          titled(grp, `${r.label}: ${label}${b.note ? ' \u00b7 ' + b.note : ''}`, {});
          if (onSelect) { grp.addEventListener('click', () => onSelect(b, r)); grp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(b, r); } }); }
        });
        y0 += pitch;
      }
      s.setAttribute('aria-label', `${rows.filter((r) => !r.group).length} rows across ${days.length} days, ${dayText(days[0])} to ${dayText(days.at(-1))}`);
    };
    draw(); watch(el, draw); settle(draw);
    const used = new Set(rows.flatMap((r) => (r.bars || []).map((b) => b.kind)));
    const items = Object.entries(kinds).filter(([id]) => used.has(id)).map(([, k]) => ({ label: k.label, w: 22, draw: (sw) => { const st = kindStyle(el, k); paintRect(sw, st, 0, 0, 22, 12, 3); } }));
    if (extras && today != null) items.push({ label: 'Today', w: 8, draw: (sw) => svg('line', { x1: 4, x2: 4, y1: 0, y2: 12, stroke: css(el, '--chart-1', '#2f6fdf'), 'stroke-width': 1.5 }, sw) });
    return { get svg() { return el.querySelector(':scope > svg'); }, legend: legendEl(items, legend) };
  }
  // Is there enough cover? A team-by-day grid of slack against the minimum (+2, +1, 0, −1). Cells with room to spare
  // stay plain, and one hue ramps toward the negative colour as the slack runs out; the headcount is in the tooltip.
  //   rows: [{ label: 'Product design', sub: 'needs 7 of 10', values: [2, 1, 0, -1, null, …], titles: ['8 in', …] }]
  //   cols: ['Mon 19', …]; comfort: the slack that needs no attention (2); null is a day with no cover to count (a dash)
  function matrix(el, rows, { cols = [], comfort = 2, today = null, format = fmt.signed(), labelWidth = null, rowHeight = null, levels = ['Room to spare', 'Tight', 'At the minimum', 'Short'], legend = null } = {}) {
    const level = (v) => (v >= comfort ? 0 : v > 0 ? 1 : v === 0 ? 2 : 3);
    const styles = () => { const neg = css(el, '--negative', '#c4242a'), surface = css(el, '--surface', '#fff'), ink = css(el, '--ink', '#111'); return [{ fill: surface, ink: css(el, '--axis-ink', '#6b6b6b'), stroke: css(el, '--grid', '#e5e5e5') }, { fill: mix(el, neg, surface, 0.1), ink }, { fill: mix(el, neg, surface, 0.26), ink }, { fill: neg, ink: surface }]; };
    const draw = () => {
      const pitch = rowHeight || (rows.some((r) => r.sub) ? 44 : 32), head = 26;
      const { s, w, h } = frame(el, head + rows.length * pitch);
      const lw = labelWidth || Math.round(Math.min(220, Math.max(w < 480 ? 96 : 120, w * 0.22)));
      const cw = (w - lw) / Math.max(1, cols.length), ST = styles(), muted = css(el, '--axis-ink', '#6b6b6b'), ink = css(el, '--ink', '#111');
      const g = svg('g', {}, s);
      dayHeads(g, s, el, cols, { x0: lw, cw, y: head - 10, today });
      rows.forEach((r, k) => {
        const y0 = head + k * pitch; rowLabel(g, s, el, r, { y0, pitch, lw });
        const ch = Math.min(pitch - 6, 28), cy = y0 + (pitch - ch) / 2;
        r.values.forEach((v, i) => {
          const cx = lw + i * cw + 1;
          if (v == null) { svg('rect', { x: cx + cw / 2 - 4, y: cy + ch / 2 - 1, width: 6, height: 2, fill: muted }, g); return; }
          const st = ST[level(v)], cell = paintRect(g, { fill: st.fill }, cx, cy, cw - 2, ch, 3);
          text(g, format(v), { x: cx + (cw - 2) / 2, y: cy + ch / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': level(v) === 3 ? 600 : 400, fill: st.ink });
          titled(cell, `${r.label}, ${dayText(cols[i])}: ${r.titles?.[i] || format(v) + ' against the minimum'}`, {});
        });
      });
      s.setAttribute('aria-label', `Cover against the minimum for ${rows.length} rows across ${cols.length} days`);
    };
    draw(); watch(el, draw); settle(draw);
    const seen = new Set(rows.flatMap((r) => r.values.filter((v) => v != null).map(level)));
    const ST = styles();
    const items = [0, 1, 2, 3].filter((l) => seen.has(l)).map((l) => ({ label: levels[l], w: 14, draw: rectSwatch(l === 0 ? { fill: ST[0].fill, stroke: ST[0].stroke } : { fill: ST[l].fill }, 14, 12, 3) }));
    return { get svg() { return el.querySelector(':scope > svg'); }, legend: legendEl(items, legend) };
  }
  // When, within the day: one row per item on a shared open–close axis. A 2px grey track, an ink dot at today's time and
  // a hollow tick at the comparison day's, so "earlier than last Sunday" is drawn and not only written.
  //   rows: [{ label: 'White sourdough', sub: 'Headingley', at: '11:20', compare: '12:05', value: '11:20', note: '3 h 40 m before close' }]
  //   at or compare may be null (it did not sell out); step: minutes between axis labels (60).
  function timeStrip(el, rows, { open = '08:00', close = '18:00', step = 60, todayLabel = 'Today', compareLabel = null, labelWidth = null, valueWidth = null, rowHeight = null, legend = null } = {}) {
    const o = minutes(open), c = minutes(close);
    const st = { today: { r: 4.5 }, compare: { w: 5, h: 12 } };
    const dot = (parent, cx, cy) => svg('circle', { cx, cy, r: st.today.r, fill: css(el, '--ink', '#111') }, parent);
    const tick = (parent, cx, cy) => svg('rect', { x: cx - st.compare.w / 2, y: cy - st.compare.h / 2, width: st.compare.w, height: st.compare.h, rx: 2.5, fill: css(el, '--surface', '#fff'), stroke: css(el, '--axis-ink', '#6b6b6b'), 'stroke-width': 1.5 }, parent);
    const draw = () => {
      const narrow = (el.clientWidth || 600) < 560, axisH = 24;
      const pitch = rowHeight || (narrow ? 62 : rows.some((r) => r.sub || r.note) ? 44 : 32);
      const { s, w, h } = frame(el, rows.length * pitch + axisH);
      const lw = narrow ? 0 : labelWidth || Math.round(Math.min(200, Math.max(110, w * 0.26)));
      const vw = narrow ? 0 : valueWidth ?? Math.min(w * 0.32, Math.max(0, ...rows.map((r) => Math.max(r.value ? measure(s, r.value, 13, 500) : 0, r.note ? measure(s, r.note, 12) : 0))) + (rows.some((r) => r.value || r.note) ? 16 : 0));
      const x0 = narrow ? 18 : lw + 6, x1 = narrow ? w - 18 : w - vw - 6, tx = (m) => x0 + ((m - o) / Math.max(1, c - o)) * (x1 - x0);
      const ink = css(el, '--ink', '#111'), muted = css(el, '--axis-ink', '#6b6b6b'), rule = css(el, '--rule', '#f0f0f0');
      const track = css(el, '--chart-track', mix(el, ink, css(el, '--surface', '#fff'), 0.16));
      const g = svg('g', {}, s), plotH = rows.length * pitch;
      // the axis: one step from the opening, the labels thinned by the same rule as the charts
      const marks = []; for (let m = Math.ceil(o / step) * step; m <= c; m += step) marks.push(m);
      const picks = xPicks(marks.map(fmt.clock), x1 - x0);
      for (const i of picks) { const xx = tx(marks[i]); if (!narrow) svg('line', { x1: xx, x2: xx, y1: 0, y2: plotH, stroke: rule, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g); const lab = fmt.clock(marks[i]), tw = measure(s, lab, 12); text(g, lab, { x: Math.max(x0 - 2, Math.min(x1 + 6 - tw, xx - tw / 2)), y: plotH + 17, 'font-size': 12, fill: muted }); }
      rows.forEach((r, k) => {
        const y0 = k * pitch, cy = narrow ? y0 + pitch - 12 : y0 + pitch / 2;
        if (narrow) {
          const vwid = r.value ? measure(s, r.value, 13, 500) + 12 : 0;
          text(g, fit(s, r.label, w - vwid, 14), { x: 0, y: y0 + 16, 'font-size': 14, fill: ink });
          if (r.value) text(g, r.value, { x: w, y: y0 + 16, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 500, fill: ink });
          const second = [r.sub, r.note].filter(Boolean).join(' \u00b7 ');
          if (second) text(g, fit(s, second, w, 12), { x: 0, y: y0 + 33, 'font-size': 12, fill: muted });
        } else rowLabel(g, s, el, r, { y0, pitch, lw });
        svg('line', { x1: x0, x2: x1, y1: cy, y2: cy, stroke: track, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
        const cm = minutes(r.compare), am = minutes(r.at);
        if (cm != null) titled(tick(g, tx(cm), cy), `${compareLabel || 'Comparison'}: ${fmt.clock(cm)}`, {});
        if (am != null) titled(dot(g, tx(am), cy), `${todayLabel}: ${fmt.clock(am)}`, {});
        if (narrow) return;
        if (r.note) { if (r.value) text(g, r.value, { x: w, y: cy - 3, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 500, fill: ink }); text(g, fit(s, r.note, vw - 8, 12), { x: w, y: r.value ? cy + 13 : cy + 4, 'text-anchor': 'end', 'font-size': 12, fill: muted }); }
        else if (r.value) text(g, r.value, { x: w, y: cy + 5, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 500, fill: ink });
      });
      s.setAttribute('aria-label', `${rows.length} rows between ${fmt.clock(o)} and ${fmt.clock(c)}`);
    };
    draw(); watch(el, draw); settle(draw);
    const items = [];
    if (rows.some((r) => minutes(r.at) != null)) items.push({ label: todayLabel, w: 10, draw: (sw) => dot(sw, 5, 6) });
    if (compareLabel && rows.some((r) => minutes(r.compare) != null)) items.push({ label: compareLabel, w: 8, draw: (sw) => tick(sw, 4, 6) });
    return { get svg() { return el.querySelector(':scope > svg'); }, legend: legendEl(items, legend) };
  }
  function watch(el, draw) { if (!('ResizeObserver' in window)) return; let w = el.clientWidth; new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 4) { w = el.clientWidth; draw(); } }).observe(el); }
  window.Charts = { line, bars, diverging, ring, barList, plan, bullet, timeline, matrix, timeStrip, ticks, fmt };
})();
