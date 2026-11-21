# Playful Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/playful/design.md`
- Preview card: `bold-template-pack/templates/playful/preview.md`

## Selection Metadata

- Slug: `playful`
- Tagline: Sun-warm peach background with Syne display: a friendly indie launch deck.
- Mood: warm, approachable, indie, friendly
- Tone: upbeat, informal, welcoming
- Formality: low
- Density: medium
- Scheme: light
- Best for: Anything that should feel warm, indie, and approachable: creator portfolios, indie product launches, lifestyle brands, small-business pitches, newsletter / community decks. Also welcoming for any deck — including tech or research — that wants to feel friendly and human rather than corporate.
- Avoid for: Contexts where institutional credibility matters more than warmth — the peach palette is intentionally informal.

## Visual Snapshot

A warm, hand-crafted editorial system built on a peach-clay canvas with charcoal ink as the only "color." Display type runs in Syne (weight 700–800, tight negative tracking); body type runs in Space Grotesk at weight 400–500. The aesthetic borrows from independent studio decks, risograph zines, and sketchbook spreads: organic blob frames, scribbled SVG doodles, slightly rotated cards, and double-stroke offset borders give every slide a hand-touched, unpolished warmth. The effect is creative-studio editorial, not corporate pitch — confident but human, structured but loose.

Playful is a hand-crafted editorial system anchored by a single warm canvas — a peach-clay {colors.bg} (#F0C8A0) — with charcoal {colors.text} (#1A1A1A) as the only meaningful "color." Everything reads as ink-on-clay-paper. There are no secondary brand colors, no gradients, no chromatic accents. The system commits fully to a one-color discipline and finds its expressiveness in shape, weight, rotation, and hand-drawn marks rather than in palette variety.

## Preview Ingredients

- Palette: bg #F0C8A0; bg-alt #E8B88E; light #F7DEC6; text #1A1A1A
- Typography: Syne; Space Grotesk
- Signature move: Peach-clay canvas ({colors.bg}) with charcoal ink ({colors.text}) as the only color. No secondary brand palette.
- Signature move: Syne at weight 700–800 with negative letter-spacing for every display and numeric moment; Space Grotesk at 400–500 for body.
- Signature move: Double-stroke offset borders on cards — a 3px outline plus a 6–8px offset ghost border via ::before.
- Signature move: Small ±0.5deg to ±3deg rotations on cards, blocks, and statistics for a hand-placed feel.
- Signature move: Organic blob shapes with asymmetric border-radius act as decorative frames and fills.

## International / CJK Preview Note

- If the preview uses Chinese or other CJK text, keep CJK letter-spacing at 0, loosen line-height, and avoid uppercase transforms on CJK runs.
- Use the full `design.md` CJK section after selection for exact font pairings and script-specific adjustments.

## Preview Rules

- Build exactly one title slide at 1920x1080 inside the fixed-stage model.
- Preserve the palette, type roles, surface rhythm, and decorative vocabulary described above.
- Use the user's real title/subtitle/context; do not copy demo slide content.
- The rendered preview must look like a real first slide, not a template-selection card.
- Never place internal workflow text on the slide: no `preview`, `generated from`, `preview.md`, `template`, `preset`, `style option`, `Option A/B/C`, file names, paths, or source-doc labels.
- Never place the template name or slug on the slide itself; mention it only in the chat message.
- Never place user requirement notes such as desired vibe, audience, or internal-use labels on the slide unless the user explicitly wants those exact words in the deck.
- Use only real deck content for visible chrome: deck title, real section title, date, author, company, page number, or genuine content phrases from the user material.
- Do not read `template.html` for preview generation.
- Do not read other templates' `design.md` files.
- After the user picks this template for the full deck, read the full design doc before generating final slides.
