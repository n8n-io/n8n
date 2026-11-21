# Assembling in Fil's video editor over MCP

Fil's video editor (a Video edit node) cuts canvas videos, pictures, sounds, HTML scenes and words into one video. Over MCP: `make_video` makes one, `get_video` reads it, `edit_video` changes it with commands, `export_video` makes the MP4. All free but captions. Install Fil's MCP from fil.design/for-agents.

## The story and what plays over it

- **The story** is the run of scenes on the timeline: videos and pictures meeting end to start, magnetic. Trimming a scene's end moves the ones after it; removing one closes the gap; a scene dropped onto another goes in at the nearest cut.
- **Over the story** (an overlay): a video or picture added with `overlay: true` plays on top where it's put and stays there. Camera placeholders, the bubble, a split's half, cards and folders are all overlays. Trimming, replacing or removing an overlay never moves the scenes. `get_video` marks them `over: true`; `set: { over: true }` turns a scene into one, `false` back.
- Lanes stack in the order things were added: a higher lane draws over the ones under it. Fix the order with `{"op":"lane","lane":"…","above":"…"}`.

## The creator's placeholder in the camera layouts

The placeholder is a 9:16 backlit studio silhouette (in Fil: an image node, Nano Banana editing a photo of the creator or of any model, "a backlit studio silhouette photograph, lit only from behind against a softly glowing warm cream backdrop, the face in shadow with its features faint, head and shoulders looking straight into the lens, the nose at the frame's centre"). The ink drawing it replaced works the same way. Add it over the story with `overlay: true` once per layout, `motion: null`, then `set`:

| layout | set |
| --- | --- |
| full camera | `fit: "fill"`, `scale: 1`, `y: 0`: it covers the frame, the silhouette's nose at y 960, where the captions sit on the seam. Give its time a caption range under the chin instead of moving the face (Captions, below), so a take that replaces it (an upright phone take frames the same at `scale: 1`, `y: 0`) needs no reframing |
| bubble, bottom right (268 × 375) | `fit: "fit"`, `crop: [0.18, 0.12, 0.815, 0.62]`, `scale: 0.248`, `x: 315`, `y: 300`, `corner_radius: 30` |
| the bottom half (split) | `fit: "fit"`, `crop: [0, 0.15, 1, 0.65]`, `scale: 1`, `y: 480` |
| the top half (the ask) | the same, `y: -480` |

Use the one full picture in every layout, cropped by `set`, rather than pictures cut to each layout's shape: a cut bubble or half can't grow back to full frame for a shrink, and a take replaces the full drawing with the same crops. The drawing's face sits a little above the middle, so the halves' crop keeps the head and shoulders.

Before laying it in, preview the whole reel locally (`scripts/preview-reel.mjs`, its plan using these same layouts and set values): a wrong crop or a caption on a face shows in a minute there.

The shrink from full to the bubble: the bubble's settings with keyframes on `scale` (1.27 → 0.248), `x` (0 → 315) and `y` (0 → 300) over 0.35 s, eased; at 1.27 the cropped box covers the frame. The picture under a half is framed for it (frame-video's `"box": "top"`). When the takes come in, `{"op":"replace","clip":…,"node":<take>}` swaps each placeholder for the take and keeps its crop, place, length and keyframes; an upright 1080 × 1920 take frames the same as the drawing.

## The hook over its video

A hook whose big type sits over the demo is made locally: the demo as boxed or full pieces (`frame-video.mjs`) with the type as a see-through layer over them (`render-frames.mjs --alpha`, `--overlay`), one picture. A full-frame `insert` covers the video, so it's for a title card on its own ground, not type over moving footage.

## The cover

A reel's cover is its first frame: the grids, the feed before it plays and the video edit's node on Fil's canvas all show it (the node draws the edit's frame at 0 s until it's exported, then the export's). So the picture opens on its cover: `frame-video.mjs --cover 3.6` holds the hook's best moment (its whole title landed over its best picture) for the first 0.2 s, or `HTMLReel.scene({ cover })` in a full HTML hook. In the edit:

- nothing over it at 0 s but what the cover needs: the camera layouts start after the hook;
- no caption on it: `{"op":"caption","caption":<the first>,"start":0.2}` when the voice starts sooner;
- an existing picture made cover-first: put the new one in with `replace` (it keeps its place, mute and captions), then `remove_node` the old one;
- for the platforms' own cover upload, save the export's first frame (`ffmpeg -i reel.mp4 -frames:v 1 cover.jpg`).

