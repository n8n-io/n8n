// An example choreography for record-window.mjs: it scrolls the page to
// its first button, moves the drawn cursor onto it, and clicks it, each
// move ending on a set time after the flash. Copy it and change the
// selector and the times to the voice's beats.
//
// Usage: record-window.mjs --url page.html --dur 3 --choreo choreo-example.mjs --out raw.mov
//
// `await at(T)` waits until T s after the flash and `at.now()` says how far
// in it is. Every call to the browser is a round trip (tens of ms, more on
// a busy machine), so each move is placed by the clock and ends on its
// time (until(…)) rather than taking a fixed number of steps.

const SELECTOR = 'button, a[href], [role="button"]';
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Before recording: start at the top, the cursor parked low on the right. */
export async function setup(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  await page.mouse.move(width * 0.7, height * 0.8);
}

export async function run(page, at) {
  // 0.2–1.2 s: an eased scroll that brings the button to the middle, run in
  // the page so it is smooth, and ending at 1.2 s whenever it starts.
  await at(0.2);
  await page.evaluate(async ({ sel, secs }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const y0 = scrollY, y1 = Math.max(0, y0 + el.getBoundingClientRect().top + el.offsetHeight / 2 - innerHeight / 2);
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
        window.scrollTo(0, y0 + (y1 - y0) * io(k));
        if (k < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
  }, { sel: SELECTOR, secs: Math.max(0.3, 1.2 - at.now()) });

  // 1.3–2.1 s: the cursor glides onto the button, eased.
  await at(1.3);
  const [from, to] = await page.evaluate((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(document.getElementById('rec-cursor')?.style.transform || '');
    return [m ? [+m[1] + 2, +m[2] + 2] : [innerWidth * 0.7, innerHeight * 0.8], r ? [r.left + r.width / 2, r.top + r.height / 2] : null];
  }, SELECTOR);
  if (!to) return;
  const a = at.now(), b = Math.max(a + 0.3, 2.1);
  for (let x = 0; x < 1; ) {
    x = Math.min(1, (at.now() - a) / (b - a));
    const k = io(x);
    await page.mouse.move(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k);
    await sleep(16);
  }

  // 2.2 s: the click, a press held long enough to see.
  await at(2.2);
  await page.mouse.down();
  await sleep(130);
  await page.mouse.up();
}
