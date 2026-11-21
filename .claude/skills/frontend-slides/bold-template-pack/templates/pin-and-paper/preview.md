# Pin & Paper Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/pin-and-paper/design.md`
- Preview card: `bold-template-pack/templates/pin-and-paper/preview.md`

## Selection Metadata

- Slug: `pin-and-paper`
- Tagline: Yellow paper with safety-pin illustrations, ink-blue handwritten Caveat, paper-grain texture.
- Mood: crafted, handmade, warm, thoughtful, literary
- Tone: literary, intimate, warm, grounded
- Formality: medium
- Density: medium
- Scheme: light
- Best for: Anything that should feel hand-crafted, warm, and literary: qualitative research findings, founder reflections, longform brand stories, workshop debriefs. The signature safety-pin illustrations and paper-grain texture make it especially good for any deck — including tech or business — that wants personality and warmth over polish.
- Avoid for: Decks that need to feel digital-native polished or rigorously data-driven — handwritten Caveat is intentionally informal.

## Visual Snapshot

A field-notebook editorial system rendered as yellow legal-pad paper with deep cobalt-blue ink. Every slide carries a fractalnoise paper-grain overlay, hand-drawn safety-pin SVG illustrations that "pin" cards to the page, and a hand-script Caveat face for personal annotations. Space Grotesk at heavy weights carries the printed headlines; DM Mono handles archival labels. The aesthetic borrows from analog field reports, vintage public-notice boards, and the diary pages of scientific notebooks — closer to a lab journal pinned to a corkboard than a polished deck.

Pin & Paper is a field-notebook editorial system built on a single material premise: every slide is yellow legal-pad paper. The paper is rendered through a base color ({colors.paper} — saturated cadmium yellow), two soft radial-gradient highlights (upper-left light, lower-right shadow), and a non-optional fractal-noise grain overlay on a ::before pseudo-element with multiply blend. This stack creates a surface that reads as physical paper under raking light. Without the grain, the system collapses into flat cartoon-yellow; the texture is foundational, not decorative.

## Preview Ingredients

- Palette: paper #EFE56A; paper-2 #F5ECA0; paper-3 #E8D85A; paper-extra #FBE6A4; cream #F8F1D6; kraft #C9A66B; ink #1F3A8A; ink-soft #2D4FB8
- Typography: Space Grotesk; Caveat; DM Mono
- Signature move: Yellow paper background ({components.paper-surface}) with two layered radial gradients and a non-optional fractal-noise grain overlay ({components.paper-grain-overlay}) on every slide.
- Signature move: Deep cobalt-blue ink ({colors.ink}) as the universal text, border, divider, and pin-illustration color.
- Signature move: Cream card surfaces ({colors.cream}) with 1.5px ink borders, 4px micro-radius, and a hard ink-blue offset shadow (5px–6px, zero blur).
- Signature move: Hand-drawn safety-pin SVG illustrations ({components.pin-illustration}) — closed and open variants — pinned to cards at slight rotation angles.
- Signature move: Three-voice typography: Space Grotesk for print headlines, Caveat hand-script for personal voice, DM Mono for archival labels.

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
