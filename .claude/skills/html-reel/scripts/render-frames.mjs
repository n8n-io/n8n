#!/usr/bin/env node
// Render a scene page frame by frame into an MP4: for every frame at τ
// (seconds of the film, f / fps) it calls window.__frame(τ), waits for a
// paint, and screenshots the stage. The page sets every element from that
// one number (reel-clock.js's HTMLReel.scene does, or a page's own
// __frame), so the film is exact whatever the machine's speed.
//
// Usage:
//   render-frames.mjs <page.html | URL> [--out scene.mp4] [--fps 30] [--size 540x960] [--scale 2]
//                     [--duration S] [--anchors anchors.json] [--inject a.js,b.js] [--setup "expr"]
//                     [--test 0,1,2.5] [--under body.mp4] [--gpu] [--chrome PATH] [--safe 140:820] [--wait 300] [--alpha]
//
// --duration defaults to window.__dur. --anchors is for a page whose
// __frame is on the scratch voice's clock and has no anchors of its own:
// it then gets __frame(W(τ)), W straight lines through the file's [[τ, t],
// …] pairs (timemap.py writes them, real first) and slope 1 past the ends.
// --inject adds scripts after the page loads (to drive a live page that
// was never made for this), and --setup evaluates an expression once before
// the first frame (window.__tailSetup([]), say); a promise it returns is
// awaited. Before the first frame it awaits window.__ready() when there is
// one, every declared font and every image. Each frame, when the page has
// window.__bounds() ([top, bottom] of what must stay readable, in stage
// px), it tracks the worst top and bottom and prints them in output pixels
// against the 3:4 safe area (--safe, stage px: 140–820 is 280–1640 at 2×),
// warning when outside. --test renders stills at those times and a contact
// sheet into <out>-test/ instead of a film. --gpu launches Chrome with
// Metal ANGLE and the GPU on, for WebGL backgrounds. --size and --safe
// default to the page's own shape (HTMLReel.scene({ shape }) sets
// window.__shape and window.__safe), else 540x960 and 140:820.
// --alpha renders with a see-through background (the page's html and
// body made transparent) into a ProRes 4444 .mov, to lay titles over a
// video (frame-video.mjs --overlay); it's big (about 23 MB a second), so
// delete it once the body is made. --test with --under body.mp4 lays each
// still over the body's frame at the same time, so titles are judged on
// the picture they'll sit on. A reel-clock page's sides are checked too:
// nothing read closer than 16 px to the stage's edge. Films are tagged
// BT.709, limited range, as every player expects; contact sheets take
// their frames at exact half-seconds.
// The film is libx264 -preset slow -crf 16, yuv420p, +faststart, with a
// contact sheet beside it (<out>-sheet.jpg, two frames a second).
// Needs playwright (or playwright-core) and ffmpeg; Chrome from --chrome,
// CHROME_PATH, or playwright's own.
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'scene.mp4' }, fps: { type: 'string', default: '30' }, size: { type: 'string' }, alpha: { type: 'boolean' }, under: { type: 'string' },
    scale: { type: 'string', default: '2' }, duration: { type: 'string' }, anchors: { type: 'string' }, inject: { type: 'string' },
    setup: { type: 'string' }, test: { type: 'string' }, gpu: { type: 'boolean' }, chrome: { type: 'string' },
    safe: { type: 'string' }, wait: { type: 'string', default: '300' }, help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || positionals.length !== 1) { console.log(USAGE); process.exit(o.help ? 0 : 1); }

