# Soft Editorial Preview Card

Use this small file for title-slide previews only. For final deck generation, read the full design doc listed below.

## Files

- Full design doc: `bold-template-pack/templates/soft-editorial/design.md`
- Preview card: `bold-template-pack/templates/soft-editorial/preview.md`

## Selection Metadata

- Slug: `soft-editorial`
- Tagline: Cormorant Garamond serif on warm paper with sage, blush, and lemon accents.
- Mood: literary, elegant, quiet, warm-classical
- Tone: literary, considered, warm, magazine
- Formality: high
- Density: low
- Scheme: light
- Best for: Anything that should feel literary, elegant, and unhurried: editorial features, longform brand stories, gallery / museum decks, advisory deliverables, wedding / lifestyle media, founder essays. Equally good for tech, research, or business decks that want a Sunday-supplement warmth instead of corporate polish.
- Avoid for: Decks that need visual heat or punch — the warm-paper palette and Cormorant serif are intentionally quiet.

## Visual Snapshot

A warm magazine spread aesthetic — the kind of layout a small print quarterly with field-notes pretensions would commission. Cormorant Garamond carries every headline and ornamental moment with mixed roman and italic; Work Sans recedes into supporting body. The palette is cream paper with a quartet of pastel candy accents (dusty pink, chartreuse lemon, soft peach blush, sage green, lilac) used as colored card backgrounds. Generous rounded cards (24–36px radius) float on translucent white over the cream field. The mood is editorial calm with a sprinkling of riso-print color — closer to a literary research notebook than a corporate deck.

Soft Editorial is a warm magazine spread presentation system that takes its visual cues from small-press literary quarterlies and design-research notebooks. The premise is a single typeface (Cormorant Garamond) doing nearly all the talking, supported by a sober humanist sans (Work Sans) only where the serif would tire. The cream paper field is the constant — every slide sits on {colors.paper} (#F2EEDF), a warm aged-cream that reads as physical paper, not screen white. On top of the field, rounded cards float in two registers: translucent white softness for default content, and saturated pastel candy for accent moments.

## Preview Ingredients

- Palette: paper #F2EEDF; paper-2 #ECE6D2; ink #2A241B; ink-soft #5C5345; pink #E1A4C2; lemon #D6DD63; blush #E8C9B6; sage #B7C7A8
- Typography: Cormorant Garamond; Work Sans
- Signature move: Single warm cream surface ({colors.paper}) across every slide; pastels appear only as card fills, never as the slide background (except the full-bleed closer slide which fills with {colors.pink}).
- Signature move: Cormorant Garamond carries every display, headline, kicker, and ornamental moment; Work Sans is reserved for body and eyebrows.
- Signature move: Mixed roman + italic inside headlines is the system's typographic signal — italic phrases drop to weight 400 from the headline's weight 500.
- Signature move: Saturated pastels ({colors.pink}, {colors.lemon}, {colors.blush}, {colors.sage}, {colors.lilac}) are interchangeable card fills with no fixed semantic meaning.
- Signature move: Rounded cards (24–36px radius) are the default container; pills are fully rounded (999px); translucent white ({colors.card-fill}) is the default card fill.

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
