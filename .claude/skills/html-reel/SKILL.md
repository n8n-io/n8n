---
name: html-reel
description: Turn a tweet, a video, a YouTube video or a landing page into a 9:16 reel (Instagram Reels, TikTok, Shorts) that says what the source says and looks like it, with every cut on a word. Read the source (its words, its media, its measured fonts and colours), pick a structure (a promo, a showcase, "found this", an explainer, before and after), write the script in the creator's voice from the source's own facts, make the voice with timestamps (their cloned ElevenLabs voice), then build the picture from HTML scenes drawn from one clock (window.__frame(t)) in the source's look, opening on its cover (the hook's best moment as the first frame), its demo video framed and cut to words, and assemble it in Fil's video editor over MCP. The creator is in it from the first draft as a placeholder in the camera layouts (a backlit studio silhouette) (full frame, a bubble, half the frame), swapped for their phone takes when they record, and everything retimed to their own words by word anchors, t = W(τ); a reel can also be faceless. Use when someone wants a reel, a short or a vertical video from a post, a thread, a launch, a landing page, a demo video or a YouTube video, "a reel like this one", or a talking-head promo cut to their own delivery.
---

# HTML Reel

**HTML scenes · DreamCut · Fil's video editor over MCP · ffmpeg.** A scene engine without a framework is in `scripts/reel-clock.js`.

A reel is a voice with pictures cut to it. This skill makes one from a source someone already has, a tweet, a landing page, a YouTube video or a video file, so it says what that source says and looks like it: its words become the script, its media the picture, its fonts and colours the titles. Every picture follows the words: a title lands on its word, the demo cuts on the line that names it, a sound effect hits on the reveal. The creator is in it from the first draft, a backlit silhouette standing where their camera goes, so the reel is complete before they record a word; their takes replace it, and because the scenes are HTML drawn from one clock, everything is retimed to their real delivery without animating anything again.

**Boundary.** Use `html-demo` for a live app window on a web page (no video file). Use `browser-video-recording` for a polished screen recording on its own. Use `website-to-motion-design` to turn a page into a fixed-length motion piece with no voice. Use this skill when the deliverable is a vertical video cut to a voice, from a source.

**Provenance.** Extracted from Meng To's launch reel for HTML Demo (fil.design/skills/html-demo), October 2026: a 24.7 s reference reel's eight layouts studied, a scratch voice in his cloned ElevenLabs voice, four DreamCut recordings of the skill page, an HTML hook and tail rendered frame by frame, three drafts in Fil's video editor, two blind judges a round, then his two phone takes cut into one 33.7 s reel on his own word timings, and later one landscape take, its pauses cut, retimed the same way into 37.5 s. Then made general: each of three of his posts (MiniMax landing pages, a reverse-engineered smart home, the Anatomy skill) turned into a reel in its own look, first faceless, then again with a placeholder in the camera layouts (first an ink drawing of him, then a backlit studio silhouette), cinematic type and captions, previewed locally before Fil. The files and numbers below are from those runs.

## The mechanism

**Everything is placed on word times, and everything drawn is a pure function of t.** Each HTML scene sets every element from `t`, the seconds into the scene, through `window.__frame(t)`, at a fixed 540 × 960 stage rendered at 2× (1080 × 1920). A renderer calls it once a frame and screenshots; nothing reads a clock. So when the real take arrives, word anchors give a piecewise-linear map from the real seconds τ to the scratch seconds t, and the scene renders again at `t = W(τ)`: the same animation, on the new delivery, with no judder.

Take that away and the reel can't follow a person. A scene animated with CSS timelines, GSAP timelines or timers plays at its own pace; to fit a new take it has to be re-animated by hand, line by line, and the cuts drift a few frames each time. A screen recording can't be retimed either, so it's cut at its events and each piece gets its own speed.

```js
// hook.js, on reel-clock.js: times are the scratch voice's words.
const T = { look: 0.27, recording: 1.1, zoom: 3.25, sharp: 4.54, html: 7.22 };
HTMLReel.scene({
  dur: 8.6,
  anchors: ANCHORS,                       // [[τ, t], …] once the real take exists
  draw(t, $) {
    $('#win').style.transform = `scale(${1 + 2.8 * ease(t, T.zoom, T.zoom + 1.2)})`;
    $('#w-recording').style.transform = `translateY(${(1 - word(t, T.recording, 2.2)) * 135}%)`;
    $('#tags').style.opacity = ease(t, T.html - 0.3, T.html);
  },
});
```