async function chromium() {
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(n); return m.chromium || m.default.chromium; } catch {}
  const req = createRequire(path.join(process.cwd(), 'x.js'));
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(pathToFileURL(req.resolve(n)).href); return m.chromium || m.default.chromium; } catch {}
  throw new Error('playwright not found: npm i playwright-core here or beside this script');
}
/** τ → t through [[τ, t], …]: straight lines, slope 1 past the ends, only forward. */
function warp(pairs) {
  const a = [];
  for (const [x, y] of pairs.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((p, q) => p[0] - q[0]))
    if (!a.length || (x > a.at(-1)[0] && y > a.at(-1)[1])) a.push([x, y]);
  const f = (x, i0, i1) => {
    if (x <= a[0][i0]) return a[0][i1] + x - a[0][i0];
    if (x >= a.at(-1)[i0]) return a.at(-1)[i1] + x - a.at(-1)[i0];
    let i = 0; while (x > a[i + 1][i0]) i++;
    return a[i][i1] + ((x - a[i][i0]) * (a[i + 1][i1] - a[i][i1])) / (a[i + 1][i0] - a[i][i0]);
  };
  const W = (x) => f(x, 0, 1); W.inverse = (y) => f(y, 1, 0);
  return W;
}

const page0 = positionals[0], isUrl = /^[a-z]+:\/\//i.test(page0);
const url = isUrl ? page0 : pathToFileURL(path.resolve(page0)).href;
let [w, h] = (o.size || '540x960').toLowerCase().split('x').map(Number);
const scale = +o.scale, fps = +o.fps;
let safe = (o.safe || '140:820').split(':').map(Number);
let W = null;
if (o.anchors) {
  const d = JSON.parse(fs.readFileSync(o.anchors, 'utf8'));
  W = warp(Array.isArray(d) ? d : d.anchors);
}
const out = path.resolve(o.out), stem = out.replace(/\.[a-z0-9]+$/i, '');

