# Cartesian Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/cartesian/design.md`
- Preview card: `bold-template-pack/templates/cartesian/preview.md`

## Selection Metadata

- Slug: `cartesian`
- Tagline: Quiet warm-neutral palette with classical Playfair serifs; tasteful and unhurried.
- Mood: quiet, considered, elegant, warm-minimal
- Tone: classical, literary, restrained, confident-quiet
- Formality: high
- Density: low
- Scheme: light
- Best for: Anything that should feel quiet, considered, and grown-up: investment theses, white papers, advisory work, longform research, gallery / cultural decks. Also a strong choice for editorial features, founder reflections, or any deck where restraint is the message — including across tech and finance.
- Avoid for: Decks that need visual heat, multiple accents, or a sense of urgency — the warm-neutral palette is intentionally low-energy.

## Visual Snapshot

A quiet, museum-catalog editorial system built on Playfair Display serif headlines, Inter sans body, and a five-tone warm-stone palette. The aesthetic is "consulting deck meets architectural monograph" — minimal geometric line decorations (thin circles, dashed arcs, vertical and horizontal hairlines) drift behind content, suggesting drafting paper and compass work. Every divider is a single 1px line in a muted taupe; nothing is bold, nothing is loud. The cultural reference is Massimo Vignelli's editorial work, the Cooper Hewitt catalog, and pencil-and-tracing-paper urban planning documents.

Cartesian is a quiet museum-catalog editorial system. Its defining premise is restraint through 1px lines. Every structural element — list separators, agenda rules, timeline connectors, card borders, table dividers — is a single 1px line in a muted taupe {colors.line}. There are no thick borders, no fills, no shadows, no rounded surfaces. Hierarchy is built through type contrast and negative space; depth does not exist in the conventional sense.

## Preview Ingredients

- Palette: bg-primary #EDE8E0; bg-secondary #E2DBD1; text-primary #1A1A1A; text-secondary #5A5A5A; accent #8A8178; line #B8B0A4
- Typography: Playfair Display; Inter
- Signature move: Warm sandstone canvas {colors.bg-primary} with single 1px taupe {colors.line} dividers as the universal structural element.
- Signature move: Playfair Display serif at weight 400 for every headline/numeral/quote-mark; Inter sans for every body/label/attribution.
- Signature move: Five-tone monochrome palette: two stones, two grays, one ink. No vivid accent colors anywhere.
- Signature move: Decorative geometric rings (thin solid + dashed circles, 20–50% opacity) drift behind content as compass-drafted atmosphere.
- Signature move: Every label, attribution, and micro-text is uppercase Inter with 2–3px letter-spacing.

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
