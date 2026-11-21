# Biennale Yellow Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/biennale-yellow/design.md`
- Preview card: `bold-template-pack/templates/biennale-yellow/preview.md`

## Selection Metadata

- Slug: `biennale-yellow`
- Tagline: Solar yellow on warm parchment with deep indigo serif and atmospheric sun-glow gradients.
- Mood: editorial, atmospheric, warm, cultural-institution, poster-like
- Tone: literary, considered, contemplative, warm-modern, Dutch-editorial
- Formality: high
- Density: medium
- Scheme: light
- Best for: Anything that should feel like an art-biennale poster or a museum's annual programme: exhibition decks, arts-institution announcements, design conference brochures, curatorial pitches, literary publications, studio retrospectives. Equally good for any deck wanting Dutch-editorial atmosphere with an unmistakable single-color signature.
- Avoid for: Decks that need visual punch or saturated multi-color energy — the warm-paper canvas and one-yellow palette are intentionally quiet and atmospheric.

## Visual Snapshot

A literary-editorial presentation system in the visual register of an art biennale catalogue or quiet exhibition poster. The aesthetic is built on warm parchment grounds (#E9E5DB) flooded with soft solar yellow (#F1EE2E) radial blooms, set against a single deep indigo navy ink color. Display type is Instrument Serif — a contemporary high-contrast serif with tall ascenders and elegant italics — paired with Archivo for sans-serif chrome and JetBrains Mono for numerical and metadata callouts. No drop shadows, no rounded corners, no bordered cards: the only structural lines are hairline 1px rules in ink. The mood sits between a folded museum brochure, a slow-reading literary quarterly, and a Mediterranean exhibition poster — confident, atmospheric, and deeply restrained.

Biennale Yellow is a literary-editorial presentation system modeled on the visual language of European art biennale catalogues, slow exhibition posters, and quarterly literary publications. There are no cards, no buttons, no shadows, no rounded corners. The structural vocabulary is just three things: paper, ink, and yellow.

## Preview Ingredients

- Palette: paper #E9E5DB; paper-deep #DCD6C4; sun #F1EE2E; sun-soft #F8F39B; haze #F0DA7C; ink #1B2566; ember #E26B4A
- Typography: See full design doc after selection.
- Signature move: Warm parchment ground ({colors.paper}) on every surface; never white, never gray.
- Signature move: Single ink color ({colors.ink}) for all text and all rules — no secondary text colors.
- Signature move: Solar yellow ({colors.sun}) deployed three ways: as a flooded panel, as a soft radial bloom, as a translucent geometric tile underprint.
- Signature move: Instrument Serif handles every display moment at scales from 40px to 720px+.
- Signature move: Archivo Bold uppercase + 0.16–0.32em tracking is the universal label voice.

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
