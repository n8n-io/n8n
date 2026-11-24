# The promo: 8 sections, 6 camera layouts

One structure among those in `structures.md`: the promo, for selling something you made with you on camera, studied from one reference reel. A reel that sells is a short story with one arc: attention, interest, desire, action. The 8 sections below are that arc in the order a viewer needs it, and each picks the camera layout that suits its job. The numbers are from the reference reel (24.7 s) and from the reel this skill was extracted from (33.7 s).

## Study a reference reel first

Pick one reel in the format you want, from a creator whose reels perform (comments are the signal: the reference had more comments than likes, because its ask was a comment).

1. **Frames.** Every 0.1–0.5 s from the best stream you can get, at full size: `ffmpeg -i reel.mp4 -vf fps=4 f/%04d.jpg`, or playwright screenshots of the playing post. Tile them into one sheet (`-vf fps=2,scale=216:-1,tile=9x6`) to see the whole reel at once.
2. **Captions.** Read them off the frames (OCR, or by eye): their words, how many at a time, their look and where they sit on each layout.
3. **Layouts.** Write down each stretch with its layout, times and measurements on a 1080 × 1920 frame: the bubble's box and corners, the split's line, where captions sit. Note the transitions between layouts and when they happen.
4. **One doc per section**: what happens, what's on screen, the section's job, and a prompt that remakes it for any topic. Then one doc that says what the video is by the end (a lead magnet, a soft sell) and a master prompt for the whole format.

Never reuse the reference's footage, words or brand. It gives the structure, the timing and the layouts; everything in your reel is yours.

## The 8 sections

| # | section | job | layout | reference | shipped |
| --- | --- | --- | --- | --- | --- |
| 01 | Hook | stop the scroll with a visual surprise in the first second; ask the viewer to look, then pay it off inside 3 s | full visual | 0–4.9 s | 0–4.74 s |
| 02 | Twist | break the assumption the hook set up: "it's not X, it's Y" | full visual | 4.9–7.9 | 4.74–7.77 |
| 03 | Proof | show where it comes from, the face vouching for it | full camera for half a second, then the bubble | 7.9–12.0 | 7.77–11.70 |
| 04 | Demo | how it works, the product and the person equal | 50/50 split | 12.0–15.0 | 11.70–16.33 |
| 05 | Benefit | what it does for the viewer, in their words | split, the two halves tied together once | 15.0–17.8 | 16.33–22.04 |
| 06 | Offer | the thing itself, named | camera grows, a graphic floats over it | 17.8–20.3 | 22.04–25.65 |
| 07 | Value stack | what comes with it: a card of three numbers | camera + a card | 20.3–22.8 | 25.65–31.06 |
| 08 | CTA | one word to comment for the link | camera + big type | 22.8–24.7 | 31.06–33.70 |

Shares of the reference: attention (hook + twist) 32%, interest (proof + demo) 28%, desire (benefit) 11%, action (offer + stack + CTA) 28%. No outro: the loop restarts on the hook.

The rule underneath: **the face gets bigger as the ask gets bigger.** No face → bubble → half → full frame.

The CTA's comment-to-DM gate works because an automation answers it: in Fil, an Instagram automation replies to a comment with a DM carrying the link.

## The 6 layouts

On 1080 × 1920:

1. **Full visual.** No camera: the hook's scene full bleed. Captions in the lower third (about 74% down) on a full visual.
2. **Full camera.** The talking head fills the frame; captions at chest height. Shown once, briefly, before it shrinks.
3. **Screen + bubble.** A screen recording (and B-roll) behind, the camera in a rounded bubble on the right of the bottom half: 268 × 375 (about 5:7) at x 721–989, y 1141–1515 in the reference (y 1072 in the shipped reel, to clear its window), ~30 px corners, 91 px from the right edge.
4. **50/50 split.** A hard edge at y 960: the product on top, the camera's middle (cropped to 1080 × 960) below. Captions on the seam. The shipped reel flips it once (camera to the top, the card below) for the offer.
5. **Camera + card.** In the reference, the face full frame with a dark gradient over its top ~40% and a card on it (the product's name, its address, three numbers), or a small icon (a folder, a SKILL tag) floating in the top third. The shipped reel flips its split instead: the camera in the top half, the card drawn in HTML in the bottom half, captions on the seam.
6. **CTA type.** Big kinetic type in the top third ("comment DEMO"), the face below, the keyword landing heavy.

## Transitions that worked

- **Full camera → bubble:** the camera scales down into the bubble over 0.35 s as the screen comes in behind it (eased, cubic in-out, its corners growing 0 → 30 px).
- **Bubble → split:** the top changes first, then the camera grows to fill the bottom half.
- **Split → full camera:** the camera grows to full frame; the top graphic stays on top of it.
- **Split flip:** the bottom-half camera slides to the top half over 0.32 s on the line that starts the offer.

## The script

- 25–35 s, about 2.6 words a second. One line per beat; the hook's first line in the first second.
- In the creator's own voice: lift phrases from their posts, keep their rhythm, read it aloud once. A line that sounds like an advert ("revolutionary", "game-changer") is cut.
- Each line marked with its layout, what the screen shows during it, and the word an event lands on (the scrub on "scrubs", the shrink on "any size").
- The hook asks the viewer to do something ("watch what happens when I zoom in") and pays it off before 5 s. The twist is one sentence. The ask is one word.

The shipped script, 8 sections:

- Hook: "This looks like a screen recording. Watch what happens when I zoom in. Still sharp."
- Twist: "Because it's not a video, it's HTML."
- Proof: "I made a skill that turns your app into a demo like this."
- Demo: "Every frame comes from one clock, so it loops, scrubs, and jumps to any step."
- Benefit: "So the demo on your site stays sharp at any size. No MP4 to export."
- Offer: "I open-sourced it as a skill called HTML Demo."
- Value stack: "It runs the demos on fil.design. You still need real screenshots of your app, though."
- CTA: "Comment demo and I'll send you the link."

## A section doc

```markdown
# 01 · Hook — the reveal

**0:00–0:04.9 · HOOK (attention) · Layout 1: full visual, no camera**

## What happens
- …

## On screen
- …

## The job of this section
…

## Prompt
> Open on a full-screen [STRIKING VISUAL], 9:16 … **0–1 s:** … **1–3 s:** … **3–5 s:** …
```
