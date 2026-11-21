# HTML Reel prompts

## Minimal prompt

```text
Use $html-reel to make my reel's hook as an HTML scene drawn from t at 540 × 960: time it to a scratch voice's words, retime it to my real take by word anchors (t = W(τ)), and render it frame by frame.
```

## Recreate the demo

Use `$html-reel` to build **HTML Reel**, a page holding one small hook scene: the first lines of the HTML Demo reel, in a phone, played on two clocks. Treat `index.html` as the reference for visuals, timing, responsiveness and accessibility.

### Experience

- The first screen has a kicker naming the stack (**Vanilla JavaScript · HTML/CSS**), the title **HTML Reel**, one paragraph stating the mechanism (every frame is `draw(t)` on the scratch voice's seconds; the real take re-renders it at t = W(τ)) and what fails without it (a scene animated with CSS timelines or timers can't be retimed, and stretching the render judders), then the player, already playing.
- The scene says "This looks like a screen recording. Watch what happens when I zoom in. Still sharp. Because it's not a video, it's HTML." Each serif word (Instrument Serif) rises through its own mask on its word of the voice; the heavy word (Anton, capitals) lands and its orange dot pops; a phrase leaves up through its masks just before the next one starts.
- Above the titles, an app window (Mossa in a design editor: Pages and Layers, the canvas with a hero, the inspector). The camera pushes 4.4× into the inspector on "Watch what happens when I zoom in." and holds while the pointer's "0.12em" is typed ("Still sharp."). It pulls back on "Because", then on "it's HTML" the window turns and lifts into four outlined layers (frame, panels, canvas, hero) with orange tags: `figure.app`, `<h1> MOSSA`, `<aside> Layers`, `<a> Shop now`. A calm dark ground: warm gradients and seven drifting threads of light.
- A switch, **Timed to: Scratch voice | Your take** (8.6 s or 7.77 s), keeps the frame it's on. Under the phone are play/pause, a scrubber and the time. Beside it on wide screens (under it on phones) is a strip of both clocks' words: a line joins each anchored pair ("but" has none), dashes mark the end, and the playhead is one orange line from t to τ.
- Then "How it was made", in five steps.
- `?embed` shows only the switch, the phone and the controls, on a transparent background, fitting a 360 × 760 iframe. `?frame` shows only the stage; `?frame&take` puts the take's clock on `__frame`.
- Under reduced motion, it shows the complete end frame, paused; the scrubber moves it.

### Implementation contract

- Use `scripts/reel-clock.js` and `scripts/reel-clock.css`, unchanged. One `draw(t)` sets every part. `HTMLReel.scene({ dur: 8.6, draw, setup })` runs the voice and `scene({ …, anchors: TAKE })` the take. Keep each one's `__frame`, expose the one the URL asks for, and drive both through one facade passed to `HTMLReel.controls`.
- Store the word times as constants. `VOICE` comes from `vo/full-words.json`. `ANCHORS` comes from `cut/anchors.json` as `[scratch, real, word]`, converted to `[[τ, t]]` local to the scene (the hook opens the cut, so both offsets are 0), with the next word ("I") to place the end. `TAKE_WORDS` comes from `cut/master-words.txt`.
- Derive every beat from a word: the push runs from WATCH − 0.04 to IN + 0.24 (quartic), the pull-back from SHARP + 0.66 to SHARP + 1.41, the tilt from ITS2 − 0.06 to ITS2 + 0.49, the lift from ITS2 + 0.09 to ITS2 + 0.74, and the tags come at ITS2 + 0.14, HTML, HTML + 0.22 and HTML + 0.44.
- Titles use `.reel-serif`, `.reel-heavy`, `.reel-mask` and `.reel-dot`. Measure one heavy size so the widest line fits 470 px, and wrap a serif line over 470 px into two balanced lines. Phrases sit 214 px from the bottom and are marked `data-safe`. Words rise from 120 % over 0.3 s and leave to −120 % over 0.16 s.
- The window is 468 × 300 at (36, 140), built in four planes. The zoom is a 2D translate and scale whose pivot moves to the focus in the first third of the push. Turn on 3D (preserve-3d, perspective 1100 px, translateZ 0/46/92/140) only from the tilt, so the zoom stays a 2D raster and stays sharp. In close, mask the window from 380 to 560 px so nothing reaches the titles.
- The switch maps the frame across: t = W(τ) on the active clock, then τ′ = W⁻¹(t) on the other (the voice's W is the identity and has no inverse). After `pause()`, `seek(time)` so the frame shown is the frame paused on.
- Verify headless: shoot frames every 0.5 s on both clocks, keep `__bounds()` within 140–820, shoot each phrase change at 0.05 s steps, crop the zoom at 2×, check 390 and 340 px widths, and keep the console clean.

### Restrictions

- No video, canvas, WebGL, images or libraries. Load only the two script files and Google Fonts (Instrument Serif, Anton, Geist, Geist Mono).
- Nothing animates by itself: no CSS animations, transitions or timers. Every value comes from t.
- Never re-animate for a take: only the anchors change.

## Remix prompt

```text
Use $html-reel to make the [hook / tail] of my reel about [topic]. Write the lines, make a scratch ElevenLabs voice and take its word times, and animate the scene to them as draw(t) at 540 × 960, with the titles marked data-safe inside the 3:4 safe area. When I send my real takes, transcribe them, match their words to the scratch's, and pass the pairs as anchors so the scene plays at t = W(τ); render it with ?frame at 2×. Shoot it every 0.5 s on both clocks and fix masks, overlaps and safe-area misses before you call it done. Keep the mechanism (one clock, word anchors, a pure draw); change everything else: the words, the app, the palette.
```
