# Daisy Days Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/daisy-days/design.md`
- Preview card: `bold-template-pack/templates/daisy-days/preview.md`

## Selection Metadata

- Slug: `daisy-days`
- Tagline: Cheerful pastel deck with hand-drawn daisies, stars, and rainbows. Friendly, soft, and warm.
- Mood: cheerful, playful, warm, sunny, wholesome
- Tone: friendly, soft, encouraging, approachable, lighthearted
- Formality: low
- Density: medium
- Scheme: light
- Best for: Anything that should feel friendly, soft, and joyful: educational content, kids and family, wellness programs, community workshops, creator portfolios for craft / illustration. Also lovely for an unexpected playful internal kickoff, a wedding planning deck, or any moment where warmth is the message — including across tech or business contexts.
- Avoid for: Contexts where the audience explicitly expects authority and precision — the hand-drawn pastel SVG decorations are the opposite of buttoned-up.

## Visual Snapshot

A cheerful, childlike presentation system built around the chunky display face Fredoka One and the rounded humanist sans Quicksand. The palette is a sunny garden — cream canvas, turquoise, soft pink, butter yellow, mint, lavender, peach, sky blue, and a single coral accent — with charcoal-brown 2D outlines wrapping every shape. Hard offset shadows in dark charcoal, generous border-radius, and hand-drawn SVG decorations (daisies, stars, suns, clouds, rainbows) anchor the aesthetic somewhere between a children's storybook spread and a sticker-sheet kawaii zine.

Daisy Days is a cheerful childlike presentation system rooted in a single typographic pairing: the chubby rounded display face Fredoka One for every headline, and the friendly humanist sans Quicksand for every line of body and meta text. The visual language descends from picture-book illustration and sticker-sheet kawaii: every shape carries a charcoal 2D outline, every elevated element casts a solid offset shadow, and every surface is a pastel from a sunny garden palette.

## Preview Ingredients

- Palette: cream #F5F0E6; turquoise #7ECDC0; soft-pink #F7C8D4; butter #FDE68A; mint #A8E6CF; lavender #D4A5E8; peach #FFCBA4; sky #A8D8F0
- Typography: See full design doc after selection.
- Signature move: Cream ({colors.cream}) default canvas with rotating pastel surfaces — every slide may pick a different surface color.
- Signature move: Fredoka One for all headline / display / quote text; Quicksand 500/600 for all body and meta text.
- Signature move: Every shape and card carries a 3px solid charcoal outline ({colors.text-dark}) plus a hard offset shadow ({shadows.default} or {shadows.small}).
- Signature move: Generous border-radius: 20px on standard cards, 28px on featured cards, pill ({spacing.radius-pill}) on badges, full circle on dots and avatars.
- Signature move: Hand-drawn SVG ornaments (daisies, stars, suns, clouds, rainbows) cluster at corners and crop past slide edges as atmospheric layer.

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
