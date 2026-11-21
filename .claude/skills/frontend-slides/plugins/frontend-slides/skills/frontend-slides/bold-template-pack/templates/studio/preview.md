# Studio Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/studio/design.md`
- Preview card: `bold-template-pack/templates/studio/preview.md`

## Selection Metadata

- Slug: `studio`
- Tagline: Black canvas with electric-yellow type; high-voltage design studio aesthetic.
- Mood: electric, bold, graphic, design-led, high-contrast
- Tone: graphic, loud, modern, intentional
- Formality: medium
- Density: medium
- Scheme: dark
- Best for: Anything that should feel electric and design-led: studio credentials, creative agency pitches, brand showcases, art-direction reviews, fashion / sneaker brand work. Also a striking unexpected choice for tech, research, or business decks where the speaker wants the deck to *be* a brand statement.
- Avoid for: Contexts that should feel quiet or institutional — the black-and-electric-yellow palette is the loudest in the library.

## Visual Snapshot

A "Boring Studios" agency presentation system — type-as-graphic-mass in the spirit of contemporary design-studio decks (Pentagram, Anti, Order). The entire system runs on Barlow at weight 900 uppercase, with type so heavy at display scale that it stops being type and starts being a shape. The palette is binary plus one: near-black field (#1C1C1C), acid yellow type (#F5D200), and the same yellow as a full slide background. IBM Plex Mono carries every footer metadata, slide counter, and three-column lockup. No drop shadows, no rounded corners, no accent colors — the headline IS the design, and the only chromatic decision per slide is dark-yellow-on-near-black or near-black-on-acid-yellow.

Studio is a type-as-graphic-mass presentation system — the visual register of contemporary design-studio decks (Pentagram, Anti, Order, "Boring Studios" agency aesthetic). The premise is reductive to the point of severity: a single typeface (Barlow), at a single weight (900), in strict uppercase, at scales so large that type stops behaving like type and starts behaving like a graphic shape. The headline IS the design — there are no decorative elements, no accent colors, no ornaments. If you removed every other element from a Studio slide and left only the headline, the slide would still read as Studio.

## Preview Ingredients

- Palette: near-black #1C1C1C; near-black-alt #242422; acid-yellow #F5D200; acid-yellow-alt #F0CC00; border-dark #2E2E2C
- Typography: Barlow; IBM Plex Mono; {typography.body.fontFamily}
- Signature move: Binary palette — {colors.near-black} field with {colors.acid-yellow} type, or {colors.acid-yellow} field with {colors.near-black} type. No third color.
- Signature move: Barlow at weight 900 uppercase for every headline at every scale; Barlow 400/500 for body; IBM Plex Mono only for metadata chrome.
- Signature move: Headlines run massive — cover display at 12vw (~230px at 1920px viewport), statements at 7.5vw, section headers at 4.8vw.
- Signature move: Tight negative letter-spacing on all display type (-0.01 to -0.03em); uppercase non-negotiable.
- Signature move: Flat: no drop shadows, no rounded corners, no gradients, no accent colors beyond the yellow/dark binary.

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
