# Stencil & Tablet Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/stencil-tablet/design.md`
- Preview card: `bold-template-pack/templates/stencil-tablet/preview.md`

## Selection Metadata

- Slug: `stencil-tablet`
- Tagline: Bone paper with stencil-cut headlines and a six-color earth palette: archaeology meets brand.
- Mood: archival, earthy, tactile, considered, graphic
- Tone: weighty, considered, tactile, literary
- Formality: medium-high
- Density: medium
- Scheme: light
- Best for: Anything that should feel archival, tactile, and weighty-graphic: museum and cultural-institution decks, art / architecture brands, longform research, heritage and craft brands, manifestos. A great choice anytime — including across tech and business — when you want the deck to feel like a field manual rather than a slide deck.
- Avoid for: Contexts that demand digital-native polish or playful pop — the stencil-cut display and earth-tone palette commit to a deliberate analog feel.

## Visual Snapshot

A West Coast skate-poster meets municipal stencil signage system. Stardos Stencil carries every headline, numeral, and chunky display moment with its characteristic ink-break gaps; Barlow Condensed runs all metadata and uppercase chrome at extra-heavy weights; Inter handles body. The palette is bone (#E2DCC9) and black, energized by a saturated retro-print accent set — sienna, magenta, orange, teal, blue, mustard, olive. Soft rounded "tablet" cards (22–26px radius) tile across slides in colored blocks. Type runs huge and uppercase, numerals dominate at 160–540px, and color blocks act as the layout. The mood is industrial poster, vintage workshop sign, and music festival lineup all at once.

Stencil & Tablet is a poster-loud, type-led presentation system. The premise is a single display face — Stardos Stencil — handling every headline, every numeral, every featured moment, with characteristic stencil ink-breaks giving each glyph a slightly-distressed industrial register. The supporting cast is Barlow Condensed (extra-heavy 600–900, uppercase, generous tracking) running all metadata, chrome, pills, and legends — and Inter handling the small set of body paragraphs that exist mostly to caption the loud type above them.

## Preview Ingredients

- Palette: bone #E2DCC9; black #000000; ink #0A0A0A; paper #F4EFE0; sienna #A06A3C; magenta #C73B7A; orange #EE7A2E; teal #2D7E73
- Typography: Stardos Stencil; Bowlby One; Barlow Condensed; Inter
- Signature move: Bone ({colors.bone}) field on most slides; black field with bone type on agenda-style and bold-divider slides.
- Signature move: Stardos Stencil for every headline, every numeral, every featured stencil moment — the ink-break stencil glyphs are the system's identity.
- Signature move: Barlow Condensed extra-heavy uppercase for all chrome, metadata, pills, legends, and labels. Generous letter-spacing (0.06–0.14em).
- Signature move: Inter for body — small role, supporting the loud type above.
- Signature move: Seven-color accent palette ({colors.sienna}, {colors.magenta}, {colors.orange}, {colors.teal}, {colors.blue}, {colors.mustard}, {colors.olive}) plus paper ({colors.paper}) — used as full card fills.

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
