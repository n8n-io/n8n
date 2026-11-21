#!/usr/bin/env python3
"""Find the macOS hand cursor in a screen recording and paint it out, so a
post's demo video goes into a reel without it. In the drafts of two reels
made from screen recordings of 3D scenes, all four blind judges named the
hand cursor first.

The cursor is found by its own picture: templates cut from real recordings
(scripts/cursors/: the grab hand and the open hand, white with a black
outline). Recordings zoom, so each is searched at six sizes (0.8 to 1.4). A
place counts by how it looks, not by the match score: q is the smaller of
the share of the white fill above 190 and the share of the outline ring
below 75, sure at 0.55 if the place also looks like the hand's picture
(zero-mean correlation inside its mask, 0.5 or more) and isn't a short run
off the cursor's path between the sure finds either side (a paper lantern,
cream with a dark edge, passed both tests for a frame; a cursor doesn't
jump 700 px and straight back). Each frame is searched first near the last
find, at full size, then anywhere at a quarter size. Gaps of up to 16
frames (at 30 fps) between two sure finds less than 700 px apart, a fast
cursor blurred by its motion, are filled in between them and painted
wider, and each run of sure finds is followed out through the frames next
to it found at 0.5 or more (a span that starts mid-move has no sure find
before it). The paint is OpenCV's Telea inpaint over the hand grown about
10 px past its outline, which takes its soft shadow with it.

Usage:
  decursor.py scan  src.mp4 track.json [from to ...] [--pieces pieces.json] [--scale 1]
  decursor.py sheet src.mp4 track.json [--out decursor-sheet.jpg]
  decursor.py clean src.mp4 track.json [--out src-clean.mp4]
  decursor.py test  frame.png ...
  decursor.py template frame.png x y w h name

scan finds it, only in the spans the reel uses (pairs of seconds, or every
piece of frame-video's pieces.json on this video), and writes each frame's
find. sheet tiles finds before and after the paint (* marks a filled gap):
look at it before cleaning. clean writes the whole video with the cursor
painted out, at the source's frame rate and colours, with its sound, for
frame-video.mjs --video src-clean.mp4. --scale sizes the search for a
recording whose cursor is bigger or smaller than these templates' (the
grab hand is about 60 px wide in them; a 1280-wide copy of their 1920-wide
recordings takes 0.667).
template cuts another cursor from a frame (white, outlined dark, like the
hands; box x y w h in the frame's pixels, a few px past the outline) into
scripts/cursors/<name>.png, and every later scan looks for it too.

Needs ffmpeg, OpenCV and numpy. The Mac has no OpenCV or numpy of its own:
make a venv once,
  python3 -m venv ~/.venvs/decursor
  ~/.venvs/decursor/bin/pip install opencv-python-headless numpy
and run this with ~/.venvs/decursor/bin/python.
"""
import argparse, json, os, subprocess, sys, time
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    sys.exit('decursor.py needs OpenCV and numpy. Make a venv once:\n'
             '  python3 -m venv ~/.venvs/decursor\n'
             '  ~/.venvs/decursor/bin/pip install opencv-python-headless numpy\n'
             'then run it with ~/.venvs/decursor/bin/python ' + ' '.join(sys.argv))

CURSORS = Path(__file__).resolve().parent / 'cursors'
SIZES = [0.8, 0.9, 1.0, 1.12, 1.25, 1.4]
SURE, NEAR, SHAPE = 0.55, 0.5, 0.5  # q for a sure find; q to follow one; shape for a sure one
K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))


# ---- the video, through ffmpeg both ways, so its colours come back as they went in

def probe(video):
    s = json.loads(subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=width,height,r_frame_rate,color_space,color_primaries,color_transfer,color_range', '-of', 'json', video],
        capture_output=True, text=True, check=True).stdout)['streams'][0]
    n, d = s['r_frame_rate'].split('/')
    s['fps'] = float(n) / float(d)
    # The matrix and range ffmpeg reads an untagged video with (BT.601, limited), named.
    s['matrix'] = {'bt709': 'bt709', 'smpte170m': 'smpte170m', 'bt470bg': 'bt470',
                   'bt2020nc': 'bt2020', 'bt2020c': 'bt2020'}.get(s.get('color_space'), 'bt601')
    s['range'] = 'pc' if s.get('color_range') == 'pc' else 'tv'
    return s


