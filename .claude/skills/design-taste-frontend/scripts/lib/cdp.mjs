// Zero-dependency Chrome DevTools Protocol client.
// Drives an installed Chrome / Edge / Chromium in headless mode over Node's built-in WebSocket.
// Requires Node 22+. No npm install.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir, hostname } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findChrome() {
  const env = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (env && existsSync(env)) return env;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const local = process.env.LOCALAPPDATA || '';
  const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
  const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    // Windows
    join(pf, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Google/Chrome/Application/chrome.exe'),
    join(local, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    join(pf, 'Microsoft/Edge/Application/msedge.exe'),
    join(pf, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    // Linux
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
    '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge',
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  return null;
}

// Each profile carries an owner file naming the machine and the two processes that use it (the run and
// its Chrome). A later run removes a profile left by a killed run only when that file names this machine
// and neither process is alive. A profile without one (made before 2.1.4, or by another tool) is never touched.
const OWNER = 'taste-skill-owner.json';

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

export function sweepProfiles(base) {
  let names;
  try { names = readdirSync(base); } catch { return; }
  for (const name of names) {
    if (!name.startsWith('ad-chrome-')) continue;
    const p = join(base, name);
    try {
      const o = JSON.parse(readFileSync(join(p, OWNER), 'utf8'));
      if (o.host !== hostname() || !Number.isInteger(o.pid) || alive(o.pid) || alive(o.chrome)) continue;
      rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {}
  }
}

export class Browser {
  static async launch({ width = 1440, height = 900, extraArgs = [] } = {}) {
    if (typeof WebSocket === 'undefined') {
      throw new Error('Node 22+ is required (built-in WebSocket missing). Current: ' + process.version);
    }
    const exe = findChrome();
    if (!exe) {
      throw new Error('No Chrome/Edge/Chromium found. Install one or set CHROME_PATH to its executable.');
    }
    // A throwaway profile per run, its cache capped (each run starts cold anyway), removed on exit. It is
    // claimed with an owner file before Chrome starts, so another run's sweep can tell when it was abandoned.
    const base = process.env.TASTE_SKILL_TMP || tmpdir();
    sweepProfiles(base);
    const dir = mkdtempSync(join(base, 'ad-chrome-'));
    const claim = (chrome) => {
      try { writeFileSync(join(dir, OWNER), JSON.stringify({ host: hostname(), pid: process.pid, chrome })); } catch {}
    };
    claim();
    // On exit Chrome still holds the profile's files: stop it first, then remove the folder.
    let pid = 0;
    const drop = () => {
      try { if (pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(pid, 'SIGKILL'); } } catch {}
      try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
    };
    process.once('exit', drop);
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, () => { drop(); process.exit(130); });
    const args = [
      '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
      '--disk-cache-size=16777216', '--media-cache-size=16777216',
      '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows', '--disable-features=Translate,MediaRouter',
      '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required',
      '--enable-unsafe-swiftshader', `--window-size=${width},${height}`, ...extraArgs, 'about:blank',
    ];
    const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    pid = proc.pid;
    claim(pid);
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = '';
      const t = setTimeout(() => reject(new Error('Chrome did not start within 20s')), 20000);
      proc.stderr.on('data', (d) => {
        buf += d.toString();
        const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (m) { clearTimeout(t); resolve(m[1]); }
      });
      proc.on('exit', (code) => { clearTimeout(t); reject(new Error('Chrome exited early, code ' + code + '\n' + buf.slice(-600))); });
    });
    const b = new Browser();
    b.proc = proc; b.dir = dir; b.nextId = 1; b.pending = new Map(); b.listeners = new Map();
    b.ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { b.ws.onopen = res; b.ws.onerror = () => rej(new Error('CDP socket failed')); });
    b.ws.onmessage = (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id && b.pending.has(msg.id)) {
        const { resolve, reject, timer } = b.pending.get(msg.id);
        clearTimeout(timer); b.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) {
        const fns = b.listeners.get((msg.sessionId || '') + '|' + msg.method);
        if (fns) for (const fn of [...fns]) fn(msg.params);
      }
    };
    return b;
  }

  send(method, params = {}, sessionId, timeoutMs = 30000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }

  on(sessionId, method, fn) {
    const k = (sessionId || '') + '|' + method;
    if (!this.listeners.has(k)) this.listeners.set(k, new Set());
    this.listeners.get(k).add(fn);
    return () => this.listeners.get(k)?.delete(fn);
  }

  async newPage({ width = 1440, height = 900, dsf = 1, mobile = false, reducedMotion = false } = {}) {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank', newWindow: true });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    const p = new Page(this, targetId, sessionId);
    await p.send('Page.enable');
    await p.send('Runtime.enable');
    await p.setViewport({ width, height, dsf, mobile });
    if (reducedMotion) {
      await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    }
    return p;
  }

  async close() {
    try { await this.send('Browser.close', {}, undefined, 3000); } catch {}
    try { this.ws.close(); } catch {}
    try { this.proc.kill(); } catch {}
    await sleep(300);
    try { rmSync(this.dir, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  }
}

export class Page {
  constructor(browser, targetId, sessionId) {
    this.browser = browser; this.targetId = targetId; this.sessionId = sessionId;
    this.consoleErrors = [];
    browser.on(sessionId, 'Runtime.exceptionThrown', (p) => {
      this.consoleErrors.push((p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 300));
    });
    // Never let a JS dialog block the page.
    browser.on(sessionId, 'Page.javascriptDialogOpening', () => {
      this.send('Page.handleJavaScriptDialog', { accept: false }).catch(() => {});
    });
  }

  send(method, params = {}, timeoutMs = 30000) {
    return this.browser.send(method, params, this.sessionId, timeoutMs);
  }

  async setViewport({ width, height, dsf = 1, mobile = false }) {
    this.viewport = { width, height, dsf, mobile };
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dsf, mobile });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile });
  }

  // Navigates and resolves after the load event (or timeout), then waits `settleMs` for intros to finish.
  async goto(url, { timeoutMs = 25000, settleMs = 1500 } = {}) {
    let off;
    const loaded = new Promise((resolve) => { off = this.browser.on(this.sessionId, 'Page.loadEventFired', () => resolve('load')); });
    const nav = await this.send('Page.navigate', { url }, timeoutMs).catch((e) => ({ errorText: e.message }));
    if (nav.errorText && !/ERR_ABORTED/.test(nav.errorText)) { off(); throw new Error('navigate: ' + nav.errorText); }
    const how = await Promise.race([loaded, sleep(timeoutMs).then(() => 'timeout')]);
    off();
    await sleep(settleMs);
    return how;
  }

  // Evaluates a function (serialised) or an expression string in the page and returns its JSON value.
  async eval(fnOrExpr, arg) {
    const expression = typeof fnOrExpr === 'function'
      ? `(${fnOrExpr.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})`
      : fnOrExpr;
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, 30000);
    if (r.exceptionDetails) {
      throw new Error('page eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result?.value;
  }

  async screenshot({ path, format = 'jpeg', quality = 72, fullPage = false, clip } = {}) {
    const params = { format, captureBeyondViewport: !!fullPage };
    if (format !== 'png') params.quality = quality;
    if (fullPage) {
      const m = await this.send('Page.getLayoutMetrics');
      const s = m.cssContentSize || m.contentSize;
      params.clip = { x: 0, y: 0, width: Math.ceil(s.width), height: Math.min(Math.ceil(s.height), 16000), scale: 1 };
    } else if (clip) {
      params.clip = { scale: 1, ...clip };
    }
    const { data } = await this.send('Page.captureScreenshot', params, 45000);
    if (path) writeFileSync(path, Buffer.from(data, 'base64'));
    return data;
  }

  // Real wheel input, so smooth-scroll libraries and scroll-driven reveals behave as they do for a visitor.
  async wheel(totalDeltaY, { step = 240, pauseMs = 45 } = {}) {
    const { width, height } = this.viewport;
    const dir = Math.sign(totalDeltaY) || 1;
    let left = Math.abs(totalDeltaY);
    while (left > 0) {
      const d = Math.min(step, left);
      await this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(width / 2), y: Math.round(height / 2), deltaX: 0, deltaY: d * dir }).catch(() => {});
      left -= d;
      await sleep(pauseMs);
    }
  }

  async close() {
    try { await this.browser.send('Target.closeTarget', { targetId: this.targetId }, undefined, 5000); } catch {}
  }
}

export { sleep };
