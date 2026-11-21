# Structures and layouts

A reel's structure is chosen for its source and its ask; its layouts for what it has to show. Both are libraries: pick, combine, cut. The 8-section promo in `formula.md` is one structure among these, studied from one reference reel.

## Structures

Lengths are at about 2.6 words a second. Every one opens on its hook in the first second and has no outro: the loop restarts on the hook.

| structure | when | beats | length |
| --- | --- | --- | --- |
| **Promo** (formula.md) | selling something you made, with you on camera | hook · twist · proof · demo · benefit · offer · value stack · CTA | 25–35 s |
| **Showcase** | "I made these": several results from one process | hook (the best result) · what it is and the one number that surprises (a price, a time) · the results, each named, on its word (a line that lists three makes a montage of 1–1.5 s pieces) · how (the process in one line) · CTA | 20–35 s |
| **Found this** | someone else's tool, skill or post | hook (what it does, shown) · who made it (their name and handle on screen) · 2–3 things it does, shown · how to get it · CTA | 15–30 s |
| **Explainer** | how something works | the question · the familiar picture · what changes it · how it works, step by step · what it means for you | 30–60 s |
| **Before / after** | a change you can see | after first (the hook) · before · the one move between them · after again, longer | 15–25 s |

Write the beats in Source.md's words: the hook is its most surprising true thing, the middle is its facts, the ask is the one it makes. A beat with nothing true to say is cut, not padded.

- **Titles add, captions repeat.** The captions already say the line; the titles give what the ear can't: the names (Quayside, Singapore after dark, Tidelight), the numbers ($0.15 per 1M tokens), the handle being credited. A title that quotes the voice word for word doubles the captions.
- **A line that names nothing on screen** (a price, a feeling) shows what it's about: the price on the model picker, the feeling on the result's best moment. Footage the words never name stays out, however good.

## Layouts

On a 1080 × 1920 frame unless the shape says otherwise. Faceless layouts need no camera; camera layouts need the creator's takes (or placeholders until they're in).

### Faceless

1. **Framed demo.** The source's landscape or 4:3 video in a box (about 984 px wide, its top at y 560 of 1920) over a blurred, dimmed copy of itself or the source's flat ground, with the corners and backdrop Look.md gives (square and flat for a technical source, rounded and soft for an app); titles in the band above the box (y 280–540) at full size when they carry the beat (a 52 px setup line and a payoff fitted to the width, on the 540 stage), labels and figures smaller; captions under it. A band of small titles over a box reads as a slideshow: when the beat needs bigger type, give it a title card or a full-frame scene. `scripts/frame-video.mjs`, its pieces cut to words; every crop at the box's shape (on a 4:3 source, width share = height share; a 4:3 crop of a 16:9 video, width share = 0.75 × height share).
2. **Close on a detail.** The same box showing part of the video (`crop` in a piece), a zoom on the button, the number, the face of the thing. One per reel or two; it's the reel's camera.
3. **Full bleed.** A frame of the video, or a picture, filling the frame, slowly pushing in; titles over a dark gradient. For the hook's strongest picture.
4. **Page scroll.** A landing page's screenshots (read-source's `media/`) as one tall strip panning down in the box, or a page recorded with `scripts/record-window.mjs`.
5. **Post card.** The post itself drawn in HTML (avatar, name, handle, its words, its reach: read-source saves the avatars), for "found this" and for crediting a quote. Never a screenshot of someone else's UI pretending to be live. Rendered on its own, it goes into the body as a full-frame piece (frame-video's `insert`).
6. **Title card.** The ground of the look, one line set large in the payoff type. For the twist and the CTA.

### With the camera

7. **Full camera.** The talking head fills the frame as the take frames it (the silhouette at scale 1, y 0 in Fil), the captions under its chin for that beat: a caption range at the bottom, offset −380 (fil-editor.md, Captions), back on the seam when the split returns.
8. **Screen + bubble.** The screen in the top half (frame-video's `"box": "top"`), the camera in a rounded bubble (268 × 375, 30 px corners) at the bottom right, captions on the seam, and the space left of the bubble for a card, the post being credited or a label block. A centred box would sit under the captions.
9. **50/50 split.** The screen on top, the camera's middle below, a hard edge at y 960, captions on the seam; flipped for the ask. A half is 1080 × 960 (9:8): a crop at its shape is w = 0.844 × h of a 4:3 source and 0.633 × h of a 16:9 one, so a wide video loses its sides: choose each piece's crop for what it shows.
10. **Camera + card.** The camera in the top half, a card drawn in HTML below.
11. **CTA type.** The camera, the keyword in big type over its top third.

### Each structure's layouts, with the creator

| beat | promo | showcase | found this |
| --- | --- | --- | --- |
| hook | full visual, big type | full visual, big type | full visual, big type |
| what it is | full camera → bubble | bubble over the demo | full camera → bubble |
| the middle | 50/50 split | split, then framed demo for a montage | split; the maker's post card full frame |
| the ask | camera + card, CTA type | camera + CTA type | camera + CTA type |

The camera is the creator's placeholder, a backlit studio silhouette, until their takes are in.

### Choosing

- Every structure opens on its cover, the hook's best moment held for the first 0.2 s: its whole title over its best picture, inside the 3:4 crop the grids show (y 280–1640 of 1920). It's the first frame, so it's what the grid, the feed and Fil's canvas show.
- The face, when there is one, gets bigger as the ask gets bigger: none in the hook, a bubble for the proof, half for the demo, full for the ask. A default, not a law: a reel about a face starts on it.
- Faceless reels change layout or framing every 2–4 s: a new piece, a crop, a title card. A box that never changes reads as a screen recording with captions.
- Titles and captions never cover what the picture is showing: above and below the box, or over a gradient.
- When a post shows the creator's result and someone else's tool, lead with the result (it's the hook), credit the tool's maker right after, then show the tool.
- Glass cards in a see-through title layer can't blur the video under them: give them an opaque fill, or draw the card into a full-frame piece.