## A faceless reel

The picture is made locally (`frame-video.mjs` with its title layer, plus any full HTML scenes), so the edit is simple:

1. Upload the picture (one MP4: frame-video's body with its titles, opening on its cover) and the voice (`upload_file`, then `add_file` to put them on the canvas), and the documents (`add_document`: Source.md, Look.md, the script).
2. `make_video` from the picture node, shape 9:16, then `add` the voice node at 0 on its own lane with `set: { sound: "voice" }`, and `set` the picture `mute: true`. With the creator in it, lay in the placeholder (above).
3. Sound effects at their absolute times, volume 0.1–0.2.
4. Captions under the framed video. Mute the picture clip first (a soundless video still counts as a sound to transcribe and doubles the price), then `generate` (price first with `max_credits: 0`), then a look from Look.md: `position: "middle"` with an `offset`, which moves the caption's centre down from the frame's middle (y 960 of 1920); one line is 1.28 × its size tall. Under frame-video's default box (its bottom at y 1295): `size: 66, max_lines: 1, offset: 400` puts the line at about y 1320–1400. Up to 3 words, the spoken word in the accent, a font from the source's family.
   - An uploaded voice is transcribed, not aligned to a script: names and numbers come out as heard ("Canberg", "Morludo"). Fix each with `{"op":"caption", …, "text"}`.
   - Splitting, rewording or removing a caption renumbers them: read `get_video` with `captions: "list"` again before the next caption command. A removal also stretches the line before it over the gap ("HTML file." ran on under the next card): set that line's `end` back.
   - Remove the lines under big type that says the same words (the hook, a credit, the ask) (`{"op":"caption","caption":…,"remove":true}`): the type already says them. A full-frame face keeps its lines, under the chin: a caption range for its time (Captions, below). A line on the split's seam may cover the top video's bottom edge; that's fine.
   - For a local preview with the same sounds, Fil's sound effects are at `https://fil.design/video-kit/3/sfx/<id>.mp3` (`click`, `pop-soft`, `toggle`, `ting`…).
5. Chapters for the beats, then export.
6. A re-rendered picture: upload it, `add_file`, `{"op":"replace","clip":…,"node":…}` (the clip keeps its place, its mute and the captions), then `remove_node` the old one.

## Building a draft with the camera

1. `make_video` from the scenes in order (the hook's render, the screen recordings, the tail's render), 9:16.
2. The scratch voice on its own lane (`add` the audio node at 0), `sound: "voice"`.
3. Camera placeholders as overlays: a drawing of the creator at full frame, in the bubble, in the bottom half, each added with `overlay: true` at its time and `dur`. When the takes land, `{"op":"replace","clip":…,"node":…}` swaps each for the real take, keeping its place, length and keyframes.
4. Pictures: `scale: 1` covers the frame. A card, a bubble or a half needs `fit: "fit"`, then scale from there (a 268 px bubble from a 536 × 750 PNG is scale 0.248).
5. A rounded camera bubble (268 × 375 at the bottom right of a 9:16 frame): add the take with `overlay: true`, then `{"op":"set","clip":…,"set":{"fit":"fit","crop":[0.2,0.25,0.8,0.72],"scale":0.248,"x":315,"y":300,"corner_radius":30}}`. The crop cuts the bubble's 5:7 shape around the face (for an upright 1080 × 1920 take; a 16:9 take is `[0.3,0,0.702,1]`); with `fit: "fit"` the cropped box fills the frame's width at scale 1, so 0.248 makes it 268 px wide; `x`/`y` are from the frame's middle in frame pixels. The box gets a soft shadow; a square crop with `corner_radius` half its width is a circle. Keyframes on `x`, `y` and `scale` animate the shrink from full frame.
6. Sound effects from Fil's inserts: `{"op":"add","insert":"whoosh-soft","at":2.09,"set":{"volume":0.14}}` (also `swish`, `ting`, `click`, `pop`, `pop-soft`, `swipe`, `typing`, `impact`). 0.1–0.2 volume, on real events. Add them last, at absolute times.
7. Words: `{"op":"add","text":"…","style":"…"}` over a clip with `over`. Text `position: "t"` plus `y` is offset from the top spot.
8. Chapters, one per section: `{"op":"chapters","chapters":[{"at":0,"name":"Hook"},{"at":4.74,"name":"Twist"},…]}`.

## Captions

- `{"op":"captions","generate":true}` with `max_credits` (0 first, for the price): made from what's said (a Fil voiceover is aligned to its own script; anything else is transcribed).
- For word times: generate with `look: { max_words: 1 }`, then `get_video` with `captions: "list"`: one line per word, `- id · start–end s · “word”`. `scripts/fil-words.py` turns that into a words file. Set `max_words` back to 3 afterwards.
- The cinematic look (the default): Inter Tight 78 px, weight 800, white, the spoken word in the accent (#efb36c in the shipped reel), a 5 px outline in #08080a, position `middle` (on the split's seam, offset 0), animation `words`, up to 3 words and 22 characters on one line. Take the font from the source when Fil's caption list has its heavy face (Geist, Space Grotesk, Archivo, Funnel Display…), never smaller than about 70 px.
- Fix the transcription's slips one by one with `{"op":"caption","caption":…,"text":…}` (names, the product, "fil dot design" → "fil.design").
- Under the chin on full camera: one range per full-frame beat, all in one command (each `ranges` replaces the ones before; `[]` takes them off): `{"op":"captions","ranges":[{"start":6.23,"end":7.33,"position":"bottom","offset":-380},{"start":25.65,"end":27.1,"position":"bottom","offset":-380}]}`. Each range runs from the cut that brings the full frame in to the one that takes it out (the shrink to the bubble's end, the split's flip); a caption showing across a cut moves with it. Bottom puts a 78 px line's centre at 1920 − 144 − 50 − 14 = y 1712, so −380 is y 1332, under the drawing's chin at scale 1. `get_video` lists the ranges after the caption look; they stay on their scenes when the edit is trimmed or cut. One caption alone: `{"op":"caption","caption":…,"position":"bottom","offset":-380}` (`"position":"default"` puts it back). `scripts/preview-reel.mjs` takes the same `ranges` in its plan's `captions`.

## The voice

- Every recording made in Fil is cleaned by default (background noise out, studio sound, even loudness), the original kept. A take recorded before that can be cleaned with `update_node` `clean_now: true` (price first with `max_credits: 0`).
- In the editor, Studio Sound on one clip: select it › Inspector › Studio Sound (⚡2). It's tied to the file, and the export carries it.
- The export is normalised to −14 LUFS by default (`{"op":"settings","loudness":…}`).

## Record on your phone

- The script is a canvas document. `#` headings and `[directions]` show on the phone but aren't read, so the word count it reports should equal the words spoken (99 for the shipped reel).
- No MCP tool makes a camera recording node: on the canvas, + › Record › On your phone. It drops at the view's centre (move it with `update_node`) and opens a dialog with a QR code and a fil.design/r/… link.
- The script, the prompter and Follow my voice live on the node (`update_node` `script_doc` or `script_text`), the same in every window and on the phone. Pick the document before you hand over the link.
- The link works on the first device that opens it, for 2 hours after the last take. A link pasted in chat opens in the agent's browser pane when clicked and is claimed there. Send the QR code as an image to scan; never open the link to test it. Reopen it from the node's Show the code.
- Follow my voice costs ⚡1 per 1.5 minutes: leave it to the creator.
- Each take lands as its own node (Take 2, Take 3…).

## Exporting

- `export_video` renders in whichever Fil window has the canvas open, and lands the MP4 on the node.
- A window opened before the uploads may claim the job and fail with "This file isn't available" (it doesn't have the new files). Close it, or open the edit in a fresh tab and use Export › Save to canvas, then read the link with `get_video`.
- Download the MP4 and check it (`scripts/verify-export.mjs`): frames every 0.5 s, loudness, lip sync.

## Traps that cost exports

- Pictures added as overlays used to get a slow push (`motion: "in"`): overlays now come in still; a picture in the story still gets one, so set `motion: null` on any picture that must hold still.
- Closing a gap (`remove` with the default `close_gap`) moves everything after the gap, sound effects too. Remove with `close_gap: false`, or move the effects to their absolute times afterwards.
- `replace` keeps a clip's length: a take shorter than its placeholder shortens it, and the scenes after it move up when it's in the story.
- Guessed positions from the docs were wrong twice. Read `get_video` after each command, and look at a downloaded frame before calling a layout done.
