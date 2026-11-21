# Editorial Tri-Tone Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/editorial-tri-tone/design.md`
- Preview card: `bold-template-pack/templates/editorial-tri-tone/preview.md`

## Selection Metadata

- Slug: `editorial-tri-tone`
- Tagline: Three-color editorial system: dusty pink, mustard cream, and deep burgundy, set in Bricolage + Instrument Serif.
- Mood: editorial, warm, intentional, moody
- Tone: literary, warm, considered, stylish
- Formality: medium-high
- Density: medium
- Scheme: mixed
- Best for: Anything that should feel like a fashion-magazine spread: editorial pitches, fashion brand decks, lifestyle media, art direction reviews. Equally good for any deck — including tech, research, or business — that wants tri-tone discipline and serif/sans contrast instead of the usual neutrals.
- Avoid for: Decks that need to read as soft or comforting — the burgundy/pink/cream tri-tone is intentionally high-contrast and styled.

## Visual Snapshot

A literary magazine-meets-annual-report presentation system built on a strict three-color palette — blush pink, golden butter, and deep burgundy wine. Despite having eleven CSS variable names, only three hex values exist in the entire system; every alias is a semantic rename of one of those three. Headlines run Bricolage Grotesque (a variable grotesque with an optical-size axis) at extreme weights and negative letter-spacing. Instrument Serif (italic-cut only) appears as the expressive accent face for chapter numerals, pull-quotes, years, and signatures. JetBrains Mono carries all metadata, labels, and section markers at tight uppercase tracking. The aesthetic is "independent arts publication" — the kind with a colophon, hand-numbered editions, and an editorial desk.

Editorial Tri-Tone is a literary magazine presentation system built on the strictest possible palette: three hex values, eleven CSS variable names. The naming system reveals editorial intent — --pink and --sky point at the same blush; --cream, --butter, --lime, and --terracotta all resolve to the same golden yellow; --burgundy, --navy, --forest, and --ink all collapse to the same deep wine. The aliases exist to communicate the role of the color in context, not to introduce variation.

## Preview Ingredients

- Palette: pink #F2B6C6; butter #F2D86A; burgundy #7A1F35
- Typography: Bricolage Grotesque; Instrument Serif; JetBrains Mono
- Signature move: Three-color palette with semantic aliases: blush pink (#F2B6C6), golden butter (#F2D86A), deep burgundy (#7A1F35).
- Signature move: Mixed typography: Bricolage Grotesque grotesque for display and body; Instrument Serif for expressive accent numerals, quotes, and years; JetBrains Mono for all labels.
- Signature move: The em tag within Bricolage Grotesque headlines always triggers a switch to Instrument Serif italic — the system's primary typographic mix.
- Signature move: Pills (border-radius 999px) are the universal tag component; used at three different sizes across cover, chart legend, and closer.
- Signature move: Value cards have a generous 28px border-radius — soft, rounded, not brutalist.

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
