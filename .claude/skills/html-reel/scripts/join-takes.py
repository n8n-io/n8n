#!/usr/bin/env python3
"""One talking track (camera and voice) from phone takes: the segments kept,
in order, each cut from its take with a short fade on its sound so the joins
don't click, and "pad" segments that hold a frame in silence (a beat for a
reveal while the camera is hidden). Writes the video, optionally its voice
as a WAV, and edl.json: each segment's place on the new clock, which the
words and the scenes are then timed against.

Usage:
  join-takes.py --take take1=take1.mp4 --take take2=take2.mp4
                (--segments segs.json | --seg take1:0.62:4.21 --seg pad:0.8 ...)
                [--out master.mov] [--wav voice.wav] [--edl edl.json]
                [--fade 0.015] [--fps 30] [--size 1080x1920] [--crf 17]
  join-takes.py --gaps take1-words.json [--longer 0.45] [--take take1=take1.mp4]

segs.json is [["take1", in, out], ["pad", 0.8], ...] (seconds of the take).
A pad holds the frame just before the previous segment's out (the next
one's in when it comes first). Video is scaled and centre-cropped to --size
at --fps; sound is mono 48 kHz. A .mov keeps the sound as PCM, anything else
gets AAC. edl.json is {"segments": [{"take", "in", "out", "at", "dur"} or
{"pad": true, "at", "dur"}], "duration"}.

--gaps lists the pauses longer than --longer seconds between a take's words
([[word, start, end], ...], fil-words.py makes them), the places worth
cutting; with the take's file (one --take), it also lists the silences
measured from its sound (ffmpeg silencedetect at -35 dB), which catch the
pauses a transcript's word ends hide. Needs ffmpeg on PATH. Python 3
standard library only."""
import argparse, json, os, re, subprocess, sys


def parse_segs(o):
    if o.segments:
        with open(o.segments) as f:
            d = json.load(f)
        return [tuple(s) for s in (d['segments'] if isinstance(d, dict) else d)]
    segs = []
    for s in o.seg:
        p = s.split(':')
        segs.append(('pad', float(p[1])) if p[0] == 'pad' else (p[0], float(p[1]), float(p[2])))
    return segs


def join(o, takes, segs):
    W, H = (int(x) for x in o.size.lower().split('x'))
    names = sorted({s[0] for s in segs if s[0] != 'pad'})
    missing = [n for n in names if n not in takes]
    if missing:
        sys.exit(f'no --take for {", ".join(missing)}')
    idx = {n: i for i, n in enumerate(names)}
    inputs = sum((['-i', takes[n]] for n in names), [])
    fit = f'fps={o.fps},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1'
    parts, maps, t, F = [], [], 0.0, o.fade
    for k, s in enumerate(segs):
        if s[0] == 'pad':
            d = s[1]
            near = next((x for x in reversed(segs[:k]) if x[0] != 'pad'), None)
            if near:
                i, a, b = idx[near[0]], max(0, near[2] - 0.05), near[2]
            else:
                near = next(x for x in segs[k:] if x[0] != 'pad')
                i, a, b = idx[near[0]], near[1], near[1] + 0.05
            parts.append(f'[{i}:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS,{fit},trim=end_frame=1,'
                         f'tpad=stop_mode=clone:stop_duration={d},trim=duration={d}[v{k}]')
            parts.append(f'anullsrc=r=48000:cl=mono,atrim=duration={d}[a{k}]')
            maps.append({'k': k, 'pad': True, 'at': round(t, 4), 'dur': d})
        else:
            take, a, b = s
            i, d = idx[take], b - a
            parts.append(f'[{i}:v]trim=start={a}:end={b},setpts=PTS-STARTPTS,{fit}[v{k}]')
            parts.append(f'[{i}:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=mono,'
                         f'afade=t=in:d={F},afade=t=out:st={max(0, d - F):.3f}:d={F}[a{k}]')
            maps.append({'k': k, 'take': take, 'in': a, 'out': b, 'at': round(t, 4), 'dur': round(d, 4)})
        t += maps[-1]['dur']
    n = len(segs)
    parts.append(''.join(f'[v{k}][a{k}]' for k in range(n)) + f'concat=n={n}:v=1:a=1[v][a]')
    acodec = ['pcm_s16le'] if o.out.lower().endswith(('.mov', '.mkv')) else ['aac', '-b:a', '256k']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(parts), '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', o.preset, '-crf', str(o.crf), '-pix_fmt', 'yuv420p', '-r', str(o.fps),
                    '-c:a', *acodec, o.out], check=True)
    if o.wav:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', o.out, '-vn', '-c:a', 'pcm_s24le', o.wav], check=True)
    edl = o.edl or os.path.join(os.path.dirname(os.path.abspath(o.out)), 'edl.json')
    with open(edl, 'w') as f:
        json.dump({'segments': maps, 'duration': round(t, 4)}, f, indent=1)
    real = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', o.out], capture_output=True, text=True).stdout.strip()
    print(f'{n} segments, {t:.3f} s on the edl ({real} s in the file) -> {o.out}, {edl}' + (f', {o.wav}' if o.wav else ''))
    for m in maps:
        print(f"  {m['at']:7.3f} +{m['dur']:.3f}  " + ('pad' if m.get('pad') else f"{m['take']} {m['in']}–{m['out']}"))


