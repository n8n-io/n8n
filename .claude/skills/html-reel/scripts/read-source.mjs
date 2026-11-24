#!/usr/bin/env node
/* Read what a reel is made from: a tweet (an X post), a landing page, a
   YouTube video or a video file. It writes, into one folder, everything the
   script and the look are taken from:
   - source.json: the kind, the words (the post's text, the page's headings
     and copy, the video's title, description and captions), its author, its
     links, its quote, its media, and the measured look;
   - media/: the post's videos and pictures, the YouTube video, the page's
     screenshots;
   - frames/: a contact sheet of each video and its key frames, to look at;
   - Source.md and Look.md: drafts to finish by hand (what the reel says,
     how it looks), with what was measured filled in.

   The look is measured, never guessed: a page's fonts, sizes, colours,
   radii and CSS variables from its computed styles; a video's palette from
   its frames (ground, ink and accent by area and saturation). A video's
   fonts can't be read from pixels: Look.md says so, and the agent names the
   closest Google fonts by looking at the frames.

   Usage:
     node read-source.mjs <tweet URL | page URL | YouTube URL | video file> [--out source/]
       [--follow] (also read the pages a tweet links to) [--every 2] (seconds between
       the contact sheet's frames; 0.5 to choose pieces) [--chrome PATH] [--no-media]
   Needs: ffmpeg and ffprobe; playwright (or playwright-core) for pages;
   yt-dlp for YouTube (brew install yt-dlp), else bring the video in through
   Fil for Mac and give this its file. Tweets are read through the public
   fxtwitter API (api.fxtwitter.com), with no sign-in. */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const HELP = readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^#!.*\n\/\*\s?/, '');