def frames(video, info, until=None):
    """Every frame as BGR at the video's own constant rate, numbered from 0."""
    w, h = info['width'], info['height']
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', video] + (['-t', f'{until:.3f}'] if until else []) +
                         ['-vf', f"fps={info['r_frame_rate']},scale=in_color_matrix={info['matrix']}:in_range={info['range']}:flags=accurate_rnd+full_chroma_int,format=bgr24",
                          '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    size, i = w * h * 3, 0
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield i, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
            i += 1
    finally:
        p.stdout.close()
        p.kill()
        p.wait()


# ---- the cursors

def core(g):
    """A template's white fill: the bright part nearest its centre, closed."""
    h, w = g.shape
    n, lab, stats, cent = cv2.connectedComponentsWithStats((g > 215).astype(np.uint8))
    best, bd = 0, 1e9
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 300:
            continue
        d = (cent[i][0] - w / 2) ** 2 + (cent[i][1] - h / 2) ** 2
        if d < bd:
            best, bd = i, d
    if not best:
        raise ValueError('no white fill of 300 px or more near the middle')
    return cv2.morphologyEx((lab == best).astype(np.uint8) * 255, cv2.MORPH_CLOSE, K(9))


def variants(scale=1.0):
    """Every cursor at every size: its picture, its mask (the fill grown past
    the outline and its shadow), the outline's ring and the fill inside it."""
    out = []
    for path in sorted(CURSORS.glob('*.png')):
        g = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        c = core(g)
        for size in SIZES:
            s = size * scale
            gs = cv2.resize(g, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
            cs = (cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_NEAREST) > 0).astype(np.uint8) * 255
            mask = cv2.dilate(cs, K(max(11, int(21 * s)) | 1))
            ys, xs = np.nonzero(mask)
            sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
            v = {'name': path.stem, 'size': size, 'gray': gs[sl], 'mask': mask[sl],
                 'ring': (cv2.dilate(cs, K(7)) & ~cv2.dilate(cs, K(3)))[sl] > 0,
                 'inner': cv2.erode(cs, K(5))[sl] > 0}
            flat = v['gray'][v['mask'] > 0].astype(np.float32)
            v['flat'] = flat - flat.mean()
            v['flat2'] = float((v['flat'] ** 2).sum())
            v['g4'] = cv2.resize(v['gray'], None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
            v['m4'] = cv2.resize(v['mask'], None, fx=0.25, fy=0.25, interpolation=cv2.INTER_NEAREST)
            out.append(v)
    if not out:
        sys.exit(f'no cursor templates in {CURSORS}')
    return out


def quality(g, v, x, y):
    h, w = v['gray'].shape
    p = g[y:y + h, x:x + w]
    if p.shape != (h, w):
        return 0, 0, 0
    white = float((p[v['inner']] > 190).mean())
    dark = float((p[v['ring']] < 75).mean())
    return min(white, dark), white, dark


def shape(g, v, x, y):
    """How much the place looks like the cursor's picture: zero-mean
    correlation inside its mask, 1 for the same picture. Real hands scored
    0.49 to 0.96 (all but one of 1,680 at 0.5 or more); a white thing with
    a dark edge can pass q without looking like a hand."""
    h, w = v['gray'].shape
    p = g[y:y + h, x:x + w]
    if p.shape != (h, w):
        return 0.0
    a = p[v['mask'] > 0].astype(np.float32)
    a -= a.mean()
    return float((a * v['flat']).sum() / (np.sqrt(float((a * a).sum()) * v['flat2']) + 1e-6))


def refine(g, V, k, X, Y, r, best):
    for dx in range(-r, r + 1, 2):
        for dy in range(-r, r + 1, 2):
            x, y = max(0, X + dx), max(0, Y + dy)
            q, white, dark = quality(g, V[k], x, y)
            if q > best['q']:
                best = {'v': k, 'x': x, 'y': y, 'q': round(q, 3), 'white': round(white, 3), 'dark': round(dark, 3)}
    return best


def near(V, k):
    """Every cursor at its size, a size smaller and a size larger: a grab
    let go turns into the open hand, and a blurred find's size is a guess."""
    n = len(SIZES)
    si = k % n
    return [o * n + j for o in range(len(V) // n) for j in (si - 1, si, si + 1) if 0 <= j < n]


def match(img, tpl, mask):
    r = cv2.matchTemplate(img, tpl, cv2.TM_CCORR_NORMED, mask=mask)
    return cv2.minMaxLoc(np.nan_to_num(r, nan=0, posinf=0, neginf=0))[3]


def find(frame, V, last=None, scale=1.0):
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cands = []

    def look(k, X, Y, r):
        b = refine(g, V, k, X, Y, r, {'q': 0})
        if 'v' in b:
            b['shape'] = round(shape(g, V[k], b['x'], b['y']), 3)
            cands.append(b)

    def pick():
        """The best that looks like a hand, else the best q (a blurred hand, or not one)."""
        ok = [b for b in cands if b['q'] >= NEAR and b['shape'] >= SHAPE]
        return max(ok or cands or [{'q': 0}], key=lambda b: b['q'])

    if last:
        # Where it was a frame ago: a window round it, at full size, the cursors like it.
        k0, x0, y0 = last
        H, W = g.shape
        X0, Y0 = max(0, x0 - int(90 * scale)), max(0, y0 - int(90 * scale))
        win = g[Y0:min(H, y0 + int(200 * scale)), X0:min(W, x0 + int(200 * scale))]
        for k in near(V, k0):
            th, tw = V[k]['gray'].shape
            if win.shape[0] >= th and win.shape[1] >= tw:
                x, y = match(win, V[k]['gray'], V[k]['mask'])
                look(k, X0 + x, Y0 + y, 2)
        best = pick()
        if best['q'] >= NEAR and best['shape'] >= SHAPE:
            return best
    # Anywhere: a quarter size, every cursor, each one's best place refined at full size.
    g4 = cv2.resize(g, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    for k, v in enumerate(V):
        x, y = match(g4, v['g4'], v['m4'])
        look(k, x * 4, y * 4, 4)
    return pick()


# ---- scan, plan, paint

def pieces_spans(path, video):
    """The source spans of frame-video's pieces that play this video."""
    here = os.path.abspath(video)
    return [(p['from'], p['to']) for p in json.load(open(path))
            if 'from' in p and os.path.abspath(p.get('video', video)) == here]


def scan(video, out, spans, scale):
    info = probe(video)
    fps = info['fps']
    V = variants(scale)
    finds, last, t0 = [], None, time.time()
    pad = 3  # frames past each span's ends
    until = max(b for a, b in spans) + 1 if spans else None
    for i, f in frames(video, info, until):
        if spans and not any(a * fps - pad <= i <= b * fps + pad for a, b in spans):
            continue
        b = find(f, V, last, scale)
        last = (b['v'], b['x'], b['y']) if b['q'] >= NEAR else None
        rec = {'i': i, 'q': b['q']}
        if 'v' in b:
            rec.update(cursor=V[b['v']]['name'], size=V[b['v']]['size'], x=b['x'], y=b['y'],
                       white=b['white'], dark=b['dark'], shape=b['shape'])
        finds.append(rec)
        if len(finds) % 150 == 0:
            print(f'{i / fps:6.1f}s', rec, flush=True)
    track = {'video': os.path.basename(video), 'fps': fps, 'width': info['width'], 'height': info['height'],
             'scale': scale, 'finds': finds}
    json.dump(track, open(out, 'w'))
    P = plan(track, V)
    sure = sum(1 for r in finds if sure_find(r))
    print(f'scanned {len(finds)} frames in {time.time() - t0:.0f} s; sure in {sure}, '
          f'{len(P) - sure} filled in or followed: {len(P)} to paint')


def sure_find(r):
    return r['q'] >= SURE and r.get('shape', 1) >= SHAPE


def plan(track, V):
    """Frame → (variant, x, y, grow): the sure finds, less the ones off the
    cursor's path, the short gaps between two (scanned frames only: the
    frames between two spans are never guessed), and the finds that follow
    on from them."""
    index = {(v['name'], v['size']): k for k, v in enumerate(V)}
    scale, fps = track.get('scale', 1.0), track['fps']
    scanned = {r['i'] for r in track['finds']}
    by = {r['i']: r for r in track['finds'] if sure_find(r) and (r['cursor'], r['size']) in index}
    gap, far, step = round(16 * fps / 30), 700 * scale, 300 * scale
    dist = lambda A, B: abs(A['x'] - B['x']) + abs(A['y'] - B['y'])
    # A cursor doesn't jump 700 px and straight back: a short run of sure
    # finds far off the path between the sure finds either side of it is
    # something else that looks like a hand (a paper lantern, for the two
    # frames the cursor took to change shape). Drop it; the gap fills.
    runs = []
    for i in sorted(by):
        if runs and i - runs[-1][-1] <= gap and dist(by[runs[-1][-1]], by[i]) < step:
            runs[-1].append(i)
        else:
            runs.append([i])
    for p, run, n in zip(runs, runs[1:], runs[2:]):
        a, b = p[-1], n[0]
        A, B = by[a], by[b]
        if len(run) <= 5 and b - a <= gap and dist(A, B) < far and all(
                dist(by[i], {'x': A['x'] + (i - a) / (b - a) * (B['x'] - A['x']),
                             'y': A['y'] + (i - a) / (b - a) * (B['y'] - A['y'])}) >= step for i in run):
            for i in run:
                del by[i]
    hits = sorted(by)
    out = {i: (index[by[i]['cursor'], by[i]['size']], by[i]['x'], by[i]['y'], 0) for i in hits}
    for a, b in zip(hits, hits[1:]):
        A, B = by[a], by[b]
        if 1 < b - a <= gap and dist(A, B) < far and all(i in scanned for i in range(a + 1, b)):
            for i in range(a + 1, b):
                k = (i - a) / (b - a)
                out[i] = (out[a][0], int(A['x'] + k * (B['x'] - A['x'])), int(A['y'] + k * (B['y'] - A['y'])), 1)
    # A fast cursor blurs just under sure where no sure find is on its other
    # side (a span that starts mid-move): follow each run of sure finds out
    # through the frames next to it found at NEAR or more, each close to the
    # last, and paint those wider too.
    found = {r['i']: r for r in track['finds'] if r['q'] >= NEAR and (r.get('cursor'), r.get('size')) in index}
    for i in hits:
        for d in (-1, 1):
            j = i + d
            while j in found and j not in out:
                r, (_, px, py, _) = found[j], out[j - d]
                if dist(r, {'x': px, 'y': py}) >= step:
                    break
                out[j] = (index[r['cursor'], r['size']], r['x'], r['y'], 1)
                j += d
    return out


def paint(f, v, x, y, grow, scale=1.0):
    """Inpaint the cursor's mask at x, y, 4 px wider, and 20 px wider again
    for a filled or followed find. The mask is padded before it grows, or
    the growth stops at its box."""
    g = int(20 * scale) if grow else 0
    p = g + 5
    m = cv2.copyMakeBorder(v['mask'], p, p, p, p, cv2.BORDER_CONSTANT, value=0)
    if grow:
        m = cv2.dilate(m, K(2 * g + 1))
    m = cv2.dilate(m, np.ones((9, 9), np.uint8))
    x, y, (th, tw), (H, W) = x - p, y - p, m.shape, f.shape[:2]
    pad = int(40 * scale)  # what Telea reads round it
    X0, Y0, X1, Y1 = max(0, x - pad), max(0, y - pad), min(W, x + tw + pad), min(H, y + th + pad)
    ax0, ay0, ax1, ay1 = max(x, 0), max(y, 0), min(x + tw, W), min(y + th, H)
    if ax1 <= ax0 or ay1 <= ay0:
        return
    roi = f[Y0:Y1, X0:X1].copy()
    full = np.zeros(roi.shape[:2], np.uint8)
    full[ay0 - Y0:ay1 - Y0, ax0 - X0:ax1 - X0] = m[ay0 - y:ay1 - y, ax0 - x:ax1 - x]
    f[Y0:Y1, X0:X1] = cv2.inpaint(roi, full, 9, cv2.INPAINT_TELEA)


def clean(video, trackfile, out):
    info = probe(video)
    track = json.load(open(trackfile))
    scale = track.get('scale', 1.0)
    V = variants(scale)
    P = plan(track, V)
    tags = []
    for flag, key in (('-colorspace', 'color_space'), ('-color_primaries', 'color_primaries'),
                      ('-color_trc', 'color_transfer'), ('-color_range', 'color_range')):
        if info.get(key) not in (None, 'unknown', 'reserved'):
            tags += [flag, info[key]]
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y',
                           '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f"{info['width']}x{info['height']}",
                           '-r', info['r_frame_rate'], '-i', '-', '-i', video, '-map', '0:v', '-map', '1:a?',
                           '-vf', f"scale=out_color_matrix={info['matrix']}:out_range={info['range']}:flags=accurate_rnd+full_chroma_int,format=yuv420p",
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', *tags,
                           '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    n = i = 0
    for i, f in frames(video, info):
        if i in P:
            f = f.copy()
            k, x, y, grow = P[i]
            paint(f, V[k], x, y, grow, scale)
            n += 1
        ff.stdin.write(f.tobytes())
    ff.stdin.close()
    if ff.wait():
        sys.exit('ffmpeg failed')
    print(f'painted {n} frames of {i + 1}: {out}')


def sheet(video, trackfile, out):
    """About 30 finds evenly through the video and 12 of the filled or
    followed ones, the likeliest to go wrong, before | after."""
    info = probe(video)
    track = json.load(open(trackfile))
    scale = track.get('scale', 1.0)
    V = variants(scale)
    P = plan(track, V)
    if not P:
        sys.exit('no cursor found: nothing to show')
    wide = sorted(i for i in P if P[i][3])
    keys = set(sorted(P)[::max(1, len(P) // 30)]) | set(wide[::max(1, len(wide) // 12)])
    a, b, side = int(40 * scale), int(120 * scale), 160
    tiles = []
    for i, f in frames(video, info, max(keys) / info['fps'] + 1):
        if i not in keys:
            continue
        k, x, y, grow = P[i]
        box = (slice(max(0, y - a), y + b), slice(max(0, x - a), x + b))
        before = cv2.resize(f[box], (side, side))
        f = f.copy()
        paint(f, V[k], x, y, grow, scale)
        t = np.hstack([before, np.full((side, 2, 3), 255, np.uint8), cv2.resize(f[box], (side, side))])
        cv2.putText(t, f"{i / info['fps']:.1f}s{' *' if grow else ''}", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        tiles.append(np.pad(t, ((2, 2), (2, 2), (0, 0))))
    blank = np.zeros_like(tiles[0])
    rows = [np.hstack(tiles[j:j + 6] + [blank] * (6 - len(tiles[j:j + 6]))) for j in range(0, len(tiles), 6)]
    cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f'{len(tiles)} finds, before | after: {out}')


def template(frame, x, y, w, h, name):
    g = cv2.cvtColor(cv2.imread(frame), cv2.COLOR_BGR2GRAY)[y:y + h, x:x + w]
    try:
        core(g)
    except ValueError as e:
        sys.exit(f'{e}: box the cursor tighter, or it isn\'t white with a dark outline like the hands')
    out = CURSORS / f'{name}.png'
    cv2.imwrite(str(out), g)
    print(f'{out} ({w} × {h})')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    sub = ap.add_subparsers(dest='mode', required=True)
    s = sub.add_parser('scan', help='find the cursor, frame by frame')
    s.add_argument('video')
    s.add_argument('track')
    s.add_argument('spans', nargs='*', type=float, help='from to pairs, in seconds of the source')
    s.add_argument('--pieces', help="frame-video's pieces.json: scan the spans it plays of this video")
    s.add_argument('--scale', type=float, default=1.0, help="the cursor's size against the templates'")
    s = sub.add_parser('sheet', help='finds before and after the paint, tiled')
    s.add_argument('video')
    s.add_argument('track')
    s.add_argument('--out', default='decursor-sheet.jpg')
    s = sub.add_parser('clean', help='the video with the cursor painted out')
    s.add_argument('video')
    s.add_argument('track')
    s.add_argument('--out', default='src-clean.mp4')
    s = sub.add_parser('test', help='the best find in each picture')
    s.add_argument('frames', nargs='+')
    s.add_argument('--scale', type=float, default=1.0)
    s = sub.add_parser('template', help='cut another cursor from a frame')
    s.add_argument('frame')
    s.add_argument('box', nargs=4, type=int, metavar='x y w h')
    s.add_argument('name')
    a = ap.parse_args()

    if a.mode == 'scan':
        if len(a.spans) % 2:
            ap.error('spans come in pairs: from to')
        spans = list(zip(a.spans[::2], a.spans[1::2])) + (pieces_spans(a.pieces, a.video) if a.pieces else [])
        scan(a.video, a.track, spans, a.scale)
    elif a.mode == 'sheet':
        sheet(a.video, a.track, a.out)
    elif a.mode == 'clean':
        clean(a.video, a.track, a.out)
    elif a.mode == 'test':
        V = variants(a.scale)
        for p in a.frames:
            b = find(cv2.imread(p), V, scale=a.scale)
            v = V[b['v']] if 'v' in b else {}
            print(p, v.get('name'), v.get('size'), b, 'sure' if 'v' in b and sure_find(b) else 'not found')
    elif a.mode == 'template':
        template(a.frame, *a.box, a.name)
