---
version: alpha
name: Soft Editorial
description: A warm magazine spread aesthetic — the kind of layout a small print quarterly with field-notes pretensions would commission. Cormorant Garamond carries every headline and ornamental moment with mixed roman and italic; Work Sans recedes into supporting body. The palette is cream paper with a quartet of pastel candy accents (dusty pink, chartreuse lemon, soft peach blush, sage green, lilac) used as colored card backgrounds. Generous rounded cards (24–36px radius) float on translucent white over the cream field. The mood is editorial calm with a sprinkling of riso-print color — closer to a literary research notebook than a corporate deck.

colors:
  paper: "#F2EEDF"
  paper-2: "#ECE6D2"
  ink: "#2A241B"
  ink-soft: "#5C5345"
  pink: "#E1A4C2"
  lemon: "#D6DD63"
  blush: "#E8C9B6"
  sage: "#B7C7A8"
  lilac: "#C9BEDC"
  card-fill: "rgba(255,255,255,0.55)"
  rule-soft: "rgba(42,36,27,0.18)"
  rule-medium: "rgba(42,36,27,0.35)"

color-aliases:
  background: paper
  text-primary: ink
  text-secondary: ink-soft

typography:
  display:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 232px
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -0.02em
  title:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 188px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: -0.015em
  closer:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 168px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: -0.015em
  numeral-hero:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 320px
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: -0.02em
  numeral-lg:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 200px
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: -0.02em
  panel-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 124px
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  section-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 96px
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  page-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 88px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.01em
  quote-text:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 88px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -0.01em
  quote-mark:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 220px
    fontWeight: 500
    lineHeight: 0.7
    fontStyle: italic
  card-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.01em
  drop-cap:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 132px
    fontWeight: 500
    lineHeight: 0.85
  opener:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 56px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1.1
  numeral-step:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 92px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 0.9
  numeral-card:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 64px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1
  subhead-lg:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 56px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1.1
  subhead-md:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 44px
    fontWeight: 500
    lineHeight: 1.05
  subhead-sm:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 38px
    fontWeight: 500
    lineHeight: 1.05
  kicker:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 38px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.2
  marker:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 32px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.3
  card-sub:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.1
  eyebrow:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 28px
    fontWeight: 400
    letterSpacing: -0.005em
  page-marker:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 26px
    fontWeight: 400
    fontStyle: italic
  footer:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 26px
    fontWeight: 400
    fontStyle: italic
  body:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.5
  attr:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.3
  swatch-label:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 11px
    fontWeight: 400
    letterSpacing: 0.06em
    textTransform: uppercase

spacing:
  pad-outer: 80px
  pad-top: 60px
  pad-bottom: 50px
  card-pad-lg: "64px 48px"
  card-pad-md: "48px 52px"
  card-pad-sm: "28px 30px"
  gap-cards: 28px
  gap-cards-lg: 36px
  gap-stack: 36px

canvas:
  width: 1920px
  height: 1080px