`scripts/render-frames.mjs` renders any such page to an MP4 (and checks the safe area every frame); Fil's video editor plays the same page as an HTML scene, stepping its clock frame by frame; a browser plays it live with `?controls`.

## Workflow

1. **Read the source** (`scripts/read-source.mjs <tweet | page | YouTube | file> --out source --follow`, `references/source.md`). Finish `Source.md`: its words word for word, the facts the reel may say, the one idea, the hook, whose work it is, the ask. Finish `Look.md` from what was measured and the frames: the shape, ground, ink, accent, and type as three roles (setup, payoff, labels), background, motifs, motion.
2. **Pick the structure, the shape and the layouts** (`references/structures.md`): a promo (`references/formula.md`, studied from a reference reel), a showcase, "found this", an explainer, before and after; 9:16, 4:5, 1:1 or 16:9; and for each beat its layout, the creator's face growing as the ask grows (none in the hook, a bubble, half the frame, full for the ask). Faceless only when the creator won't be on camera. A reference reel the creator likes gives structure and timing, never its look.
   - **Make the camera placeholder**: a backlit studio silhouette photograph, from a photo of the creator (or of any model), lit only from behind against a softly glowing warm cream backdrop, the face in shadow with its features faint, head and shoulders looking into the lens, upright 9:16, the nose at the frame's centre and the chin about 60% down, labelled CAMERA · PLACEHOLDER (in Fil, an image node with Nano Banana editing the photo). It stands in every camera layout until a take replaces it, and a take framed the same needs no reframing.
