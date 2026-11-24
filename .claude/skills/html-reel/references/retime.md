# Retiming everything to the real takes

The draft is cut to the scratch voice. The creator's takes say the same words at their own pace: about 10% faster in the shipped reel (37.8 s of scratch voice became 33.4 s of takes). This is how every part follows them.

## 1. Join the takes into one talking track

`scripts/join-takes.py` joins segments of the takes on one clock, a video and a voice:

- Find the pauses worth trimming: `--gaps take1.words.json --longer 0.45` lists every gap over 0.45 s.
- Choose segments (take, in, out) so each line is said once, cleanly; trim the pauses; keep breaths shorter than 0.45 s, they sound natural.
- 15 ms fades on every cut's sound, so no join clicks.
- A held beat after the hook's reveal (`pad:0.8`): the camera is hidden under the hook there, so the beat costs nothing on screen and lets the reveal land.
- Put each join where the layout changes (the bubble's shrink, the split's flip): a cut in a full-frame face shows; a cut under a layout change doesn't.

It writes `edl.json`: each segment's place on the new clock.

## 2. Word times from Fil's captions

Upload the joined voice, add it to the edit, then:

1. `edit_video` `{"op":"captions","generate":true,"look":{"max_words":1}}` (about ⚡1 for 30 s), with `max_credits` (price first with 0).
2. `get_video` with `captions: "list"`, saved to a file.
3. `python3 scripts/fil-words.py captions.txt --out real.words.json`.

The scratch voice's words come from ElevenLabs' character alignment (`scripts/vo-words.py` writes them).

## 3. Anchors: the map W

```bash
python3 scripts/timemap.py --scratch scratch.words.json --real real.words.json \
  --alias open-sourced=open --pair happens:2.65=2.44 --pair jumps:17.67=15.02 --out anchors.json
```

- difflib's SequenceMatcher on normalised words (lowercase, letters and digits) pairs each word said in both; manual `--pair`s add words said differently (a reworded line, a name the transcription missed).
- The map keeps only pairs that move forward in both clocks, so it's monotone.
- `anchors.json` holds `[[real, scratch, word], …]`: τ first, t second, ready for `HTMLReel.scene({ anchors })`.
- `--scene 0:8.6` prints one scene's local anchors (both clocks from its own start) and how long it now lasts; `--at 2.3,4.5` prints where scratch moments land.
- Read its coverage line: the longest stretch without an anchor is where a beat can still drift.

## 4. Render the scenes again

- A scene on reel-clock.js: put its local anchors in `HTMLReel.scene({ anchors })`, render with `node scripts/render-frames.mjs hook.html --out hook.mp4`. It now lasts the real take's length (`__dur`).
- A scene with its own `__frame(t)` on scratch time: `--anchors hook.anchors.json` makes the renderer call `__frame(W(τ))` instead.
- Check the contact sheet against the takes: each title should rise on its word.

## 5. Screen clips: split and speed

A recording can't be re-rendered, so it's cut at its events and each piece is played at its own speed:

1. List the events in the recording (the scrub starts, the step jumps, the resize) and the words they land on.
2. For each piece between events: speed = source span / (W⁻¹ span on the real clock).
3. In Fil: `{"op":"split","clip":…,"at":…}` at each event, then `{"op":"set","clip":…,"set":{"speed":1.47}}` per piece. Speed changes the piece's length on the timeline, so split first, then speed, left to right.
4. Locally: `trim` + `setpts=(PTS-STARTPTS)/speed` per piece, then concat (see `scripts/split-flip.mjs`).

Keep speeds between 0.5 and 2.2 (the shipped pieces ran 1.13–2.07); outside that the motion reads as slow motion or fast-forward.

## 6. The camera layouts

In Fil's editor (since 0.424.0): the take as an overlay over the story (`overlay: true`), `crop` to the face's box, `corner_radius: 30` for the bubble, keyframes on `scale`, `x`, `y` for the shrink and the flip.

Locally, when a layout needs more than that (a zoom inside the half, a corner radius that grows during the shrink):

- `scripts/bubble.mjs`: the full-frame camera shrinks into the rounded bubble (268 × 375 at x 721, y 1072, 30 px corners, a 2 px edge at 55% white) over 0.35 s, eased cubic in-out, drawn per frame with OffscreenCanvas.
- `scripts/split-flip.mjs`: the camera's middle (1080 × 960) in the bottom half, zooming 0.86 → 1 over its first 0.35 s, then sliding to the top half over 0.32 s, cubic in-out, on the offer's first word.

Composite a section locally into one scene when it stacks several of these; keep the voice as its own clip in the edit so the captions and the loudness stay Fil's.

## 7. Finish

- Captions again from the real voice; fix the slips by hand.
- Chapters at the sections' new times (W⁻¹ of the scratch ones, then checked on the words).
- Sound effects moved to their events' new times.
- Export, then `node scripts/verify-export.mjs export.mp4 --raw voice.wav`: −14 LUFS ± 1, frames every 0.5 s, lip sync on a plosive at the start, middle and end, and the high band of the voice below the raw take's (the shipped export's hiss sat 10 dB under the raw voice).
