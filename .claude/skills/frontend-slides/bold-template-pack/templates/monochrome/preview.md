# Monochrome Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/monochrome/design.md`
- Preview card: `bold-template-pack/templates/monochrome/preview.md`

## Selection Metadata

- Slug: `monochrome`
- Tagline: Ivory ledger paper with all-black type; Lora serif headlines, Jost body, no color at all.
- Mood: restrained, literary, archival, ledger
- Tone: literary, considered, neutral, honest
- Formality: high
- Density: high
- Scheme: light
- Best for: Anything that should feel like a hand-typeset ledger: user research synthesis, white papers, longform reports, academic and policy briefs, advisory deliverables, bilingual EN/CN reports. Equally good for tech, design, or brand decks that want their words to be the only thing on the page.
- Avoid for: Decks that need visual personality or color-led storytelling — the all-ink palette is intentionally austere.

## Visual Snapshot

A literary editorial system rendered in black ink on cream paper. Ultra-light geometric sans (Jost at weight 200–300) carries every headline; Lora italic serif handles quote text and insight-card titles; JetBrains Mono provides the structural chrome. There are no chromatic accents — every color in the palette is a graphite or cream tone, and "accent" simply means "darker ink." The aesthetic borrows from independent research reports, scholarly monographs, and the quietest end of contemporary editorial design — closer to a printed journal than a tech presentation.

Monochrome (Ivory Ledger) is a literary editorial system built on a single material constraint: black ink on cream paper, and nothing else. The palette has eight tokens, but seven of them are tonal variations of cream or graphite. There is no chromatic accent — the "accent" color is just darker ink. The result is a system that reads as a carefully typeset research report or a quiet contemporary monograph, not a presentation.

## Preview Ingredients

- Palette: cream-paper #FAFADF; cream-paper-2 #F2F2D2; cream-paper-3 #F0F0D4; cream-warm #F5F0E4; ink-black #1A1A16; ink-graphite #5E5E54; ink-graphite-light #8A8A80
- Typography: Jost; JetBrains Mono; Lora; {typography.label.fontFamily}
- Signature move: Cream paper background ({colors.cream-paper}) on every slide — never white, never dark by default. The cream is the surface, not a stylistic choice.
- Signature move: Ultra-light Jost (weight 200 for display, weight 300 for body) is the dominant typographic voice.
- Signature move: Lora italic serif appears in two specific moments: pull-quote bodies and insight-card titles. Nowhere else.
- Signature move: JetBrains Mono uppercase with 0.12em+ tracking handles every structural label, chrome tag, axis, and bullet marker.
- Signature move: The system has no chromatic accent. The accent color is {colors.ink-black} — slightly darker ink.

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