const args = ['--hide-scrollbars', '--mute-audio', ...(isUrl ? [] : ['--allow-file-access-from-files'])];
if (o.gpu) args.push('--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist');
const browser = await (await chromium()).launch({ executablePath: o.chrome || process.env.CHROME_PATH || undefined, headless: true, args });
let ff = null;
try {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, bypassCSP: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  for (const s of (o.inject || '').split(',').filter(Boolean)) await page.addScriptTag({ path: path.resolve(s) });
  // The page's own shape and safe area, unless given.
  const own = await page.evaluate(() => ({ shape: window.__shape, safe: window.__safe, sizes: window.HTMLReel && window.HTMLReel.SHAPES }));
  if (!o.size && own.shape && own.sizes && own.sizes[own.shape] && own.sizes[own.shape].join('x') !== `${w}x${h}`) {
    [w, h] = own.sizes[own.shape];
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  }
  if (!o.safe && Array.isArray(own.safe)) safe = own.safe;
  if (o.alpha) await page.addStyleTag({ content: 'html,body{background:transparent!important}' });
  await page.evaluate(async () => {
    if (window.__ready) await window.__ready();
    const loads = [...document.fonts].map((f) => (f.status === 'unloaded' ? f.load() : f.loaded).catch(() => {}));
    await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 15000))]);
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
  });
  if (o.setup) console.log('setup', JSON.stringify(await page.evaluate(o.setup)) ?? '');
  if (!(await page.evaluate(() => typeof window.__frame === 'function'))) throw new Error('the page has no window.__frame(t)');
  await page.waitForTimeout(+o.wait);

  const pageDur = await page.evaluate(() => (Number.isFinite(window.__dur) ? window.__dur : null));
  const dur = o.duration != null ? +o.duration : pageDur != null ? (W ? W.inverse(pageDur) : pageDur) : null;
  const test = o.test ? o.test.split(',').map(Number) : null;
  if (!test && !(dur > 0)) throw new Error('no length: pass --duration (the page has no window.__dur)');
  const N = test ? test.length : Math.round(dur * fps);
  const times = test || [...Array(N).keys()].map((f) => f / fps);
  const dir = stem + '-test/';
  if (test) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }
  else {
    const enc = o.alpha
      ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', out]
      : ['-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
         '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', out];
    ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-', '-frames:v', String(N), ...enc], { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.done = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg exited ' + c)) : r())));
  }
  const worst = { top: [Infinity, 0], bottom: [-Infinity, 0], left: [Infinity, 0], right: [-Infinity, 0] };
  const stageW = await page.evaluate(() => window.__width || null);
  const hasBounds = await page.evaluate(() => typeof window.__bounds === 'function');
  const t0 = Date.now();
  for (const [i, tau] of times.entries()) {
    await page.evaluate((t) => window.__frame(t), W ? W(tau) : tau);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    if (hasBounds) {
      const [top, bottom, left, right] = await page.evaluate(() => window.__bounds());
      if (Number.isFinite(top) && top < worst.top[0]) worst.top = [top, tau];
      if (Number.isFinite(bottom) && bottom > worst.bottom[0]) worst.bottom = [bottom, tau];
      // (Older pages' __bounds give other numbers after the first two.)
      if (stageW && Number.isFinite(left) && left < worst.left[0]) worst.left = [left, tau];
      if (stageW && Number.isFinite(right) && right > worst.right[0]) worst.right = [right, tau];
    }
    const png = await page.screenshot({ type: 'png', omitBackground: !!o.alpha });
    if (test) fs.writeFileSync(dir + 't' + tau.toFixed(2).padStart(6, '0') + '.png', png);
    else if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (!test && i % (fps * 2) === 0) console.log(`frame ${i}/${N}`, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  if (hasBounds) {
    const px = (v) => (Number.isFinite(v[0]) ? Math.round(v[0] * scale) + ' px @' + v[1].toFixed(2) + 's' : 'nothing shown');
    const lim = safe.map((v) => Math.round(v * scale));
    const bad = worst.top[0] < safe[0] - 0.5 || worst.bottom[0] > safe[1] + 0.5;
    console.log(`bounds: top ${px(worst.top)}, bottom ${px(worst.bottom)} (safe ${lim[0]}–${lim[1]} px)` + (bad ? '  WARNING: outside the safe area' : ''));
    if (stageW && Number.isFinite(worst.left[0])) {
      const side = worst.left[0] < 16 - 0.5 || worst.right[0] > stageW - 16 + 0.5;
      console.log(`sides: left ${px(worst.left)}, right ${px(worst.right)} (keep 16 px in: ${Math.round(16 * scale)}–${Math.round((stageW - 16) * scale)} px)` + (side ? '  WARNING: too close to the edge' : ''));
    }
  }
  await browser.close();
  if (test) {
    if (o.under) {
      // Each still over the body's frame at its time.
      for (const tau of times) {
        const f = dir + 't' + tau.toFixed(2).padStart(6, '0') + '.png';
        const tmp = f.replace(/\.png$/, '.under.png');
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(tau), '-i', path.resolve(o.under), '-i', f, '-frames:v', '1', '-filter_complex', `[0:v]scale=${w * scale}:${h * scale}[b];[b][1:v]overlay=0:0`, tmp]);
        fs.renameSync(tmp, f);
      }
    }
    const cols = Math.min(7, times.length);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', dir + 't*.png', '-vf', `scale=270:-1,tile=${cols}x${Math.ceil(times.length / cols)}:padding=4:color=0x222222`, '-frames:v', '1', dir + 'sheet.jpg']);
    console.log('stills and sheet ->', dir + 'sheet.jpg');
  } else {
    ff.stdin.end();
    await ff.done;
    // Frames at exact half-seconds (fps=2 picks them about 0.25 s late).
    const n = Math.ceil(dur * 2), cols = Math.min(10, n), step = Math.max(1, Math.round(fps / 2));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', `select='not(mod(n\\,${step}))',scale=180:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=0x222222`, '-fps_mode', 'vfr', '-frames:v', '1', stem + '-sheet.jpg']);
    console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,nb_frames,r_frame_rate:format=duration', '-of', 'compact=p=0', out]).toString().trim().replace(/\n/g, ' '));
    console.log(`${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${out}, ${stem}-sheet.jpg`);
  }
} catch (e) {
  console.error(e.message);
  if (ff) ff.kill();
  await browser.close().catch(() => {});
  process.exit(1);
}
