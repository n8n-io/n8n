# Bold Poster Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/bold-poster/design.md`
- Preview card: `bold-template-pack/templates/bold-poster/preview.md`

## Selection Metadata

- Slug: `bold-poster`
- Tagline: Editorial poster aesthetic with massive Shrikhand display and a single fire-engine red accent.
- Mood: bold, editorial, loud, confident
- Tone: dramatic, graphic, sharp, intentional
- Formality: medium
- Density: low
- Scheme: light
- Best for: Anything that should land like a magazine cover: brand manifestos, founder vision decks, editorial / cultural pitches, creative reviews. Excellent any time you want a few words to feel like a poster — including unexpected fits like a tech keynote or a finance manifesto that wants to be quotable.
- Avoid for: Decks that need to communicate dense information per slide — the layout is built around a few large statements, not paragraphs of detail.

## Visual Snapshot

A populist editorial poster system that mashes vintage Italian sports-magazine display lettering with classical serif body and tight monospace metadata. The display face is Shrikhand — a heavy slab/script hybrid with playful italic personality — rendered at poster scale (often 200-320px) and routinely tilted off-axis. Body runs Libre Baskerville for a literary editorial register; Space Grotesk handles tiny uppercase labels and chrome. The palette is uncompromising: white canvas, deep brown-black ink (#1C1410), single saturated tomato red (#D8000F), and a warm off-white (#F5F2EF) for alternating panels. Borders are bold 1.5-3px ink rules; the only shadow is a single stacked offset behind red display text. The aesthetic is loud, confident, and unmistakably print-poster — closer to a 1970s European brand annual report or a wine merchant's catalogue than a contemporary slide deck.

Bold Poster is a populist editorial poster system that lifts its visual vocabulary from vintage Italian sports magazines, mid-century European brand annual reports, and wine-merchant catalogues. The premise is that every slide should feel printed — set in heavy display type, locked to one strong red accent, on a white or off-white sheet, with grids ruled in ink and decoration kept to a strict minimum.

## Preview Ingredients

- Palette: bg #FFFFFF; dark #1C1410; red #D8000F; light #F5F2EF
- Typography: See full design doc after selection.
- Signature move: White ({colors.bg}) canvas alternating with off-white ({colors.light}) panels for striping, plus dark ({colors.dark}) and red ({colors.red}) full-bleed panel surfaces for statement moments.
- Signature move: Single tomato red ({colors.red}) as the only accent — used for every numerical figure, every section rule, every label, every left-bar marker.
- Signature move: Three-face stack: Shrikhand (display + numerical), Libre Baskerville (body), Space Grotesk (mono labels + bullets + chrome).
- Signature move: Display Shrikhand is routinely tilted (-6° to +2°) — the rotation is the system's signature movement.
- Signature move: Heavy ink borders: 3px on tabular grid containers, 1.5-2px on cells, 4px red on editorial leftbar cards, 1px hairlines between bullet rows.

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