components:
  card-soft:
    background: "{colors.card-fill}"
    borderRadius: "24px to 36px"
    padding: "{spacing.card-pad-sm} to {spacing.card-pad-lg}"
    description: "Translucent white card floating on the cream field. The system's default container — used for stats, columns, panels, content blocks."
  card-color:
    background: "any of pink, lemon, blush, sage, lilac"
    borderRadius: "22px to 36px"
    padding: "{spacing.card-pad-sm}"
    description: "Saturated pastel card containing numerals, step content, or featured items. Text stays ink/ink-soft on every accent fill — never inverted."
  pill:
    borderRadius: "999px"
    padding: "4px 14px"
    fontWeight: 500
    description: "Status pill in a pastel fill (lemon=yes, blush=partial, pink=no) or translucent white with a soft border for notes."
  swatch-dot:
    width: 56px
    height: 56px
    borderRadius: "50%"
    description: "Circular accent disc shown in a row at the top of cover slides — the visual signature of the system's color palette."
  swatch-tile:
    aspectRatio: "1/1.2"
    borderRadius: "16px"
    description: "Rounded rectangle paint chip used in palette displays and design-system layouts."
  rule-dashed:
    borderColor: "{colors.rule-soft}"
    borderStyle: "dashed"
    borderWidth: "1px"
    description: "1px dashed warm-ink hairline used inside matrix tables, panel dividers, and any subdivision that wants to read softer than a solid rule."
  rule-solid:
    borderColor: "{colors.rule-medium}"
    borderStyle: "solid"
    borderWidth: "1.5px"
    description: "Slightly heavier hairline for major dividers inside cards (head-row underlines, column rules)."
  drop-cap:
    typography: "{typography.drop-cap}"
    float: "left"
    description: "First letter of an opener paragraph floats left at ~132px, line-height 0.85, with 8px 14px 0 0 padding. The visible signature of editorial reads."
  legend-bar:
    width: 28px
    height: 12px
    borderRadius: "6px"
    description: "Rounded color bar used as a chart legend swatch."
  marker-rule:
    width: "auto"
    borderTop: "1px dashed {colors.rule-soft}"
    description: "Dashed top-rule used to mark source attributions or sign-offs beneath content."
  action-bar:
    background: "{colors.lemon}"
    borderRadius: "24px"
    padding: "24px 36px"
    description: "Lemon-yellow action band running near the top of a slide, containing a tag separator and a serif headline — used for important CTAs or callouts."
  chrome-eyebrow:
    position: "absolute top-left at 60px / 80px"
    typography: "{typography.eyebrow}"
    color: "{colors.ink}"
    description: "Section name in plain sans, sits at the top-left corner of standard slides."
  chrome-pagedot:
    position: "absolute top-right at 60px / 80px"
    typography: "{typography.page-marker}"
    color: "{colors.ink-soft}"
    description: "Roman or arabic page numeral in italic serif at the top-right corner."
  chrome-footer:
    position: "absolute bottom at 50px"
    typography: "{typography.footer}"
    color: "{colors.ink-soft}"
    description: "Two-column italic serif footer running across the bottom — date left, publication name right."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Soft Editorial is a **warm magazine spread** presentation system that takes its visual cues from small-press literary quarterlies and design-research notebooks. The premise is a single typeface (Cormorant Garamond) doing nearly all the talking, supported by a sober humanist sans (Work Sans) only where the serif would tire. The cream paper field is the constant — every slide sits on `{colors.paper}` (#F2EEDF), a warm aged-cream that reads as physical paper, not screen white. On top of the field, rounded cards float in two registers: translucent white softness for default content, and saturated pastel candy for accent moments.

The typography system is **single-family with mixed style**. Headlines are Cormorant Garamond medium (weight 500), but a roman headline often carries an `<em>` mid-sentence that switches to italic at weight 400 — the italic phrase is a lighter weight of the same family, which gives the system its characteristic "gentle emphasis" tone. Italic also runs the small ornamental text (kickers, markers, page numerals, sign-offs, opener paragraphs, step numerals). Work Sans steps in only for body paragraphs, eyebrows, and a small set of meta labels where the serif's personality would be too much.

The color philosophy is **cream plus five pastels**. The pastels — dusty pink (`{colors.pink}`), chartreuse lemon (`{colors.lemon}`), soft peach blush (`{colors.blush}`), sage green (`{colors.sage}`), and lilac (`{colors.lilac}`) — are interchangeable card fills. None of them carries a fixed semantic role (lemon is not "warning," pink is not "error"). They are color paints — the deck cycles through them for variety, often with three or four visible on a single slide. Text on every pastel surface stays in `{colors.ink}` (a warm near-black, #2A241B). The system never inverts text color on accent surfaces.

Depth comes from **soft rounded cards** with large border-radius values (24–36px on default cards; up to 999px on pills) and translucent white fills that sit slightly above the cream field. There are no drop shadows — depth is implied by the translucency and the rounded form. Hairlines inside cards are dashed in a warm ink with low opacity, which reinforces the "notebook" feel.

**Density philosophy: medium-high inside cards, generous between cards.** The cards themselves can hold substantial content — multi-column matrices, dense step grids, lengthy quoted text. But the slide canvas leaves comfortable air around them: 80px outer padding, 28–36px gaps between cards, plenty of cream field showing through. A slide that feels broken in this system is either (a) cards crammed together with no breathing field, or (b) a slide so sparse that the paper field reads as empty rather than as a deliberate margin. The target is "a generously laid-out magazine page where the cards group, breathe, and lead the eye."

**Key Characteristics:**
- Single warm cream surface (`{colors.paper}`) across every slide; pastels appear only as card fills, never as the slide background (except the full-bleed closer slide which fills with `{colors.pink}`).
- Cormorant Garamond carries every display, headline, kicker, and ornamental moment; Work Sans is reserved for body and eyebrows.
- Mixed roman + italic inside headlines is the system's typographic signal — italic phrases drop to weight 400 from the headline's weight 500.
- Saturated pastels (`{colors.pink}`, `{colors.lemon}`, `{colors.blush}`, `{colors.sage}`, `{colors.lilac}`) are interchangeable card fills with no fixed semantic meaning.
- Rounded cards (24–36px radius) are the default container; pills are fully rounded (999px); translucent white (`{colors.card-fill}`) is the default card fill.
- No drop shadows. Depth comes from translucency on top of the cream field and from the cards' rounded chrome.
- Page chrome is italic serif (page numerals and footers) plus plain sans (eyebrows) — never mono, never uppercase.
- Drop caps appear at the start of long-form opener paragraphs at ~132px Cormorant Garamond medium.

## Colors

### Palette

- **Paper** (`{colors.paper}` — #F2EEDF): The cream page. The default slide background, the constant across the deck. Warm and aged, never bright.
- **Paper Alt** (`{colors.paper-2}` — #ECE6D2): A slightly cooler cream reserved for adjacent-surface separation. Used sparingly; many decks never reach for it.
- **Ink** (`{colors.ink}` — #2A241B): Warm near-black with a brown bias. Primary text color on every surface — never pure black.
- **Ink Soft** (`{colors.ink-soft}` — #5C5345): A muted warm grey-brown. Secondary text — captions, leads, descriptions, page markers, sign-offs.
- **Pink** (`{colors.pink}` — #E1A4C2): Dusty rose pastel. The most-used accent fill — appears on cover swatches, step cards, full-bleed closer slides, status pills (where it reads as "no" in matrices).
- **Lemon** (`{colors.lemon}` — #D6DD63): Chartreuse yellow-green. The brightest accent — used on hero numeral cards, action bars, "yes" pills.
- **Blush** (`{colors.blush}` — #E8C9B6): Soft peach. The most neutral of the pastels — used on step cards, "partial" pills, and any slot needing warm neutrality.
- **Sage** (`{colors.sage}` — #B7C7A8): Muted green. The "extra" accent that joins for variety — process diagrams, design-system grids, secondary step cards.
- **Lilac** (`{colors.lilac}` — #C9BEDC): Soft violet-grey. The cool counterpart to sage — appears mostly in five-step process flows where all five pastels rotate.
- **Card Fill** (`{colors.card-fill}` — rgba(255,255,255,0.55)): Translucent white. The default card background — sits on the cream field as a "lifted" surface without committing to a saturated color.
- **Rule Soft** (`{colors.rule-soft}` — rgba(42,36,27,0.18)): Low-opacity warm ink for dashed internal hairlines.
- **Rule Medium** (`{colors.rule-medium}` — rgba(42,36,27,0.35)): Slightly heavier hairline for major dividers inside cards.

### Defaults

- **Default slide background**: `{colors.paper}` — every standard slide.
- **Default primary text color**: `{colors.ink}` — on every surface, including all pastel cards. Text is never inverted to white on pastel fills.
- **Default secondary text color**: `{colors.ink-soft}` — for descriptions, lead paragraphs, captions, page markers, sign-offs.
- **Default card fill**: `{colors.card-fill}` — translucent white. Reach for this whenever a content container doesn't need a saturated color.
- **Default accent card fill (when one is needed)**: `{colors.pink}` for the warmest moment, `{colors.lemon}` for the brightest, `{colors.blush}` for neutral warmth, `{colors.sage}` for cool variety, `{colors.lilac}` for the fifth slot in a five-up grid.
- **Default headline color**: `{colors.ink}`.
- **Default eyebrow color**: `{colors.ink}` (eyebrow is the top-left chrome label).
- **Default footer color**: `{colors.ink-soft}`.

Pastels do not carry semantic meaning. In matrix layouts, the convention is lemon = positive / partial / yes; blush = partial; pink = negative / no. Outside the matrix, any pastel can fill any card without conveying status.

## Typography

### Font Family

Soft Editorial runs **two families** in carefully separated roles:

- **Cormorant Garamond** (`{typography.display.fontFamily}`) — a refined old-style serif with a beautifully expressive italic axis. Carries every headline at every scale (display, title, closer, page-headline, card-headline, all subheads), every numeral, every quote, every kicker, every ornamental marker, every page numeral, every footer, every drop cap. The italic of this face is delicate and personal, and the system uses it generously — italic carries kickers, markers, page numerals, footers, step numerals, sign-offs, and any `<em>` inside a headline.
- **Work Sans** (`{typography.body.fontFamily}`) — a humanist grotesque. Reserved for body paragraphs, eyebrows, card sub-labels, attributions, and Work Sans-specific labels (the small uppercase swatch-label in palette displays). Work Sans never carries a headline.

The system's typographic signal is **mixed weight inside the same headline**: a serif headline at weight 500 carries an `<em>` that drops to weight 400 (italic). The weight difference is gentle — it reads as a softening, not as bold emphasis. This is opposite the magazine convention of italic-for-bold; here italic is the lighter, more intimate tone.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.numeral-hero}` | 320px | Cormorant Garamond | 500 | Featured hero numeral in a span-two stat card |
| `{typography.display}` | 232px | Cormorant Garamond | 500 | Cover-scale display headline |
| `{typography.numeral-lg}` | 200px | Cormorant Garamond | 500 | Standalone large statistical numeral |
| `{typography.title}` | 188px | Cormorant Garamond | 500 | Section or chapter title at near-cover scale |
| `{typography.closer}` | 168px | Cormorant Garamond | 500 | Closing or "moment" headline on a full-bleed colored slide |
| `{typography.panel-headline}` | 124px | Cormorant Garamond | 500 | Headline filling one panel of a two-column layout |
| `{typography.section-headline}` | 96px | Cormorant Garamond | 500 | Chart, comparison, or analysis section headline |
| `{typography.numeral-step}` | 92px | Cormorant Garamond italic | 500 | Italic ordinal numeral (i., ii., iii.) on step cards |
| `{typography.page-headline}` | 88px | Cormorant Garamond | 500 | Process diagram or general page headline |
| `{typography.quote-text}` | 88px | Cormorant Garamond | 500 | Pull-quote body text |
| `{typography.card-headline}` | 72px | Cormorant Garamond | 500 | Headline that fills the head of a square accent card |
| `{typography.numeral-card}` | 64px | Cormorant Garamond italic | 500 | Italic ordinal numeral on smaller item cards |
| `{typography.opener}` | 56px | Cormorant Garamond italic | 500 | Italic opener paragraph for foreword / long-form reads |
| `{typography.subhead-lg}` | 56px | Cormorant Garamond italic | 500 | Italic large subhead used for column-pair openers |
| `{typography.subhead-md}` | 44px | Cormorant Garamond | 500 | Card or column heading |
| `{typography.subhead-sm}` | 38px | Cormorant Garamond | 500 | Sub-headline within a panel; item headlines in lists |
| `{typography.kicker}` | 38px | Cormorant Garamond italic | 400 | Italic kicker above a cover headline |
| `{typography.card-sub}` | 32px | Work Sans | 500 | Sub-label beneath a serif card head (the only sans subhead) |
| `{typography.marker}` | 32px | Cormorant Garamond italic | 400 | Italic marker text (sign-offs, edition labels, "vol. iii") |
| `{typography.eyebrow}` | 28px | Work Sans | 400 | Plain-sans section name at top-left of standard slides |
| `{typography.page-marker}` | 26px | Cormorant Garamond italic | 400 | Roman or arabic page numeral at top-right |
| `{typography.footer}` | 26px | Cormorant Garamond italic | 400 | Italic serif footer line (date, publication) |
| `{typography.body}` | 26px | Work Sans | 400 | Default paragraph body |
| `{typography.body-md}` | 24px | Work Sans | 400 | Card body, list item body, dense paragraphs inside cards |
| `{typography.attr}` | 24px | Work Sans | 500 | Quote attribution name |
| `{typography.drop-cap}` | 132px | Cormorant Garamond | 500 | Drop cap at the start of a long-form opener paragraph |
| `{typography.swatch-label}` | 11px | Work Sans uppercase | 400 | Small uppercase label inside a swatch tile (palette display) |

### Defaults

- **Default size for a primary section headline**: `{typography.section-headline}` (96px) on standard slides, `{typography.panel-headline}` (124px) when the headline fills one panel of a two-up layout.
- **Default size for a cover or chapter headline**: `{typography.title}` (188px) to `{typography.display}` (232px).
- **Default size for a paragraph body**: `{typography.body}` (26px) on the open slide; `{typography.body-md}` (24px) inside cards or denser columns.
- **Default size for a kicker or marker**: `{typography.kicker}` (38px) for cover kickers; `{typography.marker}` (32px) for smaller ornamental notes.
- **Default size for a featured statistical numeral**: `{typography.numeral-lg}` (200px); reach for `{typography.numeral-hero}` (320px) only when one stat dominates a layout.
- **Default size for a step or item numeral**: `{typography.numeral-step}` (92px) on full step cards, `{typography.numeral-card}` (64px) on smaller items.
- **Default headline weight**: 500 (medium). Italic `<em>` inside drops to 400.
- **Default headline color**: `{colors.ink}`.

When unsure between sizes for a slide's primary moment, reach for `{typography.section-headline}` (96px) — it is the workhorse size for editorial reads.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every headline that includes an emphasized phrase renders the `<em>` in italic Cormorant Garamond at weight 400** (the surrounding headline runs at weight 500). The italic weight drop is the system's primary typographic signal.
- **All page chrome (eyebrow, page-marker, footer) is positioned absolute at fixed offsets** (eyebrow top-left 60/80px; pagedot top-right 60/80px; footer left/right 80px / bottom 50px). The chrome positions are non-negotiable across standard slides.
- **Eyebrows are plain Work Sans at 28px**, not italic, not uppercase. They are the only sans chrome element.
- **Page numerals and footers are italic serif at 26px in `{colors.ink-soft}`.** They are never sans, never uppercase, never bold.
- **Step numerals are italic serif lowercase Roman numerals (i., ii., iii., iv., v.)** — never arabic, never uppercase. The roman numeral is part of the editorial register.
- **Drop caps in opener paragraphs are Cormorant Garamond at weight 500, ~132px, with line-height 0.85 and padding `8px 14px 0 0`.** A drop cap that isn't this exact spec reads as a different system.
- **Cards always have border-radius in the 22–36px range** (or 999px for pills). Square cards do not exist in this system.

### Typography Principles

The serif/sans split is structural: Cormorant Garamond carries personality (every headline, every numeral, every ornament), Work Sans carries substance (every paragraph, every eyebrow, every Work Sans-only label). Crossing those rails breaks the editorial calm.

Italic is generous, not reserved. Italic serif appears on kickers, markers, page numerals, footers, step numerals, opener paragraphs, headline `<em>` phrases, and any small ornamental moment. Sans never italic — Work Sans should always render upright.

Line-height runs tight at display scale (0.9–0.98) and opens to 1.4–1.55 on body and card body. Letter-spacing is slightly negative on the largest sizes (–0.01 to –0.02em) and zero or near-zero on body. The 11px Work Sans swatch-label is the only uppercase element in the system — and it carries a generous 0.06em letter-spacing that makes its 11px size legible.

## Layout

### Canvas System

Soft Editorial targets a **fixed 1920×1080 canvas** via the `<deck-stage>` element. Layout is built on absolute positioning from the slide edges — every element is positioned via `position: absolute` with `top`/`left`/`right`/`bottom` offsets relative to the slide. The system does not use viewport-relative units; it relies on the deck-stage's scaling to handle viewport differences.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-outer}` | 80px | Standard left/right inset for content blocks |
| `{spacing.pad-top}` | 60px | Top inset for the eyebrow / pagedot chrome |
| `{spacing.pad-bottom}` | 50px | Bottom inset for the footer chrome |
| `{spacing.card-pad-lg}` | 64px 48px | Card padding for spacious cards (insights, closer) |
| `{spacing.card-pad-md}` | 48px 52px | Card padding for medium cards (next-step panels) |
| `{spacing.card-pad-sm}` | 28px 30px | Card padding for compact cards (columns, design-system tiles) |
| `{spacing.gap-cards}` | 28px | Standard gap between cards in a row or grid |
| `{spacing.gap-cards-lg}` | 36px | Larger gap between major panels |
| `{spacing.gap-stack}` | 36px | Vertical gap between stacked text elements |

### Chrome Frame

Every standard slide carries three chrome elements at fixed positions:

- **Eyebrow** — section name at top-left (60px from top, 80px from left), Work Sans 28px in `{colors.ink}`.
- **Pagedot** — page numeral at top-right (60px from top, 80px from right), italic Cormorant Garamond 26px in `{colors.ink-soft}`.
- **Footer** — two-column footer at bottom (50px from bottom, 80px from each side), italic Cormorant Garamond 26px in `{colors.ink-soft}` (date left, publication name right).

The cover slide swaps the pagedot for a row of three circular pastel swatches at top-right (the visual signature of the deck's palette). Full-bleed accent slides (the closer) shift chrome to dark ink on the colored field while preserving positions.

## Depth and Elevation

Soft Editorial uses **no drop shadows**. Depth comes entirely from translucency and rounded form:

- **Translucent white cards** — `{colors.card-fill}` (rgba 255,255,255,0.55) — sit on top of the cream field. The translucency lets the warm paper bleed through and makes the card feel "lifted" without any shadow.
- **Saturated pastel cards** — pink, lemon, blush, sage, lilac fills — sit on the cream field at full opacity. The visual difference between card and field is the color, not the elevation.
- **Rounded corners** — every card has a generous border-radius (22–36px), which softens the form and reads as "physical card" rather than "screen rectangle."

There is no second tier of elevation. Cards do not stack on cards. If a layout needs visual hierarchy, it uses size and color, not z-stacking.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 999px (pill) | Status pills (yes/partial/no/note) |
| 36px | Large insight cards, closer card |
| 32px | Method step cards |
| 28px | Item cards, process nodes, chart frames |
| 24px | Default panel cards, consult columns, design-system tiles, action bars |
| 22px | Larger system tiles in design-system grids |
| 18px | Decorative timeline bar |
| 16px | Palette swatch tiles |
| 14px | Smallest decorative chips inside design-system grids |
| 6px | Chart legend swatch (a flat rounded bar) |
| 50% (circle) | Cover swatch dots |

There are **no square corners in the system**. Every container is at least 14px rounded; cards are 22–36px rounded; pills are fully rounded.

### Border Weights

- **No solid borders on standard cards**. The card's background and rounded form provide its definition.
- **1px dashed** in `{colors.rule-soft}` (rgba 42,36,27,0.18) — internal hairlines for table cells, matrix dividers, source-line markers, system-tile separators.
- **1.5px solid** in `{colors.rule-medium}` (rgba 42,36,27,0.35) — heavier dividers for matrix head-row underlines, column header rules.
- **1px solid** in a similar low-opacity ink — used on chart plot edges and a small set of "note" pills.

### Decorative Element Types

**Soft card** — the default content container. A translucent white card with 24–36px border-radius and 28–64px internal padding. Sits on the cream field as a lifted region.

**Color card** — a saturated pastel card (pink, lemon, blush, sage, lilac) with 22–36px border-radius. Used for stats, step cards, insight cards, and any moment that wants color. Text inside stays ink/ink-soft — never inverted.

**Status pill** — a fully rounded 999px-radius pill with mixed serif/sans contents. Pastel-filled (lemon, blush, pink) for affirmative/partial/negative status; translucent white with a 1px ink border for "note."

**Action bar** — a full-width lemon-filled rounded card (24px radius) running across the top of a slide, containing a tag-separator structure and a serif headline. Used for callouts, CTAs, or attention-grabbing meta moments.

**Cover swatch row** — a row of 3–5 circular 56px discs in the deck's accent palette, positioned at top-right of the cover slide. The visual signature of the system's color philosophy.

**Drop cap** — a 132px Cormorant Garamond medium first letter that floats left at the start of an opener paragraph, with 8px 14px 0 0 padding. The single most editorial typographic moment in the system.

**Italic step numeral** — an italic Cormorant Garamond Roman numeral (i., ii., iii.) in the 64–92px range, sitting at the top of a step card above a serif headline and sans body. The Roman numeral is non-negotiable for steps.

**Quote mark** — a single italic Cormorant Garamond `"` at 220px in `{colors.blush}`, sitting above a centered pull-quote. The quote mark's color is its own signal — soft peach, not ink.

**Legend bar** — a 28px × 12px rounded-end (6px radius) horizontal bar in a chart's accent color, paired with a label.

**Source line** — a dashed-top-rule italic serif line at the bottom of a column or panel, marking a source attribution or sign-off.

## Do's and Don'ts

### Do

- Use Cormorant Garamond at weight 500 for every headline, and drop italic `<em>` phrases to weight 400 inside. The weight drop is the system's voice.
- Set the slide background to `{colors.paper}` on every standard slide — the warm cream field is the constant.
- Default cards to translucent white (`{colors.card-fill}`) at 24–36px border-radius. Reach for pastel fills when a card needs color or status, not by default.
- Keep text in `{colors.ink}` on every surface, including all pastel cards. The system never inverts to white on pastels.
- Use italic serif (Cormorant Garamond italic) for kickers, markers, page numerals, footers, step numerals, sign-offs, and any small ornamental moment.
- Apply a drop cap to opener paragraphs in long-form reads — 132px Cormorant Garamond medium, line-height 0.85, padding 8px 14px 0 0.
- Use Roman numerals (lowercase italic: i., ii., iii.) for step ordinals. Arabic step numbers break the editorial register.
- Render every page numeral as italic Cormorant Garamond at 26px in `{colors.ink-soft}`, positioned absolute at top-right.
- Use Work Sans only for body, eyebrows, attributions, and the small uppercase swatch-labels. Work Sans never carries a headline.
- Pad slides with 80px outer insets and leave 28–36px gaps between cards. The cream field breathing around cards is part of the design.

### Don't

- Don't fill the slide background with a pastel — the pastels are card fills (with one exception: the full-bleed closer slide can take a full pink field for a single "moment"). Default slides stay on cream.
- Don't invert text to white on pastel cards. Text always reads ink-on-color.
- Don't use square corners on any card or container. The minimum acceptable radius is 14px; cards live at 22–36px.
- Don't add drop shadows. The system's depth comes from translucency and form, not from elevation.
- Don't use a third typeface. Cormorant Garamond and Work Sans are the only families. Adding a display font or a mono breaks the editorial register.
- Don't bold inside body. If body needs emphasis, switch to italic serif or use a strong tag at weight 500 inside Work Sans (rare).
- Don't render kickers, markers, or footers in roman serif. The ornamental small text is always italic.
- Don't use uppercase outside the 11px swatch-label. The system is sentence case throughout.
- Don't use mono. There is no monospace in this system — every label is sans or italic serif.
- Don't crowd cards edge-to-edge. The 28–36px gaps and the cream field around cards are load-bearing.

## Responsive Behavior

Soft Editorial is a **fixed 1920×1080** system rendered inside a `<deck-stage>` web component. The deck-stage handles scaling: the slide content is laid out at exact 1920×1080 pixel dimensions and the component scales the entire stage to fit the viewport (letterboxing or fitting as configured by the stage). All `top`/`left`/`right`/`bottom`/`width`/`height` values inside slides are in pixels and assume the fixed 1920×1080 canvas.

### Scaling Behavior

Because the deck-stage scales uniformly, all elements maintain their relative positions and sizes at any output viewport. A 232px display headline remains 232px on the deck-stage's internal canvas; the stage scales the entire canvas to fit the browser viewport.

### Presenter Behavior

Navigation is handled by the `deck-stage.js` script (an external dependency, not embedded). Each slide carries a `data-label` attribute identifying it in the presenter UI. Slides advance via the deck-stage's own controls.

### Print Behavior

There is no embedded print stylesheet. Static export depends on the deck-stage component's print/export behavior; for PDF generation, the deck-stage should render each slide as a single page at the 1920×1080 canvas size.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face (default) | Chinese face | Weight | Notes |
|---|---|---|---|---|
| Display / Headline | Cormorant Garamond 500 | 霞鹜文楷 LXGW WenKai (LXGW WenKai TC) | 400 | LXGW WenKai is a hand-written-feel kaiti that mirrors Cormorant's literary register. The single regular weight matches Cormorant's gentle medium. |
| Italic emphasis (`<em>`) | Cormorant Garamond italic 400 | 霞鹜文楷 LXGW WenKai | 400 | LXGW WenKai has no true italic — emphasis instead drops to `{colors.ink-soft}` or a faint underline. Do not synthesize italic. |
| Body | Work Sans 400 | 思源宋体 / Noto Serif SC | 400 | The system body switches from sans to serif in CJK to preserve the literary register; Work Sans loses its editorial calm beside a kaiti headline. |
| Body — alt sans (optional) | Work Sans 400 | Noto Sans SC | 400 | Only use if the deck has very dense data; default to Noto Serif SC. |
| Kicker / marker / page numeral | Cormorant Garamond italic 400 | 霞鹜文楷 LXGW WenKai 400 | 400 | Italic ornament becomes upright kaiti; rely on `{colors.ink-soft}` color shift instead of italic for the same "soft ornament" feel. |

### Mixed-Content Strategy

This template uses **Strategy C (literary)**: keep the Latin face for English glyphs and let the CJK fallback in only when a Chinese character appears, via a stacked `font-family`. Cormorant Garamond is part of Soft Editorial's brand identity — replacing it with a kaiti for every headline strips the system of its old-style serif personality. Letting Latin stay in Cormorant while Chinese drops into LXGW WenKai preserves both registers.

```css
font-family: 'Cormorant Garamond', 'LXGW WenKai TC', 'Noto Serif SC', serif;  /* headlines */
font-family: 'Work Sans', 'Noto Serif SC', sans-serif;                          /* body */
```

**Warning — baseline mismatch at display sizes.** Cormorant Garamond's x-height sits noticeably lower than LXGW WenKai's optical center. At 96px+ headlines, a phrase like `Soft Editorial 软编辑` will show the Chinese characters floating slightly above the Latin baseline. Mitigations:
- Add `font-feature-settings: "palt"` on the Chinese segment to tighten metrics.
- Wrap CJK in a `<span lang="zh">` with a small `vertical-align: -0.04em` adjustment on display tokens (display, title, closer, numeral-hero, panel-headline).
- For pure-CJK headlines (no Latin), the issue disappears — the mismatch only surfaces in mixed-script lines.

### Loading

Add to `<head>` (Google Fonts hosts LXGW WenKai TC and Noto Serif SC):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Work+Sans:wght@400;500&family=LXGW+WenKai+TC&family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

LXGW WenKai TC is the Traditional Chinese cut on Google Fonts; it includes the full CJK Unified Ideographs range and renders Simplified Chinese cleanly. Noto Serif SC carries body text in Simplified Chinese with proper hinting.

### Universal CJK Adjustments

Apply on any element rendering Chinese content (typically scope via `:lang(zh)` or `<span lang="zh">`):

- **Line-height**: body 1.75–1.85 (Soft Editorial's 1.5 sans-default needs more air for CJK strokes); display 1.15–1.25 (tighter than Latin 0.92–1 because CJK glyphs already include intrinsic spacing).
- **Letter-spacing**: 0 on CJK. The system's negative tracking (-0.01 to -0.02em) on display Latin is wrong for Chinese — CJK glyphs are pre-spaced; negative tracking causes overlap.
- **Text-transform**: no uppercase on CJK. Chinese has no case, and CSS `text-transform: uppercase` is a no-op on Han characters anyway, but make sure no parent rule attempts it.
- **Full-width punctuation**: use `，。：；！？` (full-width) not `,.:;!?` (half-width). The full-width forms include their own surrounding whitespace and align to the CJK em-box.
- **No period on display headlines**: Chinese headlines drop the terminal `。` — the headline's visual closure is enough. (Latin headlines in this system already drop periods; the rule extends to CJK.)
- **Pangu spacing (盘古之白)**: insert a thin space between CJK and adjacent Latin/numerals. Write `使用 Claude` not `使用Claude`; `2024 年` not `2024年`. This is editorial convention in good Chinese typography and matches Soft Editorial's literary care.
- **One font per sentence**: don't mix LXGW WenKai and Noto Serif SC inside a single line. Use one or the other for the entire run; switching mid-sentence creates a metric jolt.

### Aesthetic Notes for This System

LXGW WenKai is exceptionally well-matched to Soft Editorial's register. The kaiti's slight hand-written warmth picks up where Cormorant Garamond's old-style italic leaves off — both faces read as personal, considered, slightly intimate against the cream paper field. On a pastel card (pink, lemon, blush, sage, lilac), LXGW WenKai at headline scale reads as a calligraphic moment, which strengthens rather than weakens the editorial calm. The drop cap treatment (132px Cormorant Garamond medium) does not translate to CJK — kaiti drop caps look severed rather than ornamental; for Chinese opener paragraphs, drop the drop cap entirely and rely on the italic kicker above the paragraph for the "essay opening" cue.

The serif body switch (Work Sans → Noto Serif SC) is the most consequential change. Work Sans's humanist grotesque feels paired with Cormorant in Latin, but a sans body beside a kaiti headline reads as a cheap textbook in Chinese. Noto Serif SC's Song-style strokes resonate with both the cream field and the literary headline face, preserving the small-press literary quarterly mood across languages. Keep eyebrows (28px) in Noto Sans SC if you want a small register shift from the body, mirroring the Latin sans-vs-serif distinction.

### Known CJK Gap

- LXGW WenKai has only a single weight (regular). The system's signature "weight drop" inside headlines (Cormorant 500 → italic 400) cannot be reproduced in CJK. Substitute with a color shift to `{colors.ink-soft}` for emphasis, or accept that Chinese headlines read as one consistent weight.
- LXGW WenKai TC's Traditional-cut glyphs may render a small number of characters with Traditional forms (e.g., 設 instead of 设). For pure Simplified Chinese decks, prefer `font-family: 'Noto Serif SC'` as the primary CJK face and reserve LXGW WenKai for accent moments (cover title, chapter titles).
- The italic ornament moments (kickers, page numerals, footers, sign-offs) lose their italic in CJK because no CJK face carries true italic. Compensate by using `{colors.ink-soft}` and slightly smaller sizes to keep the "ornamental whisper" register.
- Baseline mismatch at display sizes (see Mixed-Content Strategy) requires per-deck tuning if covers carry mixed-script headlines.

## Iteration Guide

1. Any new headline uses Cormorant Garamond at weight 500, with italic `<em>` phrases dropping to weight 400. The weight drop is the editorial signal.
2. Any new card defaults to translucent white (`{colors.card-fill}`) at 24–36px border-radius. Pastel fills are for moments that need color, not for every card.
3. Any new step ordinal is an italic lowercase Roman numeral (i., ii., iii.) in Cormorant Garamond italic at 64–92px.
4. Any new kicker, marker, page numeral, footer, or sign-off is italic Cormorant Garamond at 26–38px in `{colors.ink-soft}` or `{colors.ink}`.
5. Any new pastel introduction (a sixth color) breaks the system. The five-pastel palette (pink, lemon, blush, sage, lilac) is closed.
6. Any new pill uses 999px border-radius with a pastel fill or translucent white. Pills are sub-headline emphasis units, not chrome.
7. The cover swatch row (three circular discs at top-right) is the system's identity mark. Preserve it on cover slides.
8. Page chrome (eyebrow, pagedot, footer) sits at fixed absolute positions on every standard slide. Don't drift the positions.
9. Long-form paragraph reads should open with a drop cap (132px Cormorant Garamond medium) — this is the system's most distinctive editorial moment.
10. The cream field around and between cards is load-bearing. If a layout needs to be denser, increase card content rather than shrinking the field.

## Known Gaps

- The system depends on the external `deck-stage.js` script for slide scaling and navigation. The script is referenced but not embedded; without it, slides will render at intrinsic 1920×1080 without viewport scaling.
- Cormorant Garamond and Work Sans both load from Google Fonts. If fonts fail, the serif falls back to Garamond/serif and the sans falls back to Helvetica/sans-serif; the editorial character degrades significantly without Cormorant.
- The full-bleed closer slide is the only place where a pastel covers the entire canvas. The pattern is intentional but should be used sparingly — every closer at full pink would diminish the cream-as-default identity.
- The five pastels (`{colors.pink}`, `{colors.lemon}`, `{colors.blush}`, `{colors.sage}`, `{colors.lilac}`) are listed as semantically interchangeable, but the source template uses lemon = yes / blush = partial / pink = no inside the matrix layout. New decks may follow or ignore this convention.
- The drop cap treatment depends on CSS `:first-letter` rendering, which has slight cross-browser variation in metric handling. Padding and line-height values are tuned for Cormorant Garamond and may need adjustment if the font fails to load.
- The translucent white card fill (`rgba(255,255,255,0.55)`) depends on the cream paper showing through. On a different background color, the card would read differently — the spec assumes `{colors.paper}` is the surface.
- Card padding values vary across layouts (28/30, 48/52, 64/48) without a strict scale; the rule is "compact, medium, spacious" rather than a fixed token system.