const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log(HELP.trim());
  process.exit(argv.length ? 0 : 1);
}
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i < 0 ? dflt : argv[i + 1];
};
const has = (name) => argv.includes(name);
const input = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--out', '--chrome'].includes(argv[i - 1])));
const OUT = resolve(flag('--out', 'source'));
const MEDIA = join(OUT, 'media');
const FRAMES = join(OUT, 'frames');
for (const d of [OUT, MEDIA, FRAMES]) mkdirSync(d, { recursive: true });

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { maxBuffer: 1 << 30, ...opts });
const which = (cmd) => {
  try {
    return run('which', [cmd]).toString().trim() || null;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------ videos */

const probe = (file) => {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', file]).toString());
  const v = j.streams.find((s) => s.codec_type === 'video') || {};
  return { width: v.width || 0, height: v.height || 0, duration: +(+j.format.duration || 0).toFixed(3), sound: j.streams.some((s) => s.codec_type === 'audio') };
};

/** The colours of a set of frames: every pixel of small frames binned to
    5 bits a channel, the bins counted, close ones merged; then the ground
    (the most common), the ink (the most common far from the ground) and
    the accent (the most common saturated one), each with its share. */
function paletteOf(rgb) {
  const bins = new Map();
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const k = ((rgb[i] >> 3) << 10) | ((rgb[i + 1] >> 3) << 5) | (rgb[i + 2] >> 3);
    bins.set(k, (bins.get(k) || 0) + 1);
  }
  const total = rgb.length / 3;
  const cols = [...bins]
    .map(([k, n]) => ({ r: ((k >> 10) & 31) * 8 + 4, g: ((k >> 5) & 31) * 8 + 4, b: (k & 31) * 8 + 4, n }))
    .sort((a, b) => b.n - a.n);
  const near = (a, b, d) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < d;
  const merged = [];
  for (const c of cols) {
    const m = merged.find((x) => near(x, c, 40));
    if (m) m.n += c.n;
    else merged.push({ ...c });
  }
  merged.sort((a, b) => b.n - a.n);
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('');
  const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  const sat = (c) => {
    const mx = Math.max(c.r, c.g, c.b),
      mn = Math.min(c.r, c.g, c.b);
    return mx ? (mx - mn) / mx : 0;
  };
  const top = merged.slice(0, 12).map((c) => ({ hex: hex(c), share: +(c.n / total).toFixed(3), lum: +lum(c).toFixed(2), sat: +sat(c).toFixed(2) }));
  const ground = merged[0];
  const ink = merged.find((c) => Math.abs(lum(c) - lum(ground)) > 0.45) || merged[1];
  // The accent: vivid (saturated and bright enough to read as a colour),
  // seen often enough to be meant, the most of both.
  const vivid = (c) => sat(c) * Math.min(1, lum(c) / 0.45);
  const accent = merged.filter((c) => sat(c) > 0.4 && lum(c) > 0.25 && c.n / total > 0.001).sort((a, b) => vivid(b) * Math.sqrt(b.n) - vivid(a) * Math.sqrt(a.n))[0];
  return { ground: ground && hex(ground), ink: ink && hex(ink), accent: accent ? hex(accent) : null, mode: ground && lum(ground) < 0.5 ? 'dark' : 'light', colours: top };
}

/** A video looked at: its size and length, contact sheets (a frame every
    --every seconds, 48 a sheet), every scene change's time (`cuts`: where
    it changes page, and where a glitch may hide), key frames at up to 12
    of them, and its palette. */
function lookAtVideo(file, name) {
  const p = probe(file);
  const every = +flag('--every', 2) || 2;
  const sheets = [];
  for (let from = 0, i = 1; from < p.duration; from += every * 48, i++) {
    const sheet = join(FRAMES, `${name}-sheet${i > 1 ? `-${i}` : ''}.jpg`);
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(from), '-t', String(every * 48), '-i', file, '-vf', `fps=1/${every},scale=320:-2,tile=8x6:padding=4:color=0x111111`, '-frames:v', '1', sheet]);
    sheets.push({ from: +from.toFixed(2), every, file: sheet });
  }
  const sheet = sheets[0].file;
  // Key frames: where the picture changes most, else evenly.
  // showinfo writes to stderr, so read that, whatever ffmpeg exits with.
  const log = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-vf', "select='gt(scene,0.25)',showinfo", '-an', '-f', 'null', '-'], { maxBuffer: 1 << 28 }).stderr.toString();
  let times = [...log.matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]);
  const cuts = times.map((t) => +t.toFixed(2));
  if (times.length < 4) times = Array.from({ length: 8 }, (_, i) => (p.duration * (i + 0.5)) / 8);
  if (times.length > 12) times = Array.from({ length: 12 }, (_, i) => times[Math.floor((i * times.length) / 12)]);
  const keys = [];
  for (const [i, t] of times.entries()) {
    const f = join(FRAMES, `${name}-key-${String(i + 1).padStart(2, '0')}.jpg`);
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=1080:-2', '-q:v', '3', f]);
    // Each key frame's own colours: a video of several pages has several
    // looks, and one palette over all of it describes none of them.
    const one = run('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=96:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
    const kp = paletteOf(one);
    keys.push({ at: +t.toFixed(2), file: f, palette: { ground: kp.ground, ink: kp.ink, accent: kp.accent, mode: kp.mode } });
  }
  const small = run('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'fps=1,scale=64:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  return { ...p, sheet, sheets, cuts, keys, palette: paletteOf(small) };
}

async function download(url, file) {
  const res = await fetch(url, { headers: { 'user-agent': 'html-reel/1 (read-source)' } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/* ------------------------------------------------------------- pages */

async function browser() {
  let pw;
  // Beside this script, else from the folder it's run in.
  const req = createRequire(join(process.cwd(), 'x.js'));
  for (const m of ['playwright', 'playwright-core'])
    for (const load of [() => import(m), () => import(pathToFileURL(req.resolve(m)).href)])
      if (!pw)
        try {
          pw = await load();
        } catch {}
  if (!pw) throw new Error('Pages need playwright: npm i -D playwright (or playwright-core with --chrome), here or beside this script.');
  const exe = flag('--chrome', process.env.CHROME_PATH);
  return (pw.chromium || pw.default.chromium).launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
}

/** A page read: its words (title, description, headings, copy, buttons),
    its look (the fonts, sizes, weights and colours of its headings, text,
    buttons and labels, its radii, its CSS variables, its palette by area)
    and screenshots: the first screen on a phone and on a desktop, and the
    desktop page a screen at a time. */
async function readPage(url, name = 'page', b = null) {
  const own = !b;
  b ||= await browser();
  const out = { kind: 'page', url };
  for (const [vw, vh, tag] of [
    [1440, 900, 'desktop'],
    [390, 844, 'phone'],
  ]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(2500);
    if (tag === 'desktop') {
      Object.assign(
        out,
        await p.evaluate(() => {
          const txt = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
          const seen = (el) => {
            const r = el.getBoundingClientRect(),
              cs = getComputedStyle(el);
            return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
          };
          const all = (sel, n) => [...document.querySelectorAll(sel)].filter(seen).map(txt).filter(Boolean).slice(0, n);
          const meta = (k) => document.querySelector(`meta[name="${k}"],meta[property="${k}"]`)?.content || null;
          const style = (el) => {
            if (!el) return null;
            const cs = getComputedStyle(el);
            return { text: txt(el).slice(0, 80), font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, tracking: cs.letterSpacing, leading: cs.lineHeight, case: cs.textTransform, colour: cs.color, background: cs.backgroundColor, radius: cs.borderRadius };
          };
          const first = (sel) => [...document.querySelectorAll(sel)].find(seen) || null;
          const vars = {};
          for (const sh of document.styleSheets) {
            let rules;
            try {
              rules = sh.cssRules;
            } catch {
              continue;
            }
            for (const r of rules || [])
              if (r.selectorText === ':root' || r.selectorText === 'html')
                for (const k of r.style) if (k.startsWith('--') && Object.keys(vars).length < 80) vars[k] = r.style.getPropertyValue(k).trim();
          }
          const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.weight}`);
          return {
            title: document.title,
            description: meta('description') || meta('og:description'),
            image: meta('og:image'),
            headings: all('h1, h2, h3', 24),
            copy: all('main p, section p, article p, p', 30).filter((t) => t.length > 40),
            buttons: all('a[class*="btn"], a[class*="button"], button', 16).filter((t) => t.length < 40),
            look: {
              body: style(document.body),
              h1: style(first('h1')),
              h2: style(first('h2')),
              text: style(first('main p, p')),
              button: style(first('a[class*="btn"], a[class*="button"], button')),
              label: style(first('code, kbd, [class*="label"], [class*="eyebrow"], [class*="kicker"], small')),
              vars,
              fonts: [...new Set(fonts)].slice(0, 20),
            },
          };
        }),
      );
      // A screen at a time down the page, up to 8.
      const height = await p.evaluate(() => document.documentElement.scrollHeight);
      out.shots = [];
      for (let y = 0, i = 1; y < height && i <= 8; y += vh, i++) {
        await p.evaluate((y) => window.scrollTo(0, y), y);
        await p.waitForTimeout(500);
        const f = join(MEDIA, `${name}-desktop-${i}.jpg`);
        await p.screenshot({ path: f, type: 'jpeg', quality: 82 });
        out.shots.push(f);
      }
      // Its palette, from the screens as they look.
      const raw = run('ffmpeg', ['-v', 'error', '-pattern_type', 'glob', '-i', join(MEDIA, `${name}-desktop-*.jpg`), '-vf', 'scale=96:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
      out.look.palette = paletteOf(raw);
    } else {
      const f = join(MEDIA, `${name}-phone-1.jpg`);
      await p.screenshot({ path: f, type: 'jpeg', quality: 82 });
      out.shots.push(f);
    }
    await ctx.close();
  }
  if (own) await b.close();
  return out;
}

/* ------------------------------------------------------------ tweets */

const TWEET = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|vxtwitter)\.com\/([^/]+)\/status(?:es)?\/(\d+)/i;
const YOUTUBE = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;

async function readTweet(url) {
  const [, user, id] = TWEET.exec(url);
  const res = await fetch(`https://api.fxtwitter.com/${user}/status/${id}`);
  if (!res.ok) throw new Error(`fxtwitter: ${res.status}`);
  const t = (await res.json()).tweet;
  if (!t) throw new Error('That post could not be read (deleted, private or age-gated).');
  const media = async (m, tag) => {
    const list = [];
    for (const [i, x] of (m?.all || []).entries()) {
      const ext = x.type === 'photo' ? '.jpg' : '.mp4';
      const file = join(MEDIA, `${tag}-${i + 1}${ext}`);
      const item = { type: x.type, url: x.url, width: x.width, height: x.height, duration: x.duration || null };
      if (!has('--no-media')) {
        await download(x.url, file);
        item.file = file;
        if (x.type !== 'photo') {
          item.look = lookAtVideo(file, `${tag}-${i + 1}`);
          item.duration ??= item.look.duration;
        }
      }
      list.push(item);
    }
    return list;
  };
  const links = [...new Set((t.text.match(/https?:\/\/\S+/g) || []).map((u) => u.replace(/[).,]+$/, '')))];
  // Avatars, for a post card drawn in HTML (never a screenshot of X).
  const avatar = async (who) => {
    if (!who?.avatar_url || has('--no-media')) return null;
    const file = join(MEDIA, `avatar-${who.screen_name}.jpg`);
    try {
      return await download(who.avatar_url.replace('_normal', '_200x200'), file);
    } catch {
      return null;
    }
  };
  const out = {
    kind: 'tweet',
    url: t.url || url,
    author: { name: t.author?.name, handle: t.author?.screen_name, avatar: t.author?.avatar_url, avatarFile: await avatar(t.author) },
    date: t.created_at,
    text: t.text,
    stats: { likes: t.likes, reposts: t.retweets, replies: t.replies, views: t.views },
    links,
    media: await media(t.media, 'post'),
    quote: t.quote
      ? {
          author: { name: t.quote.author?.name, handle: t.quote.author?.screen_name, avatar: t.quote.author?.avatar_url, avatarFile: await avatar(t.quote.author) },
          text: t.quote.text,
          url: t.quote.url,
          date: t.quote.created_at,
          stats: { likes: t.quote.likes, reposts: t.quote.retweets, replies: t.quote.replies, views: t.quote.views },
          media: await media(t.quote.media, 'quote'),
        }
      : null,
  };
  if (has('--follow') && links.length) {
    const b = await browser();
    out.pages = [];
    for (const [i, l] of links.entries())
      try {
        out.pages.push(await readPage(l, `link-${i + 1}`, b));
      } catch (e) {
        out.pages.push({ url: l, error: String(e.message || e) });
      }
    await b.close();
  }
  return out;
}

/* ----------------------------------------------------------- YouTube */

function readYouTube(url) {
  if (!which('yt-dlp'))
    throw new Error('YouTube needs yt-dlp (brew install yt-dlp). Or bring the video into Fil through Fil for Mac and give this script its file.');
  const j = JSON.parse(run('yt-dlp', ['-J', '--no-warnings', url]).toString());
  const file = join(MEDIA, 'youtube.mp4');
  if (!has('--no-media')) run('yt-dlp', ['-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]', '--merge-output-format', 'mp4', '-o', file, '--no-warnings', url], { stdio: 'inherit' });
  // Its own captions, or YouTube's automatic ones, as timed text.
  let captions = null;
  try {
    run('yt-dlp', ['--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'en.*', '--sub-format', 'vtt', '-o', join(MEDIA, 'youtube'), '--no-warnings', url], { stdio: 'ignore' });
    const vtt = readdirSync(MEDIA).find((f) => f.startsWith('youtube') && f.endsWith('.vtt'));
    if (vtt) captions = join(MEDIA, vtt);
  } catch {}
  return {
    kind: 'youtube',
    url,
    title: j.title,
    author: { name: j.uploader || j.channel, handle: j.uploader_id || null },
    date: j.upload_date,
    text: j.description || '',
    chapters: (j.chapters || []).map((c) => ({ at: c.start_time, title: c.title })),
    stats: { views: j.view_count, likes: j.like_count },
    captions,
    media: existsSync(file) ? [{ type: 'video', file, look: lookAtVideo(file, 'youtube') }] : [],
  };
}

/* ------------------------------------------------------------ writing */

const lines = (arr, f = (x) => x) => (arr || []).map((x) => `- ${f(x)}`).join('\n') || '- (none)';
function looksOf(src) {
  const vids = [...(src.media || []), ...(src.quote?.media || [])].filter((m) => m.look);
  return { pages: [src.kind === 'page' ? src : null, ...(src.pages || [])].filter((p) => p?.look), videos: vids };
}
function sourceMd(src) {
  const words = src.kind === 'page' ? [src.title, src.description, ...(src.headings || []), ...(src.copy || []).slice(0, 8)].filter(Boolean).join('\n\n') : src.text;
  return `# Source

- **Kind:** ${src.kind}
- **From:** ${src.url}
- **By:** ${src.author ? `${src.author.name || ''} (@${src.author.handle || '?'})` : '(the page’s own brand)'}
- **Date:** ${src.date || '(unknown)'}
${src.stats ? `- **Reach:** ${Object.entries(src.stats).filter(([, v]) => v != null).map(([k, v]) => `${v} ${k}`).join(' · ')}\n` : ''}
## What it says, word for word

${words}
${src.quote ? `\n## The post it quotes (credit @${src.quote.author.handle} by name)\n\n${src.quote.text}\n` : ''}
## Links

${lines(src.links || [])}

## Media

${lines([...(src.media || []), ...(src.quote?.media || [])], (m) => `${m.type} ${m.look?.width || m.width}×${m.look?.height || m.height}${m.look && m.width && m.look.width !== m.width ? ` (the post says ${m.width}×${m.height}; the file is what there is: crops past about 2.5× go soft)` : ''}${m.duration || m.look?.duration ? `, ${m.duration || m.look.duration} s` : ''}: ${m.file || m.url}`)}

## The reel (to write)

- **The one idea:** [what someone should leave believing, in the creator's words]
- **Facts it may use:** [numbers, names, prices, claims, each as the source says it; nothing else]
- **The hook:** [its most surprising true thing, said in the first second]
- **The ask:** [comment a word, follow, the link in bio, or none]
- **Structure:** [promo · showcase · found this · explainer: references/structures.md]
`;
}
function lookMd(src) {
  const { pages, videos } = looksOf(src);
  const pal = (p) => (p ? `ground ${p.ground}, ink ${p.ink}, accent ${p.accent || '(none saturated enough)'} (${p.mode}); the top colours by area: ${p.colours.slice(0, 6).map((c) => `${c.hex} ${Math.round(c.share * 100)}%`).join(', ')}` : '(none)');
  const st = (s) => (s ? `${s.font} · ${s.size} · ${s.weight}${s.case !== 'none' ? ` · ${s.case}` : ''}${s.tracking !== 'normal' ? ` · tracking ${s.tracking}` : ''} · ${s.colour}` : '(not on the page)');
  const pageBlock = pages
    .map(
      (p) => `## Measured on ${p.url}

- **Headlines (h1):** ${st(p.look.h1)}
- **Subheads (h2):** ${st(p.look.h2)}
- **Text:** ${st(p.look.text)}
- **Buttons:** ${st(p.look.button)}${p.look.button ? ` · on ${p.look.button.background} · radius ${p.look.button.radius}` : ''}
- **Labels:** ${st(p.look.label)}
- **Fonts loaded:** ${(p.look.fonts || []).join(', ') || '(system fonts)'}
- **Palette:** ${pal(p.look.palette)}
- **CSS variables:** ${Object.entries(p.look.vars || {}).slice(0, 24).map(([k, v]) => `${k}: ${v}`).join('; ') || '(none on :root)'}
- **Screens:** ${(p.shots || []).join(', ')}
`,
    )
    .join('\n');
  const videoBlock = videos
    .map(
      (m) => `## Measured on ${m.file}

- **Size:** ${m.look.width}×${m.look.height}, ${m.look.duration} s${m.look.sound ? ', with sound' : ''}
- **Palette:** ${pal(m.look.palette)}
- **Look at:** ${m.look.sheets.map((x) => x.file).join(', ')} and its key frames:
${m.look.keys.map((k) => `  - ${k.at} s: ground ${k.palette.ground}, ink ${k.palette.ink}, accent ${k.palette.accent || '(none)'} · ${k.file}`).join('\n')}
- **Scene cuts:** ${m.look.cuts.length ? m.look.cuts.join(', ') + ' s' : '(none found)'}
`,
    )
    .join('\n');
  return `# Look

What the reel looks like, taken from its source. The scenes set these as reel-clock.css variables (--reel-bg, --reel-ink, --reel-accent, --reel-setup-*, --reel-payoff-*, --reel-label-*).

- **Shape:** [9:16 for Reels, TikTok and Shorts; 4:5 or 1:1 for a feed; 16:9 for YouTube]
- **Mode:** [dark or light, as the source is]
- **Ground:** [a colour, from the palette below]
- **Ink:** [a colour]
- **Accent:** [one colour, for the dot, a highlight, the spoken word in captions]
- **Setup type:** [a font (Google Fonts), its size on the 540 stage, weight, case: the line that sets up]
- **Payoff type:** [a font, size, weight, case: the word that lands]
- **Labels:** [a font for tags, figures and numbers]
- **Background:** [what's behind the titles: the source's own ground, a texture, light, a blurred frame of its video]
- **Motifs:** [shapes, frames, cards, cursors, lines that the source uses and the scenes can reuse]
- **Motion:** [how things arrive and leave in the source: snappy, soft, mechanical]
${pages.length ? '' : '\nA video\'s fonts can\'t be read from its pixels: name the closest Google fonts by looking at its frames.\n'}
${pageBlock}
${videoBlock}`;
}

/* -------------------------------------------------------------- main */

let src;
if (!input) throw new Error('Give a tweet, page or YouTube URL, or a video file.');
if (TWEET.test(input)) src = await readTweet(input);
else if (YOUTUBE.test(input)) src = readYouTube(input);
else if (/^https?:\/\//i.test(input)) src = await readPage(input);
else if (existsSync(input) && statSync(input).isFile()) {
  const ext = extname(input).toLowerCase();
  if (!['.mp4', '.mov', '.webm', '.m4v', '.mkv'].includes(ext)) throw new Error(`${input}: a video file (mp4, mov, webm), or a URL.`);
  const name = basename(input, ext).replace(/[^\w-]/g, '-');
  src = { kind: 'video', url: resolve(input), title: name, text: '', media: [{ type: 'video', file: resolve(input), look: lookAtVideo(resolve(input), name) }] };
} else throw new Error(`Not a URL or a file: ${input}`);

writeFileSync(join(OUT, 'source.json'), JSON.stringify(src, null, 2));
writeFileSync(join(OUT, 'Source.md'), sourceMd(src));
writeFileSync(join(OUT, 'Look.md'), lookMd(src));
const { pages, videos } = looksOf(src);
console.log(
  JSON.stringify(
    {
      kind: src.kind,
      out: OUT,
      words: (src.text || src.headings?.join(' ') || '').split(/\s+/).filter(Boolean).length,
      media: [...(src.media || []), ...(src.quote?.media || [])].map((m) => ({ type: m.type, file: m.file, size: m.look ? `${m.look.width}×${m.look.height}` : `${m.width}×${m.height}`, seconds: m.look?.duration || m.duration })),
      palettes: [...pages.map((p) => p.look.palette), ...videos.map((m) => m.look.palette)].map((p) => p && { ground: p.ground, ink: p.ink, accent: p.accent, mode: p.mode }),
      fonts: pages.map((p) => p.look.h1?.font).filter(Boolean),
    },
    null,
    1,
  ),
);
