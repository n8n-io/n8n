# Editorial Forest Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/editorial-forest/design.md`
- Preview card: `bold-template-pack/templates/editorial-forest/preview.md`

## Selection Metadata

- Slug: `editorial-forest`
- Tagline: Forest green, dusty pink, and warm cream meet Source Serif 4 in a quiet, intentional quarterly-review deck.
- Mood: editorial, quiet, considered, warm, intentional
- Tone: literary, thoughtful, warm, low-pressure
- Formality: medium
- Density: medium
- Scheme: mixed
- Best for: Anything that should feel like a considered editorial — quarterly reviews, internal readouts, studio updates, creative-agency presentations. Equally good for any deck that wants to feel warm and unhurried rather than corporate, including research recaps, book or program announcements, and team retrospectives.
- Avoid for: Contexts that need to feel urgent, punchy, or sales-driven — the palette and rhythm are intentionally quiet.

## Visual Snapshot

A serif-led editorial presentation system in the register of a literary quarterly or art-book monograph. Display type runs in Source Serif 4 at weight 500 with optical-size axis engaged, scaling up to 220px for cover and stat moments. The palette pairs a deep forest green (#2e4a2a) with a dusty rose pink (#e89cb1) over an oat-cream paper ground (#efe7d4), with JetBrains Mono as the editorial chrome (labels, captions, axis ticks). The aesthetic is closer to a Penguin classic, Apartamento spread, or quiet annual report than a tech keynote — confident, paper-feeling, and committed to a small color vocabulary.

Editorial Forest is a serif-led editorial presentation system in the tonal register of a Penguin classic, a quiet annual report, or an art-book spread. The system's foundational premise is a single, confident typographic voice — Source Serif 4 — used at extreme scale (up to 220px) for headlines and stat figures, with JetBrains Mono playing the supporting role of editorial chrome (labels, captions, axis ticks, page footlines).

## Preview Ingredients

- Palette: green #2E4A2A; green-deep #243A21; green-lite #3A5A36; pink #E89CB1; pink-deep #D27E96; cream #EFE7D4; cream-2 #E6DCC4; ink #1A1A17
- Typography: JetBrains Mono
- Signature move: Three-color editorial palette: deep forest green, dusty rose pink, oat cream paper. Two surface tones per slide is typical; three is loud.
- Signature move: Source Serif 4 at weight 500 for every headline, body, and display moment. Optical-size axis engaged for size-aware letterforms.
- Signature move: JetBrains Mono at weight 500 uppercase with wide tracking (0.14em–0.18em) for every label, caption, axis tick, and footline.
- Signature move: Display type scales to 220px for cover and stat-figure moments; 96px for primary headlines; 56–84px for card titles.
- Signature move: 2px hairline rules separate stacked sections — never thicker, never colored beyond region context.

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
