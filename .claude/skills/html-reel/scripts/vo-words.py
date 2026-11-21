#!/usr/bin/env python3
"""The voice: ElevenLabs text-to-speech with timestamps, saved as an MP3,
as its words, [[word, start, end], ...] in seconds, read off the character
alignment the API returns with the sound, and as the whole reply (beside
the words, <words>.reply.json), so the words can be made again without
paying again. A faceless reel's final voice, or the scratch voice scenes
are animated to before the creator's takes (timemap.py maps one onto the
other). It prints the pace: plan the next script's length on it.

Usage:
  vo-words.py --text-file script.txt --voice-id VOICE [--model eleven_multilingual_v2]
              [--out voice.mp3] [--words words.json] [--env-file .env]
              [--stability 0.5] [--similarity 0.9] [--style 0.2] [--no-speaker-boost] [--speed 1.0]
  vo-words.py --from-response response.json --words words.json   (no API call)

The key comes from the environment's ELEVENLABS_API_KEY, or from a KEY=value
line in --env-file. It is sent to api.elevenlabs.io and never printed. A call
spends ElevenLabs credits by the length of the text. --from-response turns a
saved JSON reply (its "alignment") into words without calling anything.
Each word is printed with its times; a pause over --gap seconds (0.25) before
a word is marked, since those are where a scene's beats can land.
Python 3 standard library only."""
import argparse, base64, json, os, re, sys, urllib.error, urllib.request

API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'


def words_from_alignment(a):
    """Characters with start and end times -> [[word, start, end], ...]: a word
    is a run of non-space characters, from its first character's start to its
    last one's end, rounded to the millisecond."""
    words, cur, s0, pe = [], '', 0.0, 0.0
    for c, s, e in zip(a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']):
        if c.isspace():
            if cur:
                words.append([cur, round(s0, 3), round(pe, 3)])
                cur = ''
        else:
            if not cur:
                s0 = s
            cur += c
            pe = e
    if cur:
        words.append([cur, round(s0, 3), round(pe, 3)])
    return words


def read_key(env_file):
    key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if key or not env_file:
        return key
    with open(env_file) as f:
        for line in f:
            m = re.match(r'\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*(.*)$', line)
            if m:
                key = m.group(1).strip().strip('"').strip("'")
    return key


def show(words, gap):
    prev = 0.0
    for w, s, e in words:
        mark = f'   <pause {s - prev:.2f} s>' if s - prev > gap else ''
        print(f'{s:7.3f} {e:7.3f}  {w}{mark}')
        prev = e


def main():
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split('\n\n', 1)[1])
    p.add_argument('--text-file', help='the script, as plain text')
    p.add_argument('--voice-id', help='the ElevenLabs voice id')
    p.add_argument('--model', default='eleven_multilingual_v2')
    p.add_argument('--out', help='the sound (default voice.mp3; with --from-response, written only when given)')
    p.add_argument('--words', default='words.json', help='the words, [[word, start, end], ...] (default words.json)')
    p.add_argument('--format', default='mp3_44100_128', help='output_format (default mp3_44100_128)')
    p.add_argument('--env-file', help='a file with an ELEVENLABS_API_KEY=... line, read when the environment has none')
    p.add_argument('--stability', type=float, default=0.5)
    p.add_argument('--similarity', type=float, default=0.9, help='similarity_boost')
    p.add_argument('--style', type=float, default=0.2)
    p.add_argument('--no-speaker-boost', action='store_true', help='turn use_speaker_boost off')
    p.add_argument('--speed', type=float, help='voice speed (sent only when given)')
    p.add_argument('--gap', type=float, default=0.25, help='mark pauses longer than this (s)')
    p.add_argument('--from-response', help='a saved with-timestamps JSON reply: make the words from it, no API call')
    o = p.parse_args()

    if o.from_response:
        with open(o.from_response) as f:
            d = json.load(f)
    else:
        if not o.text_file or not o.voice_id:
            p.error('--text-file and --voice-id are needed (or --from-response)')
        key = read_key(o.env_file)
        if not key:
            sys.exit('no ELEVENLABS_API_KEY in the environment' + (f' or in {o.env_file}' if o.env_file else ' (pass --env-file)'))
        text = open(o.text_file).read().strip()
        vs = {'stability': o.stability, 'similarity_boost': o.similarity, 'style': o.style, 'use_speaker_boost': not o.no_speaker_boost}
        if o.speed is not None:
            vs['speed'] = o.speed
        body = {'text': text, 'model_id': o.model, 'voice_settings': vs}
        req = urllib.request.Request(API.format(voice=o.voice_id, fmt=o.format), data=json.dumps(body).encode(),
                                     headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=300))
        except urllib.error.HTTPError as e:
            sys.exit(f'ElevenLabs answered {e.code}: {e.read().decode(errors="replace")[:600]}')
        o.out = o.out or 'voice.mp3'
        # The whole reply, for --from-response: the words again for free.
        reply = re.sub(r'\.json$', '', o.words) + '.reply.json'
        with open(reply, 'w') as f:
            json.dump(d, f)
        print(f'reply: {reply}')
    if o.out and d.get('audio_base64'):
        with open(o.out, 'wb') as f:
            f.write(base64.b64decode(d['audio_base64']))
        print(f'sound: {o.out}')
    a = d.get('alignment') or d.get('normalized_alignment')
    if not a:
        sys.exit('the reply has no alignment')
    words = words_from_alignment(a)
    with open(o.words, 'w') as f:
        json.dump(words, f)
    show(words, o.gap)
    if words:
        spoken = words[-1][2] - words[0][1]
        print(f'{len(words)} words, {words[-1][2]:.2f} s, {len(words) / max(spoken, 0.1):.2f} words a second -> {o.words}')
    else:
        print('no words')


if __name__ == '__main__':
    main()
