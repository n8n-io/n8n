# Long Table Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/long-table/design.md`
- Preview card: `bold-template-pack/templates/long-table/preview.md`

## Selection Metadata

- Slug: `long-table`
- Tagline: Warm cream and rust-red supper-club aesthetic with bold uppercase grotesk headlines, Fraunces serifs, and pill-shaped outlined buttons.
- Mood: warm, intimate, modern, friendly, small-batch, social, hospitality
- Tone: warm, playful, considered, social, magazine-friendly, modern-editorial
- Formality: medium
- Density: medium
- Scheme: light
- Best for: Anything that should feel like a warm, intimate, modern hospitality / community brand: supper clubs, dinner series, small restaurants, creative-studio events, membership pitches, lifestyle and wine brands. Equally good for any deck wanting a single warm accent colour, mixed-weight typography, and a social-media-aware modern-editorial voice.
- Avoid for: Decks that need corporate polish, technical density, or a cold / minimalist register — the rust-red palette and bold serif mix are intentionally warm and people-facing.

## Visual Snapshot

A warm, single-ink editorial system in the register of a supper-club poster, a small-batch zine, or a Risograph-printed program. The entire system runs in one ink color — a warm rust terracotta (#B53D2A) — on a buttery cream paper ground (#FAF1E2), with a subtle 4px radial-dot texture overlay giving the surface its "printed paper" quality. Display type runs in Bricolage Grotesque at weight 700–800 in uppercase; body and metadata run in Fraunces serif at weight 400–600 with optical-size axis engaged. Pill buttons, outlined edition badges, italic-edition numerals, and dashed/solid 1.5px borders complete the printed-program vocabulary.

Long Table is a single-ink editorial system in the register of a supper-club poster, a Risograph zine, or a small-press dinner program. The foundational premise is monochromatic: every visible mark in the system — every headline, every paragraph, every border, every rule, every pill, every page number — is rendered in a single warm rust terracotta ink ({colors.ink} — #B53D2A) on a buttery cream paper ground ({colors.paper} — #FAF1E2). The only chromatic variation is opacity: the same ink at 100% for primary marks, at 78% for de-emphasized metadata, at 32% for dashed internal dividers, at 10% for the paper-texture dots.

## Preview Ingredients

- Palette: paper #FAF1E2; paper-d #F2E5CF; paper-vd #E8D7B6; ink #B53D2A; ink-dp #8E2D1F; rule #B53D2A
- Typography: See full design doc after selection.
- Signature move: Bricolage Grotesque at weights 700 and 800 in strict uppercase carries every display moment — covers, headlines, card titles, course names, quote bodies, info values, who-tags. Bricolage is a wide, slightly-condensed grotesque with strong personality; its upp...
- Signature move: Fraunces at weight 400–600 carries every body paragraph, every metadata field, every pill, every page number, every edition label. Italic Fraunces is the default body style — the slanted serif is the system's body voice, lending warmth and editorial personali...
- Signature move: One ink color ({colors.ink} — warm rust terracotta) on cream paper ({colors.paper}). Opacity variants are the only color variation.
- Signature move: Bricolage Grotesque weight 700–800 uppercase for every display moment; Fraunces 400–600 italic-default for every body and metadata moment.
- Signature move: Subtle 4px radial-dot paper texture on every slide via .stage::before — invisible at distance, present up close.

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
