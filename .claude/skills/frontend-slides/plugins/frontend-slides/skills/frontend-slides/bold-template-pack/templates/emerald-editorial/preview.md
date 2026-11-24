# Emerald Editorial Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/emerald-editorial/design.md`
- Preview card: `bold-template-pack/templates/emerald-editorial/preview.md`

## Selection Metadata

- Slug: `emerald-editorial`
- Tagline: A magazine-cover business deck: emerald + navy + paper, double-rule masthead ornaments, and a bold Bodoni-style display serif.
- Mood: editorial, considered, confident, magazine-cover
- Tone: literary, authoritative, warm, designed
- Formality: medium-high
- Density: medium
- Scheme: mixed
- Best for: Anything that should feel like the front of a serious magazine, including but not limited to leadership readouts, planning-office reviews, and strategy briefings. The double-rule masthead ornament gives it editorial gravitas without making it stiff — also a great unexpected pick for product launches or research recaps that want to feel considered rather than corporate.
- Avoid for: Contexts that need to read as quiet, neutral, or institutionally restrained — the emerald field is too saturated to disappear into the background.

## Visual Snapshot

A bold display-serif editorial system in the register of a fashion masthead or vintage magazine cover. Bodoni Moda runs at weight 900 across a wide scale (44–460px), set against a saturated emerald-green canvas with deep navy ink and oat-paper accents. The signature treatment is a stacked double-rule ornament that brackets centered display words like a 19th-century theatrical playbill. The aesthetic borrows from Harper's Bazaar / Vogue / Wallpaper covers: confident, theatrical, paper-and-ink committed, with a tight three-color palette and zero gradients or shadows.

Emerald Editorial is a bold display-serif editorial system rooted in the visual language of fashion magazines and 19th-century theatrical playbills. The foundational premise is a single typographic face — Bodoni Moda at weight 900 — used at unapologetic scale: 92px for routine headlines, 130–200px for statements and section openers, and 460px for hero numerals. The serif is loud, theatrical, and confident. Every slide leads with type, not with image.

## Preview Ingredients

- Palette: bg #3CD896; bg-2 #2DC684; bg-3 #25B377; ink #0F1A5C; ink-2 #1B2774; ink-3 #3A4593; paper #F1E9D6
- Typography: See full design doc after selection.
- Signature move: Bodoni Moda at weight 900 for every display moment; Manrope at weight 500/700/800 for every body and label moment.
- Signature move: Saturated emerald canvas ({colors.bg}) with deep navy ink ({colors.ink}) text and inverse panels.
- Signature move: Double-rule ornament with centered serif word is the signature decorative device.
- Signature move: 4px ink horizontal rules separate every stacked section, every list row, every chart border. The 4px weight is the system's default rule.
- Signature move: No corner radius anywhere. Every shape is a strict rectangle, except for the round logo/typographic glyphs themselves.

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
