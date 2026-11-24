# Sakura Chroma Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/sakura-chroma/design.md`
- Preview card: `bold-template-pack/templates/sakura-chroma/preview.md`

## Selection Metadata

- Slug: `sakura-chroma`
- Tagline: Vintage Japanese cassette-package aesthetic: cream paper, diagonal rainbow ribbons, condensed bold type, JIS-style spec checkboxes.
- Mood: retro, playful, kawaii-tech, warm, tactile, product-catalogue
- Tone: playful, confident, warm, tactile, 80s-Japanese-tech
- Formality: low
- Density: medium
- Scheme: light
- Best for: Anything that should feel like a vintage Japanese cassette package or a TDK / Sony / Sakura Color product catalogue: indie hardware brand decks, music-label release schedules, analog studio retrospectives, zine and magazine pitches, kawaii-tech product launches, creative-studio annual reports. Equally good for any deck wanting bold colour, condensed display type, and a tactile printed-product personality.
- Avoid for: Decks that need restrained, corporate, or quiet typography — the bold condensed lockups, ribbon stripes, and primary-colour palette are intentionally loud and product-page-y.

## Visual Snapshot

A cassette-package editorial system on warm cream paper with a six-color primary palette and warm-brown ink. Display type runs in Big Shoulders Display (condensed industrial display sans at weight 900); body in Albert Sans; tabular and tag content in JetBrains Mono; occasional Japanese accents in Noto Sans JP. The aesthetic borrows from 1970s consumer cassette packaging, Japanese print catalogues, and lo-fi product zines: petal-cluster blob clusters, diagonal multi-color ribbon bands, 12-point starburst seals, red rectangular stamps, and tracked uppercase micro-labels. The effect is hand-curated industrial editorial — warm but disciplined, playful but tightly typeset, with the cassette as its visual metaphor.

Sakura Chroma is a cassette-package editorial system that treats every slide as a printed product page from a small Japanese audio-products catalogue. The visual metaphor is total: petal-cluster blob marks, diagonal multi-color ribbon bands, 12-point starburst seals, red rectangular stamps, mono-font spec rows, color-coded chips, and equalizer-style bar charts. Everything reads as if pulled from the back-page spread of a 1970s consumer-audio brochure — warm, hand-curated, industrially typeset.

## Preview Ingredients

- Palette: paper #F1E6CB; paper-dk #E5D6B0; ink #3A2516; red #E5392A; pink #E54489; orange #F09131; green #3D9F47; blue #3F8BC4
- Typography: See full design doc after selection.
- Signature move: Warm cream paper canvas ({colors.paper}) with warm-brown ink ({colors.ink}) as structure and six primary accent colors.
- Signature move: A 4px-period halftone-dot paper texture ({components.paper-texture}) sits over every slide at 16% opacity. Required.
- Signature move: Big Shoulders Display weight 900 with negative tracking for every display moment; Albert Sans for body; JetBrains Mono for tabular / data; Noto Sans JP for Japanese accents.
- Signature move: Petal-cluster blob marks (4–5 overlapping perfect circles) as the signature decorative element.
- Signature move: Diagonal multi-color ribbon bands (5 stacked colored bars at -22° or +22°) as atmospheric layering.

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
