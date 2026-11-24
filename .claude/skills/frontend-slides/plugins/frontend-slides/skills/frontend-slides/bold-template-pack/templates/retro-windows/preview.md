# Retro Windows Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/retro-windows/design.md`
- Preview card: `bold-template-pack/templates/retro-windows/preview.md`

## Selection Metadata

- Slug: `retro-windows`
- Tagline: Windows 95 chrome: gray title bars, MS Sans Serif, pixel typography, full nostalgia.
- Mood: nostalgic, retro, geeky, playful
- Tone: winking, nostalgic, geeky, fun
- Formality: low
- Density: medium
- Scheme: light
- Best for: Anything that should feel knowingly nostalgic: retro gaming, Y2K-aesthetic brands, creator portfolios with a 90s vibe, tech-history talks, deliberately tongue-in-cheek decks. A great choice anywhere a playful retro reference is the entire point.
- Avoid for: Decks that need to read as modern, elegant, or institutionally credible — the Win95 chrome will always read as a costume.

## Visual Snapshot

A Windows 95 / 98 desktop-OS aesthetic rendered as a presentation system. Every slide is a window — beveled chrome, navy gradient title bar, MS Sans Serif body type, with chart areas, group boxes, and panels arranged as if they were software UI from 1995. The palette is the original Win9x system colors (gray button-face, navy title bars, white sunken inputs) with retro accent hues (DOS green, brick red, mustard yellow, teal cyan) reserved for status text and chart data. Pixel-font (Press Start 2P) and terminal-font (VT323) appear sparingly for nostalgic punctuation. The effect is half playful nostalgia, half functional dashboard — a deck that reads as a software product running on a CRT monitor.

Retro Windows is a Windows 95 / 98 desktop-OS aesthetic rendered as a slide template. Every slide is structured as a win-window — a beveled rectangular chrome with a navy-gradient title bar, three button icons in the upper right (_, [], X), and a body region containing application-style content. The composition is "this slide is software running on a 1995 desktop, and the content is what the software displays." The conceit is total: there are no slide titles in the modern presentation sense, only window titles styled as filenames (README.DOC, DATAVIEW.CSV, METRICS.LOG).

## Preview Ingredients

- Palette: bg-gray #C0C0C0; bg-light #D4D0C8; bg-dark #808080; white #FFFFFF; black #000000; text-dark #222222; blue-navy #000080; blue-bright #0000A0
- Typography: MS Sans Serif
- Signature move: Every slide is a {components.win-window} — beveled chrome with navy-gradient title bar and three system buttons (_, [], X).
- Signature move: A fixed 3px-period CRT scanline overlay ({components.crt-overlay}) sits above all content at 3% opacity.
- Signature move: Bevel-based depth: raised ({components.panel-raised}, {components.btn-retro}) and sunken ({components.panel-sunken}, {components.group-box}) — no blurred shadows.
- Signature move: The font stack is MS Sans Serif / Segoe UI / Tahoma fallback, with Press Start 2P and VT323 as nostalgic accents.
- Signature move: Status colors (green / red / yellow / cyan) carry semantic meaning: green = OK, red = warning, yellow = moderate, cyan = tertiary data.

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
