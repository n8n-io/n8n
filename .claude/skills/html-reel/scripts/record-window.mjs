#!/usr/bin/env node
// Record a live page with DreamCut while playwright drives it in a visible
// Chrome window: for what can't be rendered frame by frame (someone else's
// site, a real drag, video playing). The window's inner size is set to
// --size exactly, the page is loaded, the choreography's setup runs, then
// DreamCut records that one window while a 160 ms full-viewport magenta
// flash marks the start and the choreography runs on a clock from it.
// flash-crop.mjs then cuts the take from the flash and crops it to the page.
//
// Usage:
//   record-window.mjs --url URL|page.html --dur S [--size 540x960] [--choreo choreo.mjs]
//                     [--out raw.mov] [--frame-rate 60] [--lead 0.6] [--chrome PATH] [--foreground]
//
// choreo.mjs exports `async setup(page)` (before recording: scroll, pick a
// tab) and `async run(page, at)`, where `await at(T)` waits until T seconds
// after the flash and at.now() says how far in it is, so moves land on the
// voice's beats (choreo-example.mjs).
// page.mouse moves draw a cursor on the page; the real pointer never moves.
// The window is found by a unique document.title in
// `dreamcut list_recording_targets` right after it is set (some sites reset
// their title later) and recorded with `dreamcut record --selectedWindowID`.
// On macOS, Chrome is started with `open -g` and driven over CDP, with a
// mock keychain, so it doesn't come to the front or ask for a password; for
// a guarantee, pass --chrome a copy of Chrome for Testing whose Info.plist
// has LSBackgroundOnly true (re-signed with codesign --force --deep -s -),
// which macOS never makes frontmost. --foreground launches it through
// playwright instead (any OS). DreamCut can take seconds to start, so the
// flash waits until `dreamcut status` says it's recording, then --lead s
// more; the take is that, the flash, --dur s and 2 s to spare. Runs
// `dreamcut status` first and stops if DreamCut is recording or busy. Chrome from --chrome, CHROME_PATH, or
// playwright's own; needs playwright (or playwright-core) and the dreamcut CLI.
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o } = parseArgs({
  options: {
    url: { type: 'string' }, dur: { type: 'string' }, size: { type: 'string', default: '540x960' }, choreo: { type: 'string' },
    out: { type: 'string', default: 'raw.mov' }, 'frame-rate': { type: 'string', default: '60' }, lead: { type: 'string', default: '0.6' },
    chrome: { type: 'string' }, foreground: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || !o.url || !o.dur) { console.log(USAGE); process.exit(o.help ? 0 : 1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// `dreamcut status` can run to megabytes (it lists the open project's timeline).
const dc = (...a) => JSON.parse(execFileSync('dreamcut', a, { encoding: 'utf8', maxBuffer: 1 << 28 }));
async function chromium() {
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(n); return m.chromium || m.default.chromium; } catch {}
  const req = createRequire(path.join(process.cwd(), 'x.js'));
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(pathToFileURL(req.resolve(n)).href); return m.chromium || m.default.chromium; } catch {}
  throw new Error('playwright not found: npm i playwright-core here or beside this script');
}
const CURSOR = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L7.5 18.8 L11.3 27.5 L15 25.9 L11.3 17.4 L18.5 17.4 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const st = dc('status');
if (st.isBusy || st.capture?.isRecording || st.capture?.isCapturing) { console.error('DreamCut is busy or recording:', JSON.stringify(st.busyReasons || [])); process.exit(1); }
const [W, H] = o.size.toLowerCase().split('x').map(Number), dur = +o.dur, lead = +o.lead;
const url = /^[a-z]+:\/\//i.test(o.url) ? o.url : pathToFileURL(path.resolve(o.url)).href;
const choreo = o.choreo ? await import(pathToFileURL(path.resolve(o.choreo)).href) : {};
const out = path.resolve(o.out);
const flags = [`--window-size=${W + 60},${H + 220}`, '--window-position=80,60', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files',
  // What playwright's own launch adds: above all no keychain (a re-signed or copied Chrome asking for its
  // "Safe Storage" item brings up macOS's password prompt, which takes the front), and sRGB like headless renders.
  '--use-mock-keychain', '--password-store=basic', '--force-color-profile=srgb', '--disable-background-networking', '--disable-component-update',
  '--disable-default-apps', '--disable-extensions', '--disable-sync', '--no-service-autorun', '--disable-breakpad', '--metrics-recording-only'];

const pw = await chromium();
const exe = o.chrome || process.env.CHROME_PATH || pw.executablePath();
let browser, profile = null;
if (process.platform === 'darwin' && !o.foreground) {
  // Started by LaunchServices in the background (-g) as a new instance (-n): it never takes focus.
  const app = exe.replace(/\/Contents\/MacOS\/[^/]+$/, '');
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'record-window-'));
  execFileSync('open', ['-g', '-n', '-a', app, '--args', `--user-data-dir=${profile}`, '--remote-debugging-port=0', ...flags, 'about:blank']);
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(200);
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  browser = await pw.connectOverCDP(`http://127.0.0.1:${port}`);
} else {
  browser = await pw.launch({ executablePath: exe, headless: false, args: flags });
}
const quit = async () => {
  if (profile) {
    await (await browser.newBrowserCDPSession()).send('Browser.close').catch(() => {});
    await sleep(500);
    fs.rmSync(profile, { recursive: true, force: true });
  } else await browser.close();
};

