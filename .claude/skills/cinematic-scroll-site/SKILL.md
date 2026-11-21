---
name: cinematic-scroll-site
description: Build a business website whose story plays as a scroll-scrubbed video (image sequence) made with Higgsfield - brief, identity and style tile, a "Visual Story" table, scroll pacing, connected video generation with matching frames, FFmpeg frame extraction, the pinned-canvas implementation, fallbacks and delivery. Use when the user wants a premium, cinematic or "wow" website for a business or a product (PitUp, a shop, a brand), a scroll animation driven by AI video, or a site built with Higgsfield / Seedance assets. Workflow distilled from Barty-Bart "GPT-6 Astra 10K websites" prompts (rewritten, no licence on the source) and the Astra prompt collections (TripoGrowthLab, MIT; MartinDelophy, CC0) used as inspiration catalogues.
---

# Cinematic scroll-story website

The site tells the business's story with a video that advances as the visitor scrolls,
while real HTML (headings, buttons, forms) stays readable, selectable and accessible.

## 1. Brief (one short intake, not a questionnaire)

What the business does, for whom, what the visitor must do (order, call, WhatsApp, sign
up); name, logo, existing brand; reference sites or a described aesthetic.

- **Guided mode:** two review points only: identity/style, then the story.
- **Autonomous mode** ("choose for me", "make a template"): pick defaults, keep going,
  list assumptions at the end.
- Never invent testimonials, clients, awards, addresses or figures. Template = clearly
  marked placeholders.

## 2. Identity and style tile

Keep supplied logos and assets exactly; never redraw an existing logo. Without an
identity, propose a few directions (logo concepts can be generated with Higgsfield) and
select one. Build a small **style tile** in real HTML/CSS with the site's tokens: logo,
palette, heading/body fonts, buttons, links, one card, image direction. Not a brand book.

## 3. Visual Story table (before any generation)

| Scene | Visual story | Website copy |
|---|---|---|
| 01 Opening | Subject and first action; free space for the hero text | Hero heading, line, main CTA |
| Transition | The subject alone moves between settings | "No copy, the motion leads" |
| 02 Development | Next action or detail, continuing from 01 | Offer / service copy |
| 03 Resolution | Final reveal or destination | Outcome, practical info, closing CTA |

Then a **scroll pacing** plan per beat: what enters and leaves, framing, scroll distance
in viewport heights, continuous motion or still-frame hold. Video seconds are not scroll
distance: a 6 s clip can span several screens. Text beats need time to be read. Do not
stretch a few frames over a long scroll (stepped playback); ask for a longer clip.

## 4. Generate connected assets (Higgsfield MCP)

- Check the live model schema first (duration, ratio, resolution, start/end frame
  support). Do not buy plans or change account settings to get there.
- Key stills first for composition and subject consistency. No text, menus or buttons
  baked into pixels.
- Connected scenes in order: accept clip A → extract its clean last frame → use it as
  the start frame / reference of clip B → inspect the seam (position, scale, light,
  direction) forward and backward. Fix a broken seam before building.
- Keep job IDs; fetch a pending job instead of resubmitting. One targeted correction per
  failure, not endless regeneration. Start with 6–12 s clips.

Seedance-specific prompting: the installed `seedance-*` skills (cinematic, product-360,
brand-story, ecommerce-ad, food-beverage…).

## 5. Frames and implementation

```sh
ffmpeg -i scene.mp4 -an -vf "fps=18,scale=1280:-2" -c:v libwebp -quality 78 \
  -start_number 0 frames/frame-%04d.webp
```

Write a manifest (count, size, naming, poster). Check first, middle and last frames.

```text
progress   = clamp(sceneScroll / sceneScrollDistance, 0, 1)
frameIndex = round(progress * (frameCount - 1))
```

- Pinned canvas/image stage; a piecewise timeline (each beat maps its scroll range to
  its frame range; a hold maps a range to one frame).
- Native scroll, forward and backward; no scroll hijacking; a way to skip the story.
- Load the current and nearby frames first; cap concurrent requests and decoded frames in
  memory; release evicted bitmaps; bounded retries; keep a still if media fails.
- Reduced-motion and low-end fallbacks keep all content and the main CTA. Mobile layout
  reflows; it is not the desktop shrunk.
- Invisible layers must not catch clicks or keep hidden links in the tab order.

## 6. Content, checks, delivery

Copy, services, CTAs and media paths in one content file (or the CMS). Forms post to a
real destination or say they are a demo; never show "sent" when nothing was sent.
Run the build, verify the frame manifest, test real scrolling on desktop and phone width,
and say which checks were not possible. Publish only to the audience the user chose.
Deliver: site or preview, style tile, logo masters, original clips, editable content, a
short production note (direction, assumptions, prompts, asset sources, limits).

## Gotchas

- Compilation is not proof of smooth playback: test real scrolling.
- Independently generated scenes do not match at the cut; chain them from real frames.
- Heavy sequences kill mobile data budgets (relevant for African mobile users): measure
  total transfer size and offer a light version.
