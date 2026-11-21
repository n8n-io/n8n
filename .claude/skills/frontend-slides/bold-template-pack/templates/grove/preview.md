# Grove Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/grove/design.md`
- Preview card: `bold-template-pack/templates/grove/preview.md`

## Selection Metadata

- Slug: `grove`
- Tagline: Forest-green canvas with cream type, classical Playfair serifs, and a single rust accent.
- Mood: organic, considered, warm, literary, natural
- Tone: classical, warm, considered, patient
- Formality: medium-high
- Density: medium
- Scheme: mixed
- Best for: Anything that should feel organic, considered, and grown-up: sustainability and wellness brands, outdoor / nature products, wineries and restaurants, literary or arts decks, advisory deliverables, bilingual EN/CN reports. Also a calm, distinctive choice for tech, research, or business decks that want patience over urgency.
- Avoid for: Decks that need neon energy or rapid-fire pop — the forest-green canvas and Playfair serif commit to a slow, classical voice.

## Visual Snapshot

A quiet, editorial-serif presentation system in the register of a well-bound monograph or boutique brand book. Playfair Display at weight 400 (never bold) carries every headline, italicized in terracotta coral for accent emphasis as the signature move. Jost weight 300 carries every paragraph as the "good paper" body face. JetBrains Mono at weight 300 holds labels, kickers, and the thin chrome bars. The palette pairs a deep forest green canvas (#192b1b) with warm cream text (#d4cfbf) and a single terracotta coral accent (#c8524a). Generous negative space, hairline 1px borders, and a near-invisible serif watermark numeral give it the calm authority of a literary journal.

Grove is a quiet, editorial-serif presentation system in the register of a literary monograph or boutique brand book. The foundational premise is restraint: every slide carries one focused content moment surrounded by deep negative space, anchored by thin 1px chrome bars at top and bottom and supported by a small library of compositional beats (coral kicker, 36px coral rule, italic-coral accent, em-dash bullet, near-invisible watermark numeral).

## Preview Ingredients

- Palette: bg #192B1B; bg-alt #1E3221; bg-light #E8E4D6; bg-light-alt #DEDAD0; fg #D4CFBF; fg-light #192B1B; accent #C8524A
- Typography: See full design doc after selection.
- Signature move: Playfair Display at weight 400 carries every headline, every quote, every stat figure, and every watermark numeral. Bold serif is not permitted — the no-bold rule is the system's most important typographic commitment. Italicized Playfair in {colors.accent} co...
- Signature move: Jost at weight 300 carries every paragraph and bullet body. The light weight is the "good paper" feel — it sits back and lets the serif lead.
- Signature move: JetBrains Mono at weight 300 carries every label, kicker, footline, slide counter, and stat caption. Always uppercase, always with at least 0.12em letter-spacing.
- Signature move: Noto Serif SC / Noto Sans SC at weight 300–500 are loaded as Chinese fallbacks for every role. The deck is built bilingually-aware — Chinese characters render through the Noto cuts when present in the content.
- Signature move: Playfair Display at weight 400 — never bold — for every serif moment. Italic in {colors.accent} is the headline accent.

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
