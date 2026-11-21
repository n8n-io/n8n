# Neo-Grid Bold Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/neo-grid-bold/design.md`
- Preview card: `bold-template-pack/templates/neo-grid-bold/preview.md`

## Selection Metadata

- Slug: `neo-grid-bold`
- Tagline: Editorial neo-brutalism with a single neon yellow accent on off-white paper.
- Mood: confident, punchy, editorial, modern
- Tone: bold, minimal, design-led, graphic
- Formality: medium
- Density: high
- Scheme: light
- Best for: Anything that should feel confident and editorial-graphic: design-led pitches, brand work, founder talks, conference keynotes. Excellent for stat-heavy slides, comparisons, and process flows. Just as strong for tech, research, or finance when the speaker wants to read as design-led rather than corporate.
- Avoid for: Contexts that need to feel quiet, traditional, or warm — the neon-yellow accent and uppercase display commit to a confident editorial voice.

## Visual Snapshot

A heavy editorial poster system built on a strict 12-column × 8-row block grid with neon-yellow accents on putty-ecru. Space Grotesk at weight 700 in strict uppercase carries every display moment; JetBrains Mono carries every label and metadata tag. Each slide reads as a magazine spread divided into colored panels — paper-ecru, ink-black, and electric lemon-yellow trading roles across cells. The aesthetic borrows from contemporary editorial print, brutalist annual reports, and the populist-poster end of design week showcases.

Neo-Grid Bold is a heavy editorial poster system built on a single structural premise: every slide is a 12-column × 8-row CSS grid inset 40px from the slide edges, with 12px gaps between cells. Composition happens by assigning colored panels to grid spans — grid-column: 4 / span 5 and grid-row: 1 / span 5 is how layout is described. The grid is rigid; the visual variety comes from how panels of {colors.paper}, {colors.ink}, and {colors.accent-lemon} are arranged across cells.

## Preview Ingredients

- Palette: paper #F5F4EF; bg #ECECE8; ink #0A0A0A; accent-lemon #E6FF3D; muted #8A8A85; stage-bg #1A1A1A
- Typography: Space Grotesk; JetBrains Mono
- Signature move: Universal 12-column × 8-row CSS grid ({components.frame}) inset 40px from each slide edge, with 12px gaps between cells.
- Signature move: Three-color panel system: paper ecru ({colors.paper}) as default, ink black ({colors.ink}) for inverted blocks, accent lemon ({colors.accent-lemon}) for signal blocks.
- Signature move: Space Grotesk weight 700 uppercase with negative letter-spacing for every display element.
- Signature move: JetBrains Mono uppercase with 0.08–0.12em tracking for every label, page number, axis tag.
- Signature move: A signature corner-mark and blockmark — small 2×2 block stamps that act as decorative identity tags.

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
