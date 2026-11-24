# Raw Grid Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/raw-grid/design.md`
- Preview card: `bold-template-pack/templates/raw-grid/preview.md`

## Selection Metadata

- Slug: `raw-grid`
- Tagline: Neo-brutalist deck with thick borders, offset shadows, and a pink/sage/ink palette.
- Mood: raw, punchy, energetic, confident
- Tone: direct, modern, no-nonsense, graphic
- Formality: medium-low
- Density: high
- Scheme: light
- Best for: Anything that should feel direct and graphic-confident: founder pitches, accelerator demos, brand decks, indie launches, creator portfolios. Strong for stat slides, comparison tables, and process flows. Equally good for tech, research, or finance when the speaker wants the deck to feel scrappy-confident rather than buttoned-up.
- Avoid for: Contexts that need to feel soft, warm, or intentionally quiet — the brutalist borders and offset shadows commit to a graphic voice.

## Visual Snapshot

A neobrutalist presentation system where 3px solid black borders ARE the layout. Display type runs in the native system sans-serif stack (Segoe UI / system-ui) at weight 900 in strict uppercase — no web fonts loaded. The palette is white canvas + black structure + two muted pastel accents (blush pink #F2D4CF and sage green #E5EDD6) + a neutral gray. Depth comes from hard offset shadows in solid black at 4px and 6px — never blurred, never colored. The aesthetic borrows from brutalist editorial web design and zine layout: borders meet without gaps, contrast is high but warmed by the pastel accents, and large numerals sit at very low opacity behind content as decorative wallpaper. The effect is sharp, system-native, and unmistakably digital — closer to a Notion-meets-protest-poster than a polished pitch deck.

Raw Grid is a neobrutalist presentation system built on a single structural premise: 3px solid black borders are the layout. There are no margins between regions, no gaps between cells, no rounded corners, no gradients. When two regions meet, a 3px black line separates them — that line is the entire grid system.

## Preview Ingredients

- Palette: black #0A0A0A; white #FFFFFF; pink #F2D4CF; green #E5EDD6; gray #F5F5F5; darkgray #333333
- Typography: Segoe UI
- Signature move: White ({colors.white}) canvas with 3px solid black ({colors.black}) borders dividing every region. No gaps between cells — borders meet edge-to-edge.
- Signature move: System sans-serif at weight 900 uppercase for all display type; weight 500 sentence case for all body type.
- Signature move: Hard offset shadows at 6px and 4px in solid black, no blur, ever.
- Signature move: Two muted pastel accent surfaces — blush pink and sage green — used as region fills, never as text colors.
- Signature move: A signature black-pill label component ({components.label}) — white uppercase text in a small black rectangle — appears as the universal section tag.

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