try {
  const ctx = browser.contexts()[0] || (await browser.newContext({ viewport: null }));
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  const cdp = await ctx.newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  for (let i = 0; i < 6; i++) {
    const [iw, ih, ow, oh] = await page.evaluate(() => [innerWidth, innerHeight, outerWidth, outerHeight]);
    if (iw === W && ih === H) break;
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: W + (ow - iw), height: H + (oh - ih) } });
    await sleep(400);
  }
  await sleep(1500);
  await page.addStyleTag({ content: `::-webkit-scrollbar{display:none}html{scroll-behavior:auto!important}#rec-flash{position:fixed;inset:0;background:#ff00ff;z-index:2147483647;display:none}#rec-cursor{position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;transform:translate(-200px,-200px)}` });
  await page.evaluate((svg) => {
    const f = document.createElement('div'); f.id = 'rec-flash'; document.body.append(f);
    const c = document.createElement('div'); c.id = 'rec-cursor'; c.innerHTML = svg; document.body.append(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`; }, true);
  }, CURSOR);
  if (choreo.setup) await choreo.setup(page);
  const inner = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  console.log('inner', JSON.stringify(inner));
  if (inner[0] !== W || inner[1] !== H) throw new Error(`the window's inside is ${inner[0]}×${inner[1]}, not ${W}×${H} (is the screen big enough?)`);
  if (o.foreground) await page.bringToFront();

  // Find the window by a title nobody else has, right after setting it.
  const token = 'REC-' + Math.random().toString(36).slice(2, 10);
  let win = null;
  for (let i = 0; i < 20 && !win; i++) {
    await page.evaluate((t) => { document.title = t; }, token);
    await sleep(250);
    win = (dc('list_recording_targets').windows || []).find((w) => (w.title || '').includes(token));
  }
  if (!win) throw new Error('DreamCut lists no window titled ' + token);
  console.log('window', win.windowID, JSON.stringify(win.frame));

  const seconds = lead + 0.16 + dur + 2;
  const rec = spawn('dreamcut', ['record', '--selectedWindowID', String(win.windowID), '--seconds', seconds.toFixed(2), '--outputPath', out, '--frameRate', o['frame-rate']], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  rec.stdout.on('data', (d) => (log += d));
  rec.stderr.on('data', (d) => (log += d));
  const closed = new Promise((r) => rec.on('close', r));
  // The flash only counts once DreamCut is really recording.
  const t1 = Date.now();
  let on = false;
  while (!on && rec.exitCode === null && Date.now() - t1 < 30000) {
    await sleep(250);
    const c = dc('status').capture || {};
    on = c.isRecording && !c.isPreparingRecordingStart;
  }
  if (!on) throw new Error('DreamCut never started recording: ' + log.trim().slice(-400));
  console.log(`recording ${((Date.now() - t1) / 1000).toFixed(1)} s after the request`);
  await sleep(lead * 1000);
  await page.evaluate(() => new Promise((r) => { const f = document.getElementById('rec-flash'); f.style.display = 'block'; setTimeout(() => { f.style.display = 'none'; r(); }, 160); }));
  const t0 = Date.now();
  const at = (T) => sleep(Math.max(0, T * 1000 - (Date.now() - t0)));
  at.now = () => (Date.now() - t0) / 1000;
  if (choreo.run) await choreo.run(page, at);
  await at(dur);
  const code = await closed;
  console.log(log.trim().slice(-400));
  if (code || !fs.existsSync(out)) throw new Error('dreamcut record exited ' + code + ' without ' + out);
  console.log('take ->', out, `(next: flash-crop.mjs ${path.basename(out)} out.mp4 --dur ${dur})`);
  await quit();
} catch (e) {
  console.error(e.message);
  await quit().catch(() => {});
  process.exit(1);
}
