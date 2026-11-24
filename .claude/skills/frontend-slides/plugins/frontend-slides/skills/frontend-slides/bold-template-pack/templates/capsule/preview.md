# Capsule Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/capsule/design.md`
- Preview card: `bold-template-pack/templates/capsule/preview.md`

## Selection Metadata

- Slug: `capsule`
- Tagline: Modular pill-shaped cards on warm bone with a full pastel-pop palette.
- Mood: playful, modern, warm, fresh, fun
- Tone: upbeat, graphic, approachable, cool
- Formality: medium-low
- Density: medium
- Scheme: light
- Best for: Anything that should feel modular, modern, and a little Y2K: lifestyle brands, creator portfolios, DTC launches, beauty / wellness, agency credentials. Also fun for a playful tech demo or a research deck that wants pop-art clarity instead of gravitas.
- Avoid for: Contexts that require traditional institutional weight — the capsule shapes and pastel pops actively soften authority.

## Visual Snapshot

A playful editorial system built on pill-shaped containers, a sun-bleached cream canvas, and a nine-color candy palette. Bodoni Moda serif headlines pair with Space Grotesk body to suggest a literary magazine that took a holiday at a 1970s ice-cream parlor. Every container that holds text is a pill (border-radius 9999px) outlined with a 2px ink stroke, casting a soft 6–12px offset shadow. The aesthetic is "Memphis-meets-editorial" — confident typography, generous bordered shapes, and decorative floating pills as atmospheric wallpaper.

Capsule is a playful editorial system whose defining structural premise is the pill: every text container is a pill, every icon is a pill, every bar is a pill, every node in a diagram is a pill. The border-radius: 9999px rule applies to virtually all UI elements, with larger panels softening to a 2rem radius. Combined with the 2px ink outline that wraps every shape, the result is a system where containers feel inflated, friendly, and graphically distinct — a nod to Memphis design and late-70s ice-cream-parlor signage without abandoning editorial discipline.

## Preview Ingredients

- Palette: cream #F5F5F0; ink #1A1A1A; outline #1E1E1E; white #FFFFFF; coral #E85D4E; lime #C4D94E; lavender #C5B5E0; sky #8BB4F7
- Typography: Bodoni Moda; Space Grotesk
- Signature move: Universal pill geometry — border-radius: 9999px for small containers, 2rem for larger cards/frames.
- Signature move: 2px solid {colors.outline} stroke wraps every pill, icon, and card.
- Signature move: Bodoni Moda serif for every display/headline/stat; Space Grotesk sans for every body/label/pill text.
- Signature move: Sun-bleached cream canvas {colors.cream} with soft radial glows in candy accent colors at 6–15% opacity for background atmosphere.
- Signature move: Hard-offset shadows in low-opacity ink ({colors.shadow}) at 4/6/8/12px offsets, always solid, always bottom-right.

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
