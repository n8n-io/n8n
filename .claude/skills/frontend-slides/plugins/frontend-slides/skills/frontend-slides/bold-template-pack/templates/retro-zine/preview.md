# Retro Zine Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/retro-zine/design.md`
- Preview card: `bold-template-pack/templates/retro-zine/preview.md`

## Selection Metadata

- Slug: `retro-zine`
- Tagline: Beige paper with green accent and Bebas Neue + Caveat: a riso-printed zine in HTML form.
- Mood: crafted, lo-fi, underground, warm-retro
- Tone: scrappy, warm, intentional, DIY
- Formality: medium-low
- Density: medium
- Scheme: light
- Best for: Anything that should feel printed, lo-fi, and crafted: indie zines and publications, music / arts brands, creator portfolios, small-batch craft launches, community decks. Also a great underdog choice for tech, research, or business decks that want a riso-print warmth instead of digital polish.
- Avoid for: Contexts that demand digital-native polish or fast modern-tech energy — the layered zine aesthetic intentionally feels handmade.

## Visual Snapshot

A risograph-zine editorial system on warm khaki paper with a deep forest-green accent and ink-black structure. Display type runs in Bebas Neue (condensed industrial sans, uppercase, generously tracked); body type runs in Space Grotesk at weight 300–500; handwritten emphasis runs in Caveat. A subtle SVG grain overlay sits over every slide, reinforcing the printed-paper feel. The aesthetic borrows from independent press, mid-century activist posters, and DIY zine culture: slightly rotated stamp marks, masking-tape pieces in collage layouts, drop caps, and offset paper-on-paper shadows. The effect is hand-printed editorial — warm but disciplined, confident but tactile.

Retro Zine is a risograph-zine editorial system on a warm khaki canvas ({colors.bg} — #C8B99A) with deep forest-green ({colors.green} — #008F4D) as the meaningful accent and ink-black ({colors.black} — #1A1A1A) as the structural color. The aesthetic borrows from independent press culture, mid-century activist posters, and DIY zine layouts: condensed industrial display type, hand-script emphasis, slightly rotated stamps, masking-tape collage marks, drop caps, and a print-grain overlay that ties every surface to a printed-paper register.

## Preview Ingredients

- Palette: bg #C8B99A; bg-dark #B8A98A; green #008F4D; green-light #00A85D; black #1A1A1A; white #F4EFE6
- Typography: See full design doc after selection.
- Signature move: Warm khaki paper canvas ({colors.bg}) + deep forest-green accent ({colors.green}) + ink-black structure ({colors.black}).
- Signature move: An SVG grain overlay ({components.grain-overlay}) sits over every slide at 0.07 opacity, reinforcing the printed-paper register.
- Signature move: Bebas Neue uppercase + tracked for every display moment; Space Grotesk at small sizes for body; Caveat for hand-script emphasis.
- Signature move: 3px solid black structural borders divide regions; 2px and 1.5px borders subdivide.
- Signature move: Paper-on-paper offset cards: green slab sits 12px behind a white card via ::before.

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
