// tasteskill / draw --app — deal a style for an app screen (dashboard, admin, settings, inbox).
//
//   node draw.mjs --app --kind <kind> --brief "one line" [--screens overview,list,detail,settings]
//                 [--theme light|dark] [--keep palette,type] [--options 3] [--style <id>] [--seed N]
//   node draw.mjs --show                      reprint the saved sheet
//   node draw.mjs --redraw style|shell|screen:<name>
//   node draw.mjs --app --list kinds|styles|screens
//
// Same idea as the page draw: the script deals, you choose among what it dealt, so two products do not
// end up in the same default look. The library (library/app.json) was distilled from a study of real
// product screens; it holds styles (tokens and the one move that makes each recognisable), shells and
// screen patterns.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = JSON.parse(readFileSync(join(HERE, '..', '..', 'library', 'app.json'), 'utf8'));
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); if (i === -1) return def; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const outDir = resolve(String(opt('out', '.taste-skill')));
const sheetPath = join(outDir, 'direction.json');

const KINDS = Object.keys(LIB.kinds);
// signature patterns are elements of one kind of product (a power flow, a sell-out strip), not whole screens
const SCREENS = [...new Set(LIB.patterns.filter((p) => p.screen).map((p) => p.screen))];
const SIGNATURES = LIB.patterns.filter((p) => p.signature);
const signaturesFor = (brief = '') => { const b = brief.toLowerCase(); return SIGNATURES.filter((p) => (p.cues || []).some((c) => new RegExp('(^|[^a-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(b))); };

if (opt('list')) {
  const what = opt('list');
  if (what === 'kinds') for (const [k, v] of Object.entries(LIB.kinds)) console.log(`${k.padEnd(14)} ${v.note}`);
  else if (what === 'screens') for (const s of SCREENS) console.log(`${s.padEnd(12)} ${LIB.patterns.filter((p) => p.screen === s).map((p) => p.id).join(', ')}`);
  else if (what === 'signatures') for (const p of SIGNATURES) console.log(`${p.id.padEnd(16)} ${p.name} — ${(p.cues || []).slice(0, 5).join(', ')}`);
  else for (const s of LIB.styles) console.log(`${s.id.padEnd(22)} ${s.name} — ${s.theme}, ${s.suits.join(', ')}`);
  process.exit(0);
}

let seed = opt('seed') !== undefined && opt('seed') !== true ? Number(opt('seed')) : randomInt(1, 2 ** 31 - 1);
const startSeed = seed;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const userHist = process.env.TASTE_SKILL_HISTORY || join(homedir(), '.taste-skill', 'history.json');
const readHist = () => { try { return JSON.parse(readFileSync(userHist, 'utf8')); } catch { return []; } };
const writeHist = (e) => { try { mkdirSync(dirname(userHist), { recursive: true }); const h = readHist(); h.unshift(e); writeFileSync(userHist, JSON.stringify(h.slice(0, 24), null, 1)); } catch {} };
const recentStyles = readHist().filter((h) => h.kind === 'app').slice(0, 3).map((h) => h.style);

const saved = existsSync(sheetPath) ? JSON.parse(readFileSync(sheetPath, 'utf8')) : null;
if (opt('show')) { if (!saved || saved.kind !== 'app') { console.error('No saved app sheet. Run draw.mjs --app first.'); process.exit(2); } console.log(render(saved)); process.exit(0); }

function stylePool(input) {
  const pref = LIB.kinds[input.kind]?.styles || [];
  let pool = LIB.styles.filter((s) => !(input.avoid || []).includes(s.id));
  if (input.theme) { const t = pool.filter((s) => s.theme === input.theme); if (t.length) pool = t; }
  const fit = pool.filter((s) => pref.includes(s.id) || s.suits.includes(input.kind));
  if (fit.length >= 2) pool = fit;
  return pool;
}
function dealStyle(input, exclude = []) {
  let pool = stylePool(input).filter((s) => !exclude.includes(s.id));
  if (!pool.length) pool = LIB.styles.filter((s) => !exclude.includes(s.id));
  const fresh = pool.filter((s) => !recentStyles.includes(s.id));
  return pick(fresh.length ? fresh : pool.length ? pool : LIB.styles);
}
// The style's own shell usually carries part of its move, so it is dealt about two times in three.
function dealShell(style, input, exclude = []) {
  const own = LIB.shells.find((s) => s.id === style.shell && !exclude.includes(s.id));
  const alts = LIB.shells.filter((s) => (style.shellAlternatives || []).includes(s.id) && !exclude.includes(s.id));
  if (own && (!alts.length || rnd() < 0.66)) return own;
  if (alts.length) return pick(alts);
  const rest = LIB.shells.filter((s) => !exclude.includes(s.id));
  return pick(rest.length ? rest : LIB.shells);
}
function dealScreen(name, style, input, exclude = []) {
  let pool = LIB.patterns.filter((p) => p.screen === name && !exclude.includes(p.id));
  // a pattern written for another kind of product brings that product's furniture with it (a getting-started strip on a
  // leave planner): when none fits this kind, the sheet says to compose the screen from the chapter instead
  pool = pool.filter((p) => !p.kinds || p.kinds.includes(input.kind));
  return pool.length ? pick(pool) : null;
}
function deal(input) {
  const style = input.style ? LIB.styles.find((s) => s.id === input.style) : dealStyle(input);
  if (!style) { console.error(`No app style ${input.style}. List them with --app --list styles.`); process.exit(2); }
  const s = { version: 1, kind: 'app', at: new Date().toISOString(), seed: startSeed, input, style, shell: dealShell(style, input), screens: [] };
  for (const name of input.screens) s.screens.push({ name, pattern: dealScreen(name, style, input) });
  return s;
}

let sheet;
if (opt('redraw') && saved?.kind === 'app') {
  sheet = saved; sheet.redraws = (sheet.redraws || 0) + 1;
  const what = String(opt('redraw'));
  if (what === 'style') { sheet.style = dealStyle(sheet.input, [sheet.style.id]); }
  else if (what === 'shell') sheet.shell = dealShell(sheet.style, sheet.input, [sheet.shell.id]);
  else if (what.startsWith('screen:')) { const n = what.slice(7); const i = sheet.screens.findIndex((x) => x.name === n); if (i === -1) { console.error('No screen ' + n + ' on this sheet.'); process.exit(2); } sheet.screens[i].pattern = dealScreen(n, sheet.style, sheet.input, [sheet.screens[i].pattern?.id]) || sheet.screens[i].pattern; }
  else { console.error('Redraw style, shell or screen:<name>.'); process.exit(2); }
} else {
  const kind = String(opt('kind', ''));
  if (!KINDS.includes(kind)) { console.error(`--kind is required with --app. One of:\n  ${KINDS.join(', ')}`); process.exit(2); }
  const screens = list(opt('screens')).length ? list(opt('screens')) : (LIB.kinds[kind].screens || ['overview']);
  const bad = screens.filter((x) => !SCREENS.includes(x));
  if (bad.length) { console.error(`Unknown screen(s): ${bad.join(', ')}. One of: ${SCREENS.join(', ')}`); process.exit(2); }
  const input = { kind, brief: typeof opt('brief') === 'string' ? opt('brief') : '', theme: ['light', 'dark'].includes(opt('theme')) ? opt('theme') : null, screens, keep: list(opt('keep')), style: typeof opt('style') === 'string' ? opt('style') : null };
  if (opt('options')) {
    const n = Math.max(2, Math.min(5, Number(opt('options')) || 3)); const pool = stylePool(input); const out = [];
    let rest = pool.filter((s) => !recentStyles.includes(s.id)); if (rest.length < n) rest = pool;
    while (out.length < n && rest.length) { const s = pick(rest); out.push(s); rest = rest.filter((x) => x !== s); }
    console.log(`# ${out.length} app styles dealt for this brief\n`);
    console.log('Choose the one that suits how this product is used (long sessions or a quick look, money or media, a team or one person), not the most familiar. Then deal it with the same command plus `--style <id>` (and without --options).\n');
    for (const s of out) console.log(`## \`${s.id}\` — ${s.name} (${s.theme})\n${s.idea}\nThe move: ${s.signature}\n`);
    process.exit(0);
  }
  sheet = deal(input);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(sheetPath, JSON.stringify(sheet, null, 1));
if (!opt('redraw')) writeHist({ at: sheet.at, kind: 'app', style: sheet.style.id, shell: sheet.shell.id });
console.log(render(sheet));
process.exit(0);

function kebab(k) { return k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()); }
// A Google Fonts link for the style's faces (all of them are free there).
function fontLink(f) {
  const fam = (name, w) => 'family=' + name.trim().replace(/ /g, '+') + ':wght@' + w.join(';');
  const fams = [fam(f.family, f.weights || [400, 500, 600])];
  const second = f.second && f.second.split(',')[0].trim();
  if (second && !/^(system|inter\b)/i.test(second)) fams.push(fam(second, [400, 500]));
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?${fams.join('&')}&display=swap" rel="stylesheet">`;
}
function render(s) {
  const st = s.style, t = st.tokens, o = []; const p = (x = '') => o.push(x);
  p(`# APP SHEET — ${st.name}`);
  p(`seed ${s.seed} · drawn ${s.at.slice(0, 10)}${s.redraws ? ` · redraws: ${s.redraws}` : ''} · kind ${s.input.kind} · ${st.theme}`);
  if (s.input.brief) p(`Brief: ${s.input.brief}`);
  p();
  p('This is the style for this product. Adopt it whole and keep its move intact; everything the sheet does not fix comes from the');
  p('shared defaults in references/app-screens.md. Redraw only for a reason you can state (it contradicts the brand, or the product is');
  p('used in a way the style does not suit) and say why in your report. The values were measured on real product screens: use them');
  p('as given rather than rounding them towards your habits.');
  p();
  p('## 1. The style'); p(st.idea); p(); p(`**The move:** ${st.signature}`); p();
  if (st.colourBudget) p(`**Colour budget:** ${st.colourBudget}.`);
  if (st.avoid?.length) p('**Off-style here:** ' + st.avoid.join('; ') + '.');
  if (st.basis) p(`Distilled from ${st.basis}.${st.notes ? ' ' + st.notes : ''}`);
  p();
  // the style makes a screen correct; its face makes it this product's (references/app-screens.md, §2.3)
  if (st.identity?.length) {
    p('**Its face.** Choose one of these (or one of your own of the same weight) before you build, write it in your notes next to');
    p('the screen\'s question, and check that it shows on the first screen. Without one the screen reads as a well-applied kit.');
    for (const x of st.identity) p('- ' + x);
    p();
  }
  const sigs = signaturesFor(s.input.brief);
  if (sigs.length) {
    p('**Signature elements this brief names** (an element only this kind of product has; build one of them as part of a screen):');
    for (const g of sigs) p(`- **${g.name}** (\`${g.id}\`). ${g.blueprint}${g.phone ? ' On a phone: ' + g.phone : ''}`);
    p();
  }
  const f = t.font || {};
  if (!s.input.keep.includes('palette')) {
    p('## 2. Tokens'); p('```css'); p(':root {');
    for (const [k, v] of Object.entries(t)) {
      if (k === 'font' || k === 'density') continue;
      if (typeof v === 'string') p(`  --${kebab(k)}: ${v};`);
      else if (typeof v === 'number') p(`  --${kebab(k)}: ${v}px;`);
      else if (k === 'chart') v.forEach((c, i) => p(`  --chart-${i + 1}: ${c};`));
      else if (k === 'pills') for (const [n, [bg, ink]] of Object.entries(v)) p(`  --pill-${n}-bg: ${bg}; --pill-${n}-ink: ${ink};`);
      else if (k === 'radius') for (const [n, r] of Object.entries(v)) p(`  --radius-${n}: ${r}px;`);
    }
    if (f.sizes) for (const [n, v] of Object.entries(f.sizes)) p(`  --fs-${n}: ${v}px;`);
    p('}'); p('```');
    p(`Density: ${t.density}. One gap value, horizontally and vertically. ${t.shadow ? 'The shadow belongs to this dark style\'s cards only; nothing else casts one.' : 'No shadow on anything at rest.'}`);
    p();
  } else { p('## 2. Tokens'); p('Kept from the brand: map its colours onto this style\'s roles (ground, surface, raised, border, rule, control, text, muted, accent, status pills, chart) and keep its proportions: ' + (st.colourBudget || 'colour on data and status only') + '. Take the sizes, radii, row and control heights from the style as they are.'); p(); }
  if (!s.input.keep.includes('type') && f.family) {
    p(`## 3. Type — ${f.family}`);
    p('```html'); p(fontLink(f)); p('```');
    p(`\`font-family: "${f.family}", ${f.fallback || 'system-ui, sans-serif'}\`. Weights ${(f.weights || []).join(', ')}. Sizes: ${Object.entries(f.sizes || {}).map(([k, v]) => `${k} ${v}px`).join(' · ')}.${f.note ? ' ' + f.note : ''}${f.second ? ' Second face: ' + f.second + '.' : ''}`);
    p('Numbers: `font-variant-numeric: tabular-nums` on every table, KPI and anything that updates. Sentence case; no tracked capitals.'); p();
  }
  p(`## 4. Shell — ${s.shell.name}`); p(s.shell.blueprint);
  if (s.shell.numbers) p('Numbers: ' + Object.entries(s.shell.numbers).map(([k, v]) => `${k} ${v}`).join('; ') + '.');
  if (s.shell.phone) p(`On a phone: ${s.shell.phone}`); p();
  p('## 5. Screens');
  for (const sc of s.screens) {
    p();
    if (!sc.pattern) { p(`### ${sc.name}`); p('No pattern in the library for this screen. Compose it from the rules in references/app-screens.md.'); continue; }
    p(`### ${sc.name} — ${sc.pattern.name}`); p(sc.pattern.blueprint); if (sc.pattern.phone) p(`On a phone: ${sc.pattern.phone}`);
  }
  p();
  p('## 6. Always');
  p('Real data for this product, written before the markup: names, amounts that add up, dates in order, units on every figure,');
  p('honest zeros and dashes. One chart answers one question. No gradients, glows, glass, icons in tinted squares, sparklines on KPIs,');
  p('rainbow charts, emoji, lorem or Acme. `<skill>/assets/app.css` and `<skill>/assets/charts.js` are a neutral start set to these');
  p('rules. Check with `node <skill>/scripts/lint.mjs <files>` and `node <skill>/scripts/inspect.mjs <page>`: this sheet switches both');
  p('to app rules.');
  p();
  p(`Saved to ${sheetPath.split('\\').join('/')} · reprint with \`node draw.mjs --show\``);
  return o.join('\n');
}
