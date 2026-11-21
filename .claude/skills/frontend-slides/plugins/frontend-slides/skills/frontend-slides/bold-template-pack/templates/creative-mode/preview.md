# Creative Mode Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/creative-mode/design.md`
- Preview card: `bold-template-pack/templates/creative-mode/preview.md`

## Selection Metadata

- Slug: `creative-mode`
- Tagline: Cream paper canvas with confident multi-color (green, pink, orange, yellow) accents and Archivo Black display.
- Mood: creative, confident, playful, design-led
- Tone: graphic, expressive, modern
- Formality: medium
- Density: medium-high
- Scheme: light
- Best for: Anything that should feel design-led and confident: creative agency pitches, design studio decks, ad shop credentials, brand creative reviews, art-direction reviews. Also a great unexpected pick for a tech talk, research findings, or finance review when the speaker wants to lead with taste rather than convention.
- Avoid for: Contexts that demand institutional restraint and a quiet authority — the saturated multi-accent palette will read as expressive, not formal.

## Visual Snapshot

A neo-brutalist editorial presentation system built for 1920x1080 slides. The deck anchors on a warm cream canvas with heavy 4px ink borders, hard offset drop-shadows, and a bold four-color accent palette (forest green, hot pink, burnt orange, sunshine yellow). Display headlines run Archivo Black in pure uppercase — aggressive, loud, zero letter-spacing softness. Monospace labels in JetBrains Mono echo a typesetting rule-sheet. Body copy sits in Space Grotesk. Every slide uses flat color-blocking with no gradients, no rounded cards, and no subtlety. The aesthetic is part Bauhaus grid, part punk zine, part Swiss editorial.

Creative Mode is a neo-brutalist editorial slide system for 1920x1080 presentations. The foundational aesthetic choice is restraint of technique paired with aggression of expression: no rounded cards, no gradients, no shadows that suggest light sources — only flat color-blocking and hard offset drop-shadows (the "Risograph" or "screen-print" kind where the shadow is a sold same-color offset).

## Preview Ingredients

- Palette: cream #EFE9D9; cream-2 #E4DCC4; ink #0F0F0F; ink-2 #2A2A2A; green #1F8A4C; green-dark #136636; pink #F06CA8; pink-dark #D14E8B
- Typography: Archivo Black; Space Grotesk; JetBrains Mono
- Signature move: Cream canvas ({colors.cream} — #EFE9D9) as the universal background; green ({colors.green} — #1F8A4C) used for the closing slide only.
- Signature move: 4px solid ink borders on every structural element — cards, panels, table cells, chart axes.
- Signature move: Hard offset box-shadows in place of blurred drops: 24px 24px 0 color, 24px 24px 0 4px ink on featured blocks.
- Signature move: Archivo Black display type in uppercase with 0.92 line-height for extreme tightness.
- Signature move: Four accent colors used as flat fills; each slide uses two or three of the four, never all simultaneously.

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
