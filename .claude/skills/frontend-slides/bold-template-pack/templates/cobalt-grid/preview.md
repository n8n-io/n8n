# Cobalt Grid Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/cobalt-grid/design.md`
- Preview card: `bold-template-pack/templates/cobalt-grid/preview.md`

## Selection Metadata

- Slug: `cobalt-grid`
- Tagline: Electric cobalt serifs on a graph-paper canvas, anchored by stair-stepped pixel-glitch decorations and slim hairline rules.
- Mood: editorial, design-research, studious, modernist, tech-print, monochrome
- Tone: considered, literary, studious, quietly-modern, editorial
- Formality: high
- Density: medium
- Scheme: light
- Best for: Anything that should feel like a quietly serious design / research bulletin, art publication, or curated trend report. Strong for studio annuals, agency capabilities decks, design-research publications, architecture / art / academic decks, and any deck wanting one strict accent colour and a printed-ledger calmness rather than corporate polish.
- Avoid for: Decks that need warmth, multi-colour energy, or a casual / playful voice — the strict cobalt + cream + grid palette is intentionally austere.

## Visual Snapshot

A Japanese-magazine trend-report system built on warm cream paper, electric cobalt ink, and a graph-paper grid that lives permanently behind every slide. Newsreader serif headlines tower at 18vh while DM Mono carries chrome and ticker text. The signature decoration is a pixel-glitch column — vertical scanlines stair-stepped down the right edge of declarative slides — paired with QR-style 8×8 grid patches. The cultural reference is WIRED Japan, Shift magazine, and architectural trend reports printed in two-color risograph: cream + one cobalt.

Cobalt Grid is a two-color trend-report editorial system built on three immovable foundations: a warm cream paper canvas ({colors.paper}), an electric cobalt ink ({colors.ink}), and a permanent graph-paper grid that sits behind every slide. The grid is not optional decoration — it is rendered via a ::before pseudo on every .stage and cannot be turned off. The aesthetic is "two-color risograph monograph": cream + cobalt only, with the grid lending the entire deck the feel of architectural tracing paper or a Japanese trend report.

## Preview Ingredients

- Palette: paper #F0EBDE; paper-2 #E6E0CE; ink #1F2BE0; ink-soft #5560E5
- Typography: Newsreader; Hanken Grotesk; DM Mono
- Signature move: The 1.5px cobalt hairline frame (top and bottom of every slide).
- Signature move: 1.5px cobalt topbar rule under section headers.
- Signature move: 1px faint-cobalt row dividers between table or index entries.
- Signature move: The 10%-opacity graph paper grid behind everything.
- Signature move: The pixel-glitch and QR-block decorative SVG patches as compositional accents.

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
