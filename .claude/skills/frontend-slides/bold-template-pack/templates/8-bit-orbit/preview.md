# 8-Bit Orbit Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/8-bit-orbit/design.md`
- Preview card: `bold-template-pack/templates/8-bit-orbit/preview.md`

## Selection Metadata

- Slug: `8-bit-orbit`
- Tagline: Pixel-art neon arcade aesthetic on a deep navy void.
- Mood: retro-tech, playful, cyberpunk, energetic
- Tone: geeky, neon, rebellious, sci-fi
- Formality: low
- Density: medium
- Scheme: dark
- Best for: Anything that should feel like a CRT screen at 2am: cyberpunk, gaming, web3, indie dev tools, hackathon demos. Just as good for a tech talk that wants to lean into nostalgic-digital craft, a synthwave brand deck, or a creative review that wants to feel like a console.
- Avoid for: Contexts where the dark neon palette would actively work against the message — quiet institutional finance disclosures, healthcare patient-facing materials, traditional luxury.

## Visual Snapshot

A retro-futuristic pixel-art presentation system that fuses 16-bit arcade nostalgia with editorial discipline. Display type runs in Tektur (a chunky geometric display face built on pixel-grid logic) paired with Chakra Petch for body and Space Mono for code-flavored labels and tabular data. The palette pivots on a deep cosmic navy (#0F1B3D / #0A0E27) lit by three saturated neons — cyan, hot pink, and a high-key yellow — with a soft lavender pastel for warm reprieves. Depth is built from stacked hard offset shadows in 4px increments (the pixel unit), CRT scanlines, atmospheric grain, vignettes, and animated starfields. The effect sits between an arcade cabinet and a Tron-era boardroom — unmistakably digital, intentionally lo-fi, and engineered to feel as if it just booted up.

8-Bit Orbit is a retro-futuristic pixel-art presentation system. Its foundational premise is the 4-pixel unit: every shadow offset, every border, every corner bracket, every label height resolves to a multiple of 4px. Layouts feel as if they were rasterized on an old CRT and dragged into HTML — and atmospheric overlays (scanlines, grain, vignette glow, animated starfields) reinforce the illusion on every surface.

## Preview Ingredients

- Palette: dark-void #0A0E27; deep-navy #0F1B3D; neon-cyan #5EDCF4; neon-pink #F0A6CA; neon-yellow #F4D03F; soft-lavender #E2D5F2; white #FFFFFF
- Typography: See full design doc after selection.
- Signature move: Three-font stack: Tektur (display), Chakra Petch (body), Space Mono (HUD/labels) — never substitute, never mix outside their roles.
- Signature move: Navy ground ({colors.dark-void} / {colors.deep-navy}) alternates with colored-grid surfaces (pink, cyan, lavender) — both carry the 40px etched grid.
- Signature move: Three neons (cyan, pink, yellow) reserved for display, stats, rules, and label fills — never for body text.
- Signature move: All measurements snap to the 4px pixel unit: borders 2-4px, shadow offsets 4px / 8px, corner brackets 24×24 with 4px stroke.
- Signature move: Stacked hard offset shadows are the system's depth language — never blurred, never colored on text shadows except in the yellow→navy cascade.

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