def gaps(o, takes):
    with open(o.gaps) as f:
        words = [(w[0], float(w[1]), float(w[2] if len(w) > 2 else w[1])) for w in json.load(f)]
    found = [(words[i][2], words[i + 1][1], words[i][0], words[i + 1][0]) for i in range(len(words) - 1) if words[i + 1][1] - words[i][2] > o.longer]
    print(f'{len(found)} pauses over {o.longer} s between words:')
    for a, b, w0, w1 in found:
        print(f'  {a:7.3f} → {b:7.3f}  {b - a:.2f} s   after “{w0}”, before “{w1}”')
    if len(takes) == 1:
        path = next(iter(takes.values()))
        err = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-i', path, '-vn', '-af', f'silencedetect=noise=-35dB:d={o.longer}', '-f', 'null', '-'],
                             capture_output=True, text=True).stderr
        st = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', err)]
        en = [float(x) for x in re.findall(r'silence_end: (-?[\d.]+)', err)]
        print(f'{len(st)} silences over {o.longer} s in the sound of {os.path.basename(path)} (-35 dB):')
        for a, b in zip(st, en + [None] * (len(st) - len(en))):
            before = [w for w in words if w[1] < a + 0.05]
            after = [w for w in words if w[1] >= a + 0.05]
            ctx = f"   after “{before[-1][0]}”" if before else ''
            ctx += f", before “{after[0][0]}”" if after else ''
            print(f'  {a:7.3f} → ' + (f'{b:7.3f}  {b - a:.2f} s' if b is not None else 'end') + ctx)


def main():
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split('\n\n', 1)[1])
    p.add_argument('--take', action='append', default=[], metavar='NAME=PATH', help='a take and its name (repeatable)')
    p.add_argument('--segments', help='[["take1", in, out], ["pad", 0.8], ...]')
    p.add_argument('--seg', action='append', default=[], metavar='TAKE:IN:OUT|pad:DUR', help='a segment (repeatable, in order)')
    p.add_argument('--out', default='master.mov')
    p.add_argument('--wav', help='also write the voice here (24-bit WAV)')
    p.add_argument('--edl', help='where the edl goes (default edl.json beside --out)')
    p.add_argument('--fade', type=float, default=0.015, help='sound fade at each join (s)')
    p.add_argument('--fps', type=int, default=30)
    p.add_argument('--size', default='1080x1920')
    p.add_argument('--crf', type=int, default=17)
    p.add_argument('--preset', default='slow', help='libx264 preset')
    p.add_argument('--gaps', metavar='WORDS', help='list a take\'s pauses instead of joining')
    p.add_argument('--longer', type=float, default=0.45, help='with --gaps: pauses longer than this (s)')
    o = p.parse_args()
    takes = dict(t.split('=', 1) for t in o.take)
    if o.gaps:
        return gaps(o, takes)
    segs = parse_segs(o)
    if not segs:
        p.error('no segments: --segments or --seg')
    join(o, takes, segs)


if __name__ == '__main__':
    main()
