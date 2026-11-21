# Broadside Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/broadside/design.md`
- Preview card: `bold-template-pack/templates/broadside/preview.md`

## Selection Metadata

- Slug: `broadside`
- Tagline: Dark editorial canvas with a single fire orange accent and bilingual Latin/Chinese type stack.
- Mood: editorial, dramatic, loud, newspaper
- Tone: graphic, punchy, literary, considered
- Formality: medium-high
- Density: medium
- Scheme: dark
- Best for: Anything that should land like a broadside newspaper headline: brand manifestos, magazine and cultural pitches, design talks, bilingual EN/CN decks, founder vision statements. Also a striking pick for tech, research, or business decks that want a dramatic single-accent editorial feel.
- Avoid for: Decks that need to feel quiet, warm, or institutionally traditional — the dark canvas with fire-orange accent commits to drama.

## Visual Snapshot

A protest-poster editorial system built on massive Barlow type and a single fire-orange environment color. The aesthetic is "ink on fire" — dark slides for documentation, orange slides for declaration. Display type is enormous (13vw, roughly 187px at 1440 width) in weight 900 lowercase, treating words as graphic elements rather than reading copy. The cultural reference is broadside printing, SPACE10 reports, and Wim Crouwel grids reinterpreted with one loud color and zero decoration.

Broadside is a protest-poster editorial system. The defining premise: type is so large it stops behaving as text and starts behaving as graphic primitive. Display sizes at 13vw ({typography.display}) put a single word at roughly 187px on a 1440-wide screen — wide enough that the eye scans letterforms before reading. This is the system's primary expressive instrument.

## Preview Ingredients

- Palette: ink-black #111111; ink-black-alt #1A1A18; fire-orange #E85D26; cream #F0ECE5; cream-muted #888880; cream-hint #505048; border-dark #282826
- Typography: Barlow; IBM Plex Mono; {typography.label.fontFamily}
- Signature move: Massive Barlow display type at weight 900 in lowercase — never uppercase on display elements.
- Signature move: Two-register color system: dark slides with cream text, or orange slides with dark ink. No cream/white slides exist.
- Signature move: {colors.fire-orange} is both accent (on dark) and environment (on orange) — never a secondary color, always *the* color.
- Signature move: Single-typeface system on Barlow + IBM Plex Mono for chrome only. No serif, no script, no third face.
- Signature move: 1px hairline dividers ({colors.border-dark} on dark; rgba(17,17,17,0.2) on orange) provide all hierarchy structure.

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
