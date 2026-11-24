# Signal Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/signal/design.md`
- Preview card: `bold-template-pack/templates/signal/preview.md`

## Selection Metadata

- Slug: `signal`
- Tagline: Deep navy canvas with bone paper and a single muted-gold accent; institutional with quiet weight.
- Mood: institutional, trustworthy, considered, weighty
- Tone: sober, polished, established, literary
- Formality: high
- Density: high
- Scheme: mixed
- Best for: Anything that should feel weighty, considered, and credibly institutional: investor decks, board presentations, consulting deliverables, legal / policy briefs, advisory pitches. Also a strong choice for tech, research, or brand work that wants to read as quietly authoritative rather than loud.
- Avoid for: Contexts that should feel hot, fast, or intentionally playful — the navy + gold restraint commits to a sober voice.

## Visual Snapshot

A literary editorial presentation system in the spirit of a long-form magazine — The Economist's restraint crossed with a private intelligence briefing. Source Serif 4 carries every headline with roman/italic mixing mid-sentence in antique gold, DM Sans steps back for body, and IBM Plex Mono runs all the timestamps, kickers, and chrome. The dual surface system is warm cream paper (#F0ECE3) and deep editorial navy (#1C2644), connected by a single hot accent — antique gold (#C8A870) — used only on rules, italic emphasis, and numerical figures. A near-invisible 80px grid texture overlays every dark slide as a fingerprint. The effect is sober, considered, and a little bit aristocratic.

Signal is a literary editorial presentation system — what a long-form intelligence briefing or a quarterly review from a serious magazine would look like if it ran as a deck. The visual premise is the marriage of two faces: a Scottish-roast editorial serif (Source Serif 4) carrying the voice, and a precision grotesque (DM Sans) carrying the substance, with a condensed monospace (IBM Plex Mono) for every timestamp, kicker, and piece of chrome metadata. The result reads like a quiet authority — the deck does not need to shout because the typography already telegraphs seriousness.

## Preview Ingredients

- Palette: navy #1C2644; navy-alt #232F55; cream #F0ECE3; cream-alt #E6E0D4; text-warm #E2DCD0; text-muted-dark #8A96A8; text-hint-dark #4E5A6E; ink #1A2030
- Typography: Source Serif 4; DM Sans; IBM Plex Mono; {typography.label.fontFamily}
- Signature move: Source Serif 4 carries every headline with a roman/italic mix mid-sentence; italics in headlines are always gold.
- Signature move: DM Sans for body and IBM Plex Mono for every timestamp, kicker, label, and chrome element.
- Signature move: Dual surfaces — {colors.navy} (dark) and {colors.cream} (light) — used interchangeably, never blended in the same slide except in special split layouts.
- Signature move: Antique gold ({colors.gold}) is the only accent. It marks rules, italic emphasis, and numerical figures, and appears nowhere else.
- Signature move: Hairline 1px borders in {colors.border-dark} / {colors.border-light} separate every region. No card chrome, no rounded panels.

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
