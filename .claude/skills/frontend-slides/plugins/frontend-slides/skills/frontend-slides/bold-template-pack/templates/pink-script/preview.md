# Pink Script — After Hours Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/pink-script/design.md`
- Preview card: `bold-template-pack/templates/pink-script/preview.md`

## Selection Metadata

- Slug: `pink-script`
- Tagline: Black canvas, hot pink accent, pearl-cream paper, Instrument Serif headlines: late-night editorial luxury.
- Mood: nocturnal, moody, intentional, luxe, expressive
- Tone: literary, sultry, considered, magazine
- Formality: medium-high
- Density: low
- Scheme: dark
- Best for: Anything that should feel nocturnal, intentional, and a little luxe: fashion brand decks, creator personal brands, after-hours / nightlife / spirits launches, luxury product reveals, editorial features. Also a striking unexpected pick for a tech keynote, research synthesis, or business pitch that wants to land with magnetic confidence.
- Avoid for: Daytime corporate-professional and traditional B2B contexts where the dark canvas with hot-pink accent reads as too styled or too expressive.

## Visual Snapshot

A nocturnal couture editorial system rendered in hot fuchsia ink on dim warm-black paper, with a soft film-grain overlay and a hairline interior frame. DM Serif Display carries every script and editorial moment at sizes up to 600px; Inter at weight 300 carries the body voice; JetBrains Mono carries the boutique-catalog metadata. The aesthetic borrows from glossy fashion magazine spreads, late-night perfume advertising, and the editorial pages of high-end zines — closer to a Maison's seasonal lookbook than a startup deck.

Pink Script is a nocturnal couture editorial system built on a single atmospheric premise: a deep warm-black surface lit from the upper-left by a slightly warmer #1A1218 ellipse that fades to near-black across the lower-right. The off-center light source reads as a studio softbox catching one corner of a magazine spread. Over this, a subtle film-grain overlay at 8% opacity with screen blend adds the photographic graininess of late-night editorial photography. Inside this surface sits a 1px hairline interior frame (paper-blush at 14% opacity, inset 36px from each edge) — the editorial border of every page. Without the lit gradient, the film grain, and the interior frame, the system collapses...

## Preview Ingredients

- Palette: ink-deep #060507; ink-violet #0F0D11; paper-blush #F5EDF1; pink #ED3D8C; pink-light #FF66A8; pink-deep #B81D67
- Typography: DM Serif Display; Inter; JetBrains Mono
- Signature move: Deep warm-black surface ({components.slide-surface}) lit from the upper-left by a radial gradient ellipse.
- Signature move: A subtle film-grain overlay ({components.film-grain}) on every slide — opacity 0.08, screen blend.
- Signature move: A 1px paper-blush interior frame ({components.hairline-frame}) inset 36px from each edge, present on every slide.
- Signature move: Hot fuchsia pink ({colors.pink}) is the single chromatic accent — used as script color, kicker color, line color, pill outline, inline emphasis, and the soft halo behind hero scripts.
- Signature move: DM Serif Display carries every editorial moment, scaling from 32px to 600px. There is no second display face.

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