3. **Write the script in the creator's voice** from Source.md, one line per beat: their own sentences, shortened; only the facts Source.md lists; other people credited by name. Size it to the voice's pace, not a reader's: a cloned voice reads about 2.2–2.4 words a second with its sentence pauses (a person on camera about 2.6), so 30 s holds about 65–70 words. Write for the ear: numbers and names as they're said ("five point oh", "Rea"), capitals only on screen. Mark each line with its layout, what the picture shows and the word each move lands on.
4. **Make the voice with word timestamps** (`scripts/vo-words.py`: ElevenLabs `with-timestamps`, the creator's cloned voice, the key from the environment and never printed; it saves the whole reply, so the words can be made again for free, and prints the pace). For a faceless reel it's the final voice; with takes coming, a scratch voice. Then:
   - check what it said before building on it: Fil's captions on it, or a local whisper, word by word against the script (names and numbers above all);
   - too long by a second or two: `scripts/tighten-voice.py` cuts the middle of every long pause and moves the words with them, instead of paying for another take;
   - name every word (`scripts/named-times.py`: `T.zoom`, `T.skill2`, `T.htmlEnd`), and cut everything to those names from here on.
   Ask before any spend over $1.
5. **Build the picture in the source's look**, every scene on `scripts/reel-clock.js` with Look.md's variables in its `:root` and `HTMLReel.scene({ shape })`:
   - its cover first: the hook at its best moment (its whole title landed over its best picture) as the reel's first 0.2 s, then the hook from there (`HTMLReel.scene({ cover: T.payoffEnd })` in a full scene, `scripts/frame-video.mjs --cover 3.6` on a body with a title layer), its title inside the 3:4 crop the grids show;
   - the cursor out of a screen recording before it's framed: a recording of a 3D scene or a canvas usually shows the macOS hand, and `scripts/decursor.py` finds it (the grab and open hands, six sizes) only in the spans the pieces play (`scan src.mp4 track.json --pieces pieces.json`), tiles its finds before and after (`sheet`), and paints it out into `src-clean.mp4` (`clean`), the video frame-video frames from then on (`--video src-clean.mp4`); it needs OpenCV in a venv (`references/source.md`);
   - a demo video framed and cut to words: its pieces (`from`, `to`, and the word each lasts until) into `scripts/frame-video.mjs`, several videos in one body (a post's and the post it quotes), a full-frame card spliced in as a piece, a title layer drawn from t over it (`scripts/render-frames.mjs --alpha`), checked as stills over the body first (`--test … --under body.mp4`);
   - full scenes for the hook, a title card or the tail, rendered with `scripts/render-frames.mjs`; a hook that shows the source's video inside its own frame draws the video's frames as pictures (extracted once at 60 fps, decoded in `setup`, `draw` setting the one for t and awaiting it), so it retimes like the rest;
   - a product the source doesn't show, recorded with DreamCut (`scripts/record-window.mjs`, `scripts/flash-crop.mjs`), the pointer's moves timed to words.
   Everything read stays inside the safe area (y 280–1640 of 1920 on 9:16).
6. **Preview it locally** (`scripts/preview-reel.mjs plan.json`): the picture, the placeholder in each camera layout at the editor's own `set` values, cinematic captions word by word, the voice and the sound effects, at −14 LUFS, with a contact sheet. Judge the layouts with words on them here, where a change costs a minute; an export costs a window and a wait.
7. **Assemble in Fil's video editor over MCP** (`references/fil-editor.md`): the picture as the story; the placeholder over it as overlays in each camera layout (full, the bubble with its shrink, a half), so a take can `replace` it later keeping every crop, place and keyframe; the voice on its own lane; sound effects at volume 0.1–0.2; cinematic captions on the seam or under the picture, under the chin for a full-frame face (a caption range), never on the face; the beats as chapters. Export, download, look at the frames.
8. **Score it to 8/10 with blind judges** (`references/judging.md`): two absolute judges on frames and a contact sheet, the lower score counts, plus a paired judge on before/after. Fix what both name; stop when two rounds come back flat.
9. **The creator records**: put the script in a canvas document as a teleprompter (headings and `[directions]` show but aren't read), add Record on your phone, and hand them the QR code as a picture. Their takes land on the canvas, the voice cleaned. `replace` each placeholder with its take, then retime everything to their words (`references/retime.md`):
   - join the takes (`scripts/join-takes.py`): pauses over ~0.45 s trimmed, 15 ms fades, each join on a layout change;
   - word times from Fil's captions (`look.max_words: 1`, then `get_video` captions `list`, `scripts/fil-words.py`);
   - align scratch and real words into anchors (`scripts/timemap.py`), render the scenes again on them, split and speed the video pieces;
   - lay in the camera: the bubble (`set.corner_radius` in the editor, or `scripts/bubble.mjs`) and the split (`scripts/split-flip.mjs`);
   - captions again from the real voice, chapters, export, and `scripts/verify-export.mjs`.

## Rules, each with the failure it prevents

- **Say only what the source says.** Every number, name and claim comes from Source.md's facts. An invented result in a reel about a real post is the one thing its author can't forgive, and viewers check.
- **Take the look from the source.** Fonts, colours, motifs and motion come from Look.md; the clock's defaults (a serif, a heavy condensed payoff, an orange dot) are one reel's look. A reel in the wrong look reads as an ad for someone else.
- **Cinematic type, at full size.** The source gives the fonts; the reel gives them its scale and rhythm: in the hook, the tail and every title card, the setup line at about 52 px on the 540 stage and the payoff word at 90–110 px, heavy, landing on its word through its mask, ending on the accent; the ask's keyword as large as its word fits across the frame (about 200 px for a short word in a condensed face, less for a long one or a wide face). Titles squeezed into a band over a framed video read as a slideshow; the big type is what stops the scroll.
- **Captions are cinematic too.** A heavy sans at about 78 px (Inter Tight 800, or the source's own heavy face from Fil's list), the ink colour with the spoken word in the accent, a 5 px dark outline, word by word, up to 3 words on one line, on the split's seam or under the picture. Plain small captions undo the type.
- **The first frame is the cover.** Instagram's and TikTok's grids, the feed before a reel plays, and Fil's video edit node all show a reel's first frame unless a cover is set, so a hook that starts mid-animation opens on a half-risen word over an empty frame (all four first drafts did: "This", "Reverse engin…", "One"). Open on the cover instead: the hook's best moment, its whole title landed over its best picture, held for the first 0.2 s, then the hook plays from its start. Keep its title inside the 3:4 crop (y 280–1640 of 1920), readable at 360 px wide, with no caption over it (the first starts after 0.2 s), and save the frame as cover.jpg for the platforms' own cover upload.
- **The creator is in the draft.** A reel with an empty space where the face goes can't be judged; a backlit silhouette in every camera layout, the draft reads as the finished reel, and each take drops in with `replace`.
- **Credit other people's work on screen.** A quoted post, a linked repo, someone's skill: their name and handle where the viewer reads, and in the voice. Presented as the creator's own, it gets called out in the comments.
- **The demo is the picture; change the framing every 2–4 s.** A new piece, a crop on the detail, a title card. One box that never changes reads as a screen recording with captions. A list said fast ("lights, doors, AC, robot") is the exception: one piece per item, on its word, however short.
- **Check what the voice said before building on it.** A cloned voice reads "5.0" as "five", a name as another word, a capitalised word as letters. Read its words back (Fil's captions or whisper) against the script; fixing a word after the scenes are timed to it costs a render.
- **Mind the source's own glitches.** A demo video can hide a dropped frame or a flash between pages. read-source lists its scene cuts (`cuts`), but not a short glitch or scan lines inside a shot (Anatomy's had both, at 15.8 s and from 20.6 s); look at every piece's ends at 0.1 s steps, and through it at 0.25 s, before keeping it.
- **Paint the cursor out of a post's video.** The cursor in a post's screen recording is the first thing blind judges name: in the drafts of two reels made from Meng's posts (the Opus 5.5 ship and the valley boat scene), all four named the macOS hand first, before the type, the layout or the ask. `scripts/decursor.py` found it in 854 and 1,138 frames and painted it out with its soft shadow. Look at its sheet before cleaning. Another white cursor outlined dark (the pointing hand) gets a template cut from a frame of the same recording first (`template`), never from Apple's own cursor files. It doesn't find the arrow (black, outlined white).
- **Cut to words, never to guesses.** Draft 1 was timed by reading speed and every beat landed early or late; draft 2, cut to the scratch voice's word timestamps, landed on all of them. Name every time after its word (`T.zoom`, `T.html`) so the script reads like the voiceover.
- **Draw scenes from t alone.** No CSS animations, transitions, timers or `Math.random` on the stage: a scene that keeps time anywhere else renders differently every run and can't be retimed. reel-clock.css turns animations and transitions off on `#stage`.
- **Retime by anchors, not by stretching.** Stretching a whole scene to a new length moves every beat by a different error. Word anchors (24 in the 8.6 s hook) pin each beat to its word and only the gaps between stretch. Keep the map monotone; add manual pairs where the creator reworded a line ("happens", "jumps", "demos", "fil").
- **Speed changes duration.** A screen piece of 3.853 s at speed 1.471 lasts 2.619 s on the timeline. Split recordings at their events (the scrub, each step jump) and set each piece's speed so its event lands on its word; keep speeds between 0.5 and 2.2 or the motion reads as fast-forward.
- **Join takes on a layout change.** A jump cut in the middle of a full-frame face is visible; the same cut hidden under the bubble's shrink or the split's flip isn't.
- **Captions are one track, placed by stretch.** They sit on the split's seam for the whole reel (`position: "middle"`, `offset: 0`), so give each full-frame camera beat a caption range of its own: `{"op":"captions","ranges":[{"start":6.23,"end":7.33,"position":"bottom","offset":-380}]}` puts a 78 px line's centre at y 1332, under the chin of the drawing at scale 1 (its nose at y 960), and the line goes back to the seam when the beat ends (Fil 0.433.0). Each command replaces every range, so send them all at once, and read them back in `get_video`. Keep the face where a take frames it (`scale: 1`, `y: 0`) rather than reframing it above the seam (scale 1.3, y −290), and keep the beat's captions rather than removing them. Remove the lines under big type that says the same words (the hook, a credit, the ask) (`{"op":"caption","caption":…,"remove":true}`): the big type is already the words, and the shipped reel showed none under its hook.
- **Keep the face out from under the words.** Captions sit mid-frame on the split's seam (y ≈ 960) or under the chin on full camera (a range at the bottom, offset −380: y ≈ 1332), never on the face or a window's controls; the hook and tail keep their titles inside y 280–1640 so the app's buttons and a 3:4 crop don't cut them.
- **The face grows as the ask grows.** No face in the hook, a bubble for the proof, half the frame for the demo, full frame for the offer and the ask. A face too early costs the hook; a bubble for the CTA costs the trust.
- **Sound effects stay under the voice:** 0.1 to 0.2 volume, on real events only (a press, a reveal, a card landing), placed last at absolute times.
- **Overlays in Fil stay overlays.** Add camera placeholders, bubbles and cards with `overlay: true`: they then play over the story, and trimming, replacing or removing them never moves the scenes (Fil 0.424.0; before it, `replace` turned a picture overlay into a story scene, and `trim from` on a video overlay squashed scenes to 0.1 s). Closing a gap still moves everything after it, sound effects included: remove with `close_gap: false`, or move the effects back afterwards.
- **A rounded bubble is one setting.** `set: { corner_radius: 30 }` on a video or picture in Fil draws it in a rounded box with a soft shadow; a square crop with half its width makes a circle. Before 0.424.0 the bubble had to be composited locally.
- **Pictures cover the frame at scale 1.** In Fil's editor a picture's `scale: 1` fills the frame; a card or a bubble PNG needs `fit: "fit"` (then scale 1 fits it whole).
- **Export from a fresh window.** `export_video` renders in whichever Fil window has the canvas open. A window opened before the uploads may claim the job and fail with "This file isn't available": close it, or open the edit in a fresh tab and use Export › Save to canvas, then read the link with `get_video`.
- **Hand over the phone link as a picture.** The link works on the first device that opens it. A link clicked in an agent's browser pane claims it there, with no camera. Send the QR code as an image; never open the link to test it.
- **Settings live in the cloud, on the node.** The teleprompter's script, prompter and follow-my-voice are the recording node's own (`update_node` `script_doc`), the same in every window and on the phone. Never keep a reel's settings in one window's local storage.
- **Renders take minutes, more on a busy machine.** Every frame is a browser screenshot or an ffmpeg pass: at a load average of 350 a 1,017-frame caption layer took 9 minutes. Run them niced (`nice -n 10`), one at a time, in the background, and judge on `--test` stills and contact sheets before rendering a whole film.
- **Verify the export, not the timeline.** Download the MP4, tile frames every 0.5 s, measure loudness (ebur128), check lip sync on a plosive, and compare the voice's high band with the raw take to confirm Studio Sound is in it. Positions read from the docs were wrong twice; the frames weren't.

## Numbers from the three posts (drafts with the placeholder)

| what | value |
| --- | --- |
| length | 29.5–33.9 s, 1080 × 1920, 30 fps, −14.4 to −14.7 LUFS |
| voice | one ElevenLabs take each, about 400 characters; 2.2–2.4 words a second; one tightened from 31.8 s to 29.5 s |
| camera | no face in the hook (3–6 s); full frame 0.9–2.7 s; a bubble 3–7.5 s; half the frame 9–22 s; the top half for the ask, 3.7–4.1 s |
| pieces | 7–19 a reel, speeds 0.26 (a still window) to 2.02, a crop on the detail every few pieces |
| titles | setup 52 px, payoff 100–104 px on the 540 stage; the ask's keyword fitted to 492 px (seven letters: 96–112 px) |
| captions | Inter Tight 78 px, 800, ink and accent from Look.md, 5 px outline, on the seam; 20–29 lines, 3–5 removed under big type or a full-frame face (before caption ranges) |
| sound effects | 4 each, volume 0.10–0.16, on reveals, a card, the keyword |
| cover | the hook's frame at 2.8–3.6 s (its whole title landed), held 0 → 0.2 s; titles at y 900–1300, inside the 3:4 crop |

## Numbers that shipped (the HTML Demo reel)

| what | value |
| --- | --- |
| length | 37.5 s, 1080 × 1920, 30 fps, −14 LUFS |
| sections | Hook 0–5.12 · Twist –8.53 · Proof –12.50 · Demo –18.72 · Benefit –25.24 · Offer –28.97 · Value stack –35.08 · CTA –37.50 |
| pace | about 2.6 words a second; scratch voice 37.8 s, real takes cut to 33.4 s |
| takes | two upright phone takes; pauses over 0.45 s trimmed; 15 ms fades; 0.8 s beat after "it's HTML" |
| stage | 540 × 960 CSS at 2×; safe area y 280–1640 of 1920 |
| titles | Instrument Serif 52 px, then Anton 100 px uppercase with a 0.17 em accent dot; masks padded 0.14 em / 0.2 em |
| bubble | 268 × 375 at x 721, y 1072, 30 px corners, a 2 px edge at 55% white; shrinks from full frame over 0.35 s |
| split | a hard edge at y 960; the camera's middle 1080 × 960, zooming 0.86 → 1 over 0.35 s; flips to the top half over 0.32 s, cubic in-out |
| captions | Inter Tight 78 px, weight 800, white, the spoken word in #efb36c, 5 px dark outline, middle, up to 3 words |
| sound effects | volume 0.1–0.2: soft whoosh on cuts, click on presses, pop on a card, typing under typing, impact on the CTA |
| anchors | 24 in the hook, monotone, 4 manual pairs |
| screen pieces | speeds 1.13–2.07 to land the scrub and the step jumps on their words |
| judges | two blind absolute judges (lower counts) + one paired judge; the hook went 6.5 → 6.0 → 7.3 → 7.0 and stopped flat |

## Verify

- [ ] The first frame is the cover: the whole title over the hook's best picture, inside the 3:4 crop, readable at 360 px wide, no caption on it.
- [ ] Every beat lands on its word in the export (scrub a few at 0.25× with the sound on).
- [ ] Frames every 0.5 s: no title outside y 280–1640 or within 16 px of the sides, no caption on a face or over what the video shows, no bubble over a window's controls, no cursor in a demo piece.
- [ ] Every name, number and handle on screen matches Source.md, and every other person's work is credited.
- [ ] A frame rendered twice at the same t is the same picture.
- [ ] Lip sync holds at the start, middle and end (a plosive: p, b, m).
- [ ] Integrated loudness −14 LUFS ± 1, true peak under −1 dBTP; the voice's high band sits below the raw take's (the clean voice is in).
- [ ] Captions match what was said, word for word, with names spelled right.
- [ ] Chapters name the beats (8 for a promo, 5–7 for a showcase or "found this").

## Files

- `scripts/read-source.mjs`: a tweet, page, YouTube video or file read into its words, media, frames, measured look, Source.md and Look.md.
- `scripts/reel-clock.js`, `scripts/reel-clock.css`: the scene engine: `HTMLReel.scene({ dur, draw, anchors, shape })`, the warp, the stage in four shapes, type as three roles in variables, `fit` for a line of unknown length, `cover` for the first frames, the controls.
- `scripts/frame-video.mjs`: a demo video framed in the reel's shape over a blurred copy, its pieces cut to words, a title layer over it, opening on its cover (`--cover`).
- `scripts/decursor.py`, `scripts/cursors/`: the macOS hand cursor found in a screen recording (templates of the grab and open hands, cut from recordings) and painted out, into `src-clean.mp4`.
- `scripts/render-frames.mjs`: a `__frame` page to MP4 (or a see-through title layer, `--alpha`), frame by frame, warped or not, with the safe-area check.
- `scripts/timemap.py`: scratch and real word times into anchors, the map W, and a scene's local anchors.
- `scripts/vo-words.py`: an ElevenLabs voiceover with word timestamps, its reply saved, its pace printed.
- `scripts/tighten-voice.py`: a voice's long pauses shortened, its words moved with them.
- `scripts/named-times.py`: every word named (T.zoom, T.skill2, T.htmlEnd) for scenes and pieces.
- `scripts/fil-words.py`: word times from Fil's captions list.
- `scripts/join-takes.py`: phone takes joined into one talking track, with its edit list.
- `scripts/record-window.mjs`, `scripts/choreo-example.mjs`, `scripts/flash-crop.mjs`: DreamCut recordings driven by playwright, cropped and trimmed by their flash.
- `scripts/bubble.mjs`, `scripts/split-flip.mjs`: the camera composited locally, as a rounded bubble or a flipping half.
- `scripts/preview-reel.mjs`: a local preview as Fil will lay it out: the picture, the camera layers at the editor's set values, cinematic captions, the voice and sound effects.
- `scripts/verify-export.mjs`: the export's size, loudness, sheet and clean-voice check.
- `references/source.md`: reading a source into Source.md (the words) and Look.md (the look).
- `references/structures.md`: structures (promo, showcase, found this, explainer, before and after) and the layout library, faceless and on camera.
- `references/formula.md`: the promo's 8 sections and 6 camera layouts, and how to study a reference reel.
- `references/fil-editor.md`: assembling in Fil's video editor over MCP, the phone takes, the export.
- `references/retime.md`: joining takes and retiming every part to the real words.
- `references/judging.md`: the rubric, the blind judges and when to stop.
- `demo/index.html`: a hook scene on the clock, played on the scratch voice or retimed to the real take.
