# Mat Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/mat/design.md`
- Preview card: `bold-template-pack/templates/mat/preview.md`

## Selection Metadata

- Slug: `mat`
- Tagline: Dark sage canvas with bone paper and burnt-orange accent; mid-century modern with wood undertones.
- Mood: warm-modern, considered, tactile, mid-century
- Tone: warm, design-led, intentional, considered
- Formality: medium
- Density: medium
- Scheme: mixed
- Best for: Anything that should feel mid-century, tactile, and intentional: design studio credentials, architecture / interior brands, ceramics / craft / furniture, advisory decks. Also a warm, distinctive choice for tech, research, or business decks that want a considered analog feel instead of digital-cool.
- Avoid for: Contexts that need fast tech energy or institutional restraint — the muted sage and burnt-orange palette is intentionally warm and slow.

## Visual Snapshot

A warm, material-tactile presentation system inspired by a high-end product landing page. Dark forest green is the dominant environment, warmed by a low atmospheric wood-brown glow from the bottom-right corner of every dark slide. Cream type floats directly on the field; warm orange acts as the single accent. The typeface stack pairs Bricolage Grotesque (a heavy, rounded grotesque) for display with DM Sans for body and DM Mono for labels — the result reads as industrial-design portfolio meets boutique product launch, never tech demo.

Mat is a material-tactile presentation system built around a single environmental premise: a deep forest-green surface warmed from the bottom-right corner by a low wood-brown glow. The atmosphere does the heavy lifting — before any content lands, the slide already feels like a workbench in afternoon light. Cream type floats directly on the green field; there are no cards, no panels, no frames. Where the system needs to break the green, it does so with a single cream inset box (the info-card) that reads as a piece of warm paper laid on the dark surface.

## Preview Ingredients

- Palette: bg-dark #232E26; bg-dark-alt #2E3D30; bg-cream #EDE6D0; bg-cream-alt #E4DAC4; ink-cream #F0E8D2; ink-dark #1E2820; accent-orange #C07030; wood-glow #7A4E24
- Typography: Bricolage Grotesque; DM Sans; DM Mono; {typography.label.fontFamily}
- Signature move: Dark forest green canvas ({colors.bg-dark}) with a warm wood-brown radial glow ({components.atmospheric-glow}) anchored to the bottom-right corner of every dark slide.
- Signature move: Cream text ({colors.ink-cream}) floats directly on the green field with no card, panel, or frame around it.
- Signature move: Bricolage Grotesque display type is always mixed case — never uppercase. Uppercase is reserved for DM Mono labels.
- Signature move: A single accent color, warm orange ({colors.accent-orange}), used only as small inline emphasis (kicker, bullet marker, inline <em>, quote glyph, one chart bar).
- Signature move: The cream info-card ({components.info-card}) is the signature material-contrast component — a warm paper rectangle inset on the dark field.

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
