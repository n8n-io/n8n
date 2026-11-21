# BlockFrame Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/block-frame/design.md`
- Preview card: `bold-template-pack/templates/block-frame/preview.md`

## Selection Metadata

- Slug: `block-frame`
- Tagline: Neobrutalist deck with pastel-neon color blocks and chunky black borders.
- Mood: bold, playful, graphic, fresh
- Tone: confident, graphic, pop, design-led
- Formality: medium-low
- Density: high
- Scheme: light
- Best for: Anything that should feel pop-graphic and design-led: indie SaaS launches, agency credentials, creative reviews, brand redesigns. Also a strong unexpected pick for tech, finance, or research when the speaker wants to land as confident and contemporary rather than buttoned-up.
- Avoid for: Contexts that require quiet institutional restraint or traditional weight (regulated disclosures, formal legal briefs).

## Visual Snapshot

A maximalist neobrutalist presentation system built on 4px solid black borders, 8px hard offset shadows, and a high-key candy palette of five saturated pastels plus cream and off-white. Display type runs Inter at weight 800-900 in tight uppercase; secondary chrome uses Space Grotesk as a quasi-monospace label face. Tilted decorative shapes (rotated stars, rectangles, badges) puncture the borders and break the grid intentionally. Pastels are paired loudly: pink + blue + green + yellow + cream cycle through every region with deliberate juxtaposition. The aesthetic borrows from zine layout, 1990s-revival sticker books, and contemporary toy packaging — bold, joyful, slightly chaotic, never timid.

BlockFrame is a maximalist neobrutalist presentation system built on five structural laws: every region has a 4px black border, every elevated element has an 8px hard offset shadow, every corner is square, every accent color is a saturated pastel, and every layout is allowed to be a little bit crooked. The system's joy comes from the deliberate collision of these laws — bordered cards meet bordered cards, shadows stack against shadows, tilted decorations puncture the grid intentionally.

## Preview Ingredients

- Palette: black #000000; white #FFFFFF; offwhite #FFFDF5; pink #FE90E8; blue #C0F7FE; green #99E885; yellow #F7CB46; cream #FFDC8B
- Typography: See full design doc after selection.
- Signature move: 4px solid black borders on primary cards, 3px on secondary chrome — never thinner.
- Signature move: 8px hard offset shadows on primary cards, 4px on secondary chrome — solid black, zero blur.
- Signature move: Five-pastel palette (pink, blue, green, yellow, cream) plus black, white, off-white — cycled across surfaces.
- Signature move: Inter weight 800-900 uppercase with negative tracking is the display voice; Space Grotesk weight 600 uppercase with 0.08em tracking is the label voice.
- Signature move: Square corners everywhere except a single circular accent dot on stat cards.

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
