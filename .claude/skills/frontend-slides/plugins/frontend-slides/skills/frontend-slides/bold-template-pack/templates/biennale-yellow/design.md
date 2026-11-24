---
version: alpha
name: Biennale Yellow
description: "A literary-editorial presentation system in the visual register of an art biennale catalogue or quiet exhibition poster. The aesthetic is built on warm parchment grounds (`#E9E5DB`) flooded with soft solar yellow (`#F1EE2E`) radial blooms, set against a single deep indigo navy ink color. Display type is Instrument Serif — a contemporary high-contrast serif with tall ascenders and elegant italics — paired with Archivo for sans-serif chrome and JetBrains Mono for numerical and metadata callouts. No drop shadows, no rounded corners, no bordered cards: the only structural lines are hairline 1px rules in ink. The mood sits between a folded museum brochure, a slow-reading literary quarterly, and a Mediterranean exhibition poster — confident, atmospheric, and deeply restrained."

colors:
  paper: "#E9E5DB"
  paper-deep: "#DCD6C4"
  sun: "#F1EE2E"
  sun-soft: "#F8F39B"
  haze: "#F0DA7C"
  ink: "#1B2566"
  ember: "#E26B4A"

color-aliases:
  line: ink

typography:
  display:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(120px, min(14.6vw, 22vh), 240px)"
    lineHeight: 0.86
    letterSpacing: -0.018em
  display-md:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(80px, min(10vw, 16vh), 200px)"
    lineHeight: 0.86
    letterSpacing: -0.018em
  display-sm:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(110px, min(11vw, 18vh), 200px)"
    lineHeight: 0.86
    letterSpacing: -0.018em
  display-it:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontStyle: italic
    fontSize: "clamp(56px, min(7vw, 11vh), 120px)"
    lineHeight: 1.04
    letterSpacing: -0.005em
  numeral-jumbo:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(220px, min(28vw, 64vh), 720px)"
    lineHeight: 0.84
    letterSpacing: -0.04em
  numeral-lg:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(120px, min(15vw, 22vh), 280px)"
    lineHeight: 0.9
    letterSpacing: -0.04em
  numeral-md:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(72px, min(7vw, 12vh), 144px)"
    lineHeight: 0.92
    letterSpacing: -0.01em
  headline:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(40px, min(4.6vw, 7vh), 88px)"
    lineHeight: 1.06
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(32px, min(3.6vw, 6vh), 56px)"
    lineHeight: 1
  date-rail:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(48px, min(5.2vw, 9vh), 96px)"
    lineHeight: 0.96
    letterSpacing: -0.005em
  ledger-title:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(20px, 1.6vw, 30px)"
    lineHeight: 1.15
  strand-title:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(22px, 1.7vw, 32px)"
    lineHeight: 1.1
  strand-num:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontWeight: 400
    fontSize: "clamp(28px, 2vw, 38px)"
    lineHeight: 1
  body-lede:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 400
    fontSize: "clamp(15px, 1.05vw, 18px)"
    lineHeight: 1.55
  body:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 400
    fontSize: "clamp(14px, 0.95vw, 16px)"
    lineHeight: 1.5
  body-sm:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 400
    fontSize: "clamp(11px, 0.78vw, 13px)"
    lineHeight: 1.5
  micro-label:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 600
    fontSize: "clamp(11px, 0.85vw, 14px)"
    lineHeight: 1.2
    letterSpacing: 0.18em
    textTransform: uppercase
  micro-label-tight:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 600
    fontSize: "clamp(10px, 0.72vw, 12px)"
    lineHeight: 1.2
    letterSpacing: 0.16em
    textTransform: uppercase
  rail-label:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 600
    fontSize: "clamp(11px, 0.85vw, 13px)"
    lineHeight: 1
    letterSpacing: 0.32em
    textTransform: uppercase
  mono-data:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontWeight: 400
    fontSize: "clamp(12px, 0.85vw, 14px)"
    lineHeight: 1.4
    letterSpacing: 0.04em
  mono-date:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontWeight: 400
    fontSize: "clamp(13px, 0.95vw, 16px)"
    lineHeight: 1.4
    letterSpacing: 0.02em
  pagenum:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontWeight: 400
    fontSize: "clamp(11px, 0.85vw, 13px)"
    lineHeight: 1
    letterSpacing: 0.08em

spacing:
  pad-edge: "clamp(40px, 4vw, 76px)"
  pad-region: "clamp(40px, 4.2vw, 80px)"
  pad-foot: "clamp(56px, 5vh, 88px)"
  pad-strand-y: "clamp(12px, 1.6vh, 22px)"
  gap-region: "clamp(20px, 2.5vw, 48px)"
  gap-strand: "clamp(14px, 1.8vh, 22px)"
  gap-footer-col: "clamp(20px, 2.4vw, 44px)"
  pagenum-bottom: "clamp(22px, 2.4vh, 42px)"
  pagenum-right: "clamp(24px, 2.4vw, 48px)"

canvas:
  width: 100vw
  height: 100vh
  background: "{colors.paper}"

components:
  pagenum:
    position: "absolute, right + bottom"
    color: "{colors.ink}"
    opacity: 0.75
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(11px, 0.85vw, 13px)"
    letterSpacing: 0.08em
    description: "Single mono pagenum NN / NN pinned to bottom-right of every slide at 75% opacity. The only persistent chrome on every surface."
  hairline-rule:
    border: "1px solid {colors.ink}"
    description: "1px solid ink horizontal or vertical rule. The system's only border treatment — separates header bands from content, footer columns from each other, ledger rows from each other. No thicker rule exists."
  hairline-rule-soft:
    border: "1px solid rgba(27, 37, 102, 0.18-0.2)"
    description: "1px ink at 18-20% opacity. Used for between-row separators inside dense ledger or strand lists where a full-weight rule would feel oppressive."
  sun-bloom:
    background: "radial-gradient using {colors.sun} {colors.sun-soft} {colors.haze} blending to transparent on {colors.paper}"
    description: "Large soft radial bloom of solar yellow placed off-center or behind a focal element. The system's primary atmospheric layer. Sized 42-70% of viewport in the larger axis."
  ember-bloom:
    background: "radial-gradient using {colors.ember} at 15-22% opacity blending to transparent"
    description: "Small warm peach bloom used as a counter-temperature accent in a corner opposite the sun bloom. Always subordinate; never dominant."
  block-tile:
    background: "{colors.sun} at 40-70% opacity"
    description: "Geometric blocks of translucent solar yellow placed on an 8-row × 4-column grid behind cover or colophon surfaces. Suggests a layered poster underprint."
  yellow-panel:
    background: "{colors.sun}"
    color: "{colors.ink}"
    description: "Full-bleed yellow panel covering a column or third of the slide. The strongest possible color statement — used when a region needs to read as poster-fill, not paper."
  bar-ink:
    background: "{colors.ink}"
    height: "clamp(14px, 1.6vh, 22px)"
    description: "Solid ink horizontal bar for data charts. Width carries the data value."
  bar-lit:
    background: "{colors.sun}"
    border: "1px solid {colors.ink}"
    height: "clamp(14px, 1.6vh, 22px)"
    description: "Highlighted variant of bar-ink — yellow fill with 1px ink stroke. Used to mark the current or featured row in a series."
  strand-row:
    layout: "grid 56px 1fr, gap clamp(14px, 1.4vw, 24px), border-bottom hairline-soft, padding-bottom clamp(12px, 1.6vh, 22px)"
    description: "Numbered editorial list row — numeral cell + content cell separated by hairline-soft. Used for programmes, agendas, and curated lists."
  ledger-row:
    layout: "grid 92px 1.6fr 0.9fr 80px, gap clamp(14px, 1.4vw, 28px), border-bottom hairline-soft, padding clamp(10px, 1.3vh, 18px) 0"
    description: "Four-column tabular row for calendars and itineraries. Date column is mono, title is serif, venue is sans, duration is mono right-aligned."
  footer-band:
    layout: "grid 4-column with hairline-rule top border on each cell, gap clamp(20px, 2.4vw, 44px)"
    description: "Four-column metadata strip pinned to the bottom of cover and colophon surfaces. Each cell has a tiny uppercase tag + a brief plain-English statement."
  vertical-rail:
    transform: "rotate(-90deg) translateY(-50%) at left edge"
    fontFamily: "'Archivo', sans-serif"
    fontSize: "clamp(11px, 0.85vw, 13px)"
    letterSpacing: 0.32em
    textTransform: uppercase
    description: "Rotated vertical text label running up the left edge. Used on chapter/divider surfaces as a section marker."
  date-rail-stack:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontSize: "clamp(48px, min(5.2vw, 9vh), 96px)"
    lineHeight: 0.96
    textAlign: right
    description: "Large serif date or date-range stacked at top-right of cover surfaces. Uses an en-dash to indicate spans."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Biennale Yellow is a **literary-editorial presentation system** modeled on the visual language of European art biennale catalogues, slow exhibition posters, and quarterly literary publications. There are no cards, no buttons, no shadows, no rounded corners. The structural vocabulary is just three things: paper, ink, and yellow.

The typographic system pivots on **Instrument Serif**, a contemporary high-contrast serif with tall ascenders, elegant italics, and slightly flared terminals. It carries every display moment, every numeral, every quote — at scales ranging from headline-small (40px) to jumbo numerals over 700px. Set tight (line-height 0.86, letter-spacing −0.018em), it reads as confident editorial display; set looser in italic (line-height 1.04, letter-spacing −0.005em), it becomes a slow-reading quotation face. **Archivo** is the sans companion — used for body paragraphs and as small, wide-tracked uppercase labels (the "micro-label" treatment). **JetBrains Mono** handles all numerical and metadata callouts: dates, ledger figures, page numbers. The three-face system is rigid and disciplined; the contrast between them is the entire typographic story.

The color world is built on **warm parchment** (`{colors.paper}` — `#E9E5DB`) as the universal ground, marked by a single **ink** color (`{colors.ink}` — `#1B2566`, a deep indigo navy) used for every line of type and every rule. The system's signature color is **sun** (`{colors.sun}` — `#F1EE2E`), a highly saturated solar yellow used as a flooded panel, as a soft blooming radial gradient, or as a geometric tile underprint. A **soft ember peach** (`{colors.ember}` — `#E26B4A`) appears only as a subordinate counter-temperature accent, always at 15-22% opacity in a corner radial bloom. Inverted color treatments are not used; the system commits to navy ink on a warm ground.

Depth is **atmospheric, not structural**. There are no drop shadows anywhere in the system. Depth comes from layered radial gradients of yellow (the sun-bloom and ember-bloom components) and the optional block-tile underprint on cover-class surfaces. Cards have no borders; regions are separated only by 1px hairline rules in ink. The lack of border weight is itself the aesthetic — the design feels printed, not engineered.

**Density philosophy: editorial-restrained.** This system reads as elegant when sparse and broken when crowded. A typical surface holds one large display moment + a handful of supporting elements (a micro-label, a body paragraph, an ordered list, or a single radial bloom). Crowding the canvas with cards, buttons, panels, or stacked components turns the system into a different aesthetic entirely. Even dense surfaces (a calendar or programme) achieve density through tabular repetition, not visual richness — many quiet rows of hairline-separated metadata, not many bordered cells. Generous edge padding (40-76px) and wide footer/header bands let the canvas breathe.

**Key Characteristics:**
- Warm parchment ground (`{colors.paper}`) on every surface; never white, never gray.
- Single ink color (`{colors.ink}`) for all text and all rules — no secondary text colors.
- Solar yellow (`{colors.sun}`) deployed three ways: as a flooded panel, as a soft radial bloom, as a translucent geometric tile underprint.
- Instrument Serif handles every display moment at scales from 40px to 720px+.
- Archivo Bold uppercase + 0.16–0.32em tracking is the universal label voice.
- JetBrains Mono is reserved exclusively for dates, ledger numerals, and page numbers.
- 1px hairline rules in `{colors.ink}` are the only border treatment — used for header bands, ledger rows, footer columns, and strand separators.
- No drop shadows, no rounded corners, no card outlines, no buttons. Decoration is atmospheric (radial blooms) or geometric (translucent tile blocks).
- Persistent `01 / NN` JetBrains Mono pagenumber at bottom-right of every surface at 75% opacity.
- Optional vertical rotated rail-label at the left edge of chapter/divider surfaces.

## Colors

### Palette

- **Paper** (`{colors.paper}` — `#E9E5DB`): The warm parchment canvas. The default and near-universal background. Reads as a softened off-white with strong warmth — never neutral, never cold.
- **Paper-deep** (`{colors.paper-deep}` — `#DCD6C4`): A slightly darker parchment tone, available as a secondary surface or to suggest a shadow band without using actual shadow. Reserved for moments that need surface differentiation while staying within the warm-paper family.
- **Ink** (`{colors.ink}` — `#1B2566`): The single text and line color across the entire system. A deep indigo navy that reads as confident editorial black-with-blue-bias. Used for headlines, body, micro-labels, monos, hairline rules, and ink-bar fills. The `--line` CSS variable resolves to this same color.
- **Sun** (`{colors.sun}` — `#F1EE2E`): The system's signature solar yellow. Highly saturated, slightly green-leaning. Used three ways: as a flooded full-bleed or column-bleed panel, as the core of soft radial blooms, and as 40-70% opacity geometric tile blocks.
- **Sun-soft** (`{colors.sun-soft}` — `#F8F39B`): A paler buttery yellow used in the middle stops of sun-bloom gradients to soften the transition from saturated sun to paper.
- **Haze** (`{colors.haze}` — `#F0DA7C`): A warmer mustard-leaning yellow used in the outermost stops of sun-bloom gradients to extend the bloom into the paper without a hard edge.
- **Ember** (`{colors.ember}` — `#E26B4A`): A warm peach-orange used only as a subordinate counter-temperature accent in 15-22% opacity radial blooms. Never used as a fill color, never as a text color. Its job is to balance a sun-bloom on the opposite side of the canvas.

### Defaults

- **Default surface background**: `{colors.paper}`. Every surface starts here.
- **Default headline color**: `{colors.ink}`. Always. Headlines never appear in yellow, ember, or paper-deep — only ink.
- **Default body text color**: `{colors.ink}`. Body uses the same color as display; the contrast is achieved through size and weight, not color.
- **Default rule color**: `{colors.ink}` (1px solid) for primary separators, ink at 18-20% opacity for secondary row separators.
- **Default accent surface for poster moments**: `{colors.sun}` — a flooded panel of solar yellow with `{colors.ink}` text on top.
- **Default atmospheric layer**: a single `{components.sun-bloom}` placed off-center on the surface, with an optional `{components.ember-bloom}` in the opposite corner.
- **Default chart bar color**: `{colors.ink}`. The featured/current bar uses `{components.bar-lit}` (yellow fill, ink stroke).
- **Default label color**: `{colors.ink}` for the text, no fill. Labels are tracking + uppercase + weight 600, not filled pills.

The system never inverts: ink text on a sun panel is correct (and a key signature treatment), but yellow text on an ink ground does not exist. Text is always ink; the variability lives in what's behind the text, not in the text color itself.

## Typography

### Font Family Stack
The system runs three faces, each with a tightly defined role.

**Instrument Serif** (Google Fonts, italic + roman) is the display and editorial face. Its high contrast, tall ascenders, and slightly flared terminals give it a contemporary literary register — closer to a magazine masthead than a traditional book serif. Roman is used for headlines, numerals, ledger titles, and date rails. Italic is used for manifesto quotes and certain emphasis moments. Set tight (line-height ≤ 1.06, negative letter-spacing −0.005 to −0.04em).

**Archivo** (Google Fonts) is the sans companion. Used at weight 400 for body paragraphs (line-height 1.5) and at weight 600 for the universal micro-label treatment (uppercase, 0.16-0.32em tracking, 10-14px). Never used at intermediate weights, never used for headlines.

**JetBrains Mono** (Google Fonts) is the numerical/metadata face. Used exclusively for dates in ledgers, mono numerical callouts in data slides, page numbers, and the nav-hint. Its slab character gives editorial weight to numerical content without leaning on bold styling.

### Typography Scale

| Token | Size (clamp) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | 120–240px | Instrument Serif | 400 | Cover-scale display title |
| `{typography.display-sm}` | 110–200px | Instrument Serif | 400 | Editorial display in a panel context |
| `{typography.display-md}` | 80–200px | Instrument Serif | 400 | Closing-statement display |
| `{typography.display-it}` | 56–120px | Instrument Serif italic | 400 | Manifesto-scale italic quote body |
| `{typography.numeral-jumbo}` | 220–720px | Instrument Serif | 400 | Chapter-divider ordinal numeral |
| `{typography.numeral-lg}` | 120–280px | Instrument Serif | 400 | Decorative quotation mark, oversized punctuation |
| `{typography.numeral-md}` | 72–144px | Instrument Serif | 400 | Hero stat figure |
| `{typography.headline}` | 40–88px | Instrument Serif | 400 | Primary section headline, large quote body |
| `{typography.headline-sm}` | 32–56px | Instrument Serif | 400 | Region headline, ledger/calendar topbar |
| `{typography.date-rail}` | 48–96px | Instrument Serif | 400 | Date or date-range stacked at top of a surface |
| `{typography.ledger-title}` | 20–30px | Instrument Serif | 400 | Title cell inside a calendar/ledger row |
| `{typography.strand-title}` | 22–32px | Instrument Serif | 400 | Title inside a numbered strand/list row |
| `{typography.strand-num}` | 28–38px | Instrument Serif | 400 | Numeral cell inside a strand row |
| `{typography.body-lede}` | 15–18px | Archivo | 400 | Lede paragraph following a chapter headline |
| `{typography.body}` | 14–16px | Archivo | 400 | Standard body paragraph |
| `{typography.body-sm}` | 11–13px | Archivo | 400 | Footer-band body text, dense metadata |
| `{typography.micro-label}` | 11–14px | Archivo | 600 | Universal uppercase eyebrow label |
| `{typography.micro-label-tight}` | 10–12px | Archivo | 600 | Smaller uppercase label inside footer cells |
| `{typography.rail-label}` | 11–13px | Archivo | 600 | Vertical rotated rail label |
| `{typography.mono-data}` | 12–14px | JetBrains Mono | 400 | Chart year/value labels, mono inline data |
| `{typography.mono-date}` | 13–16px | JetBrains Mono | 400 | Date column in calendar ledgers |
| `{typography.pagenum}` | 11–13px | JetBrains Mono | 400 | Persistent page number |

### Defaults

- **Default size for a cover-scale display headline**: `{typography.display}` (120–240px clamp). Anything smaller reads as section-level, not cover-level.
- **Default size for a primary section headline**: `{typography.headline}` (40–88px clamp).
- **Default size for a chapter-divider numeral**: `{typography.numeral-jumbo}` (220–720px clamp). Don't shrink — the jumbo numeral is the point of a divider surface.
- **Default size for a hero statistic**: `{typography.numeral-md}` (72–144px clamp). Stat figures share the same serif as headlines — they are display moments, not data chrome.
- **Default size for a paragraph body**: `{typography.body}` (14–16px). For a lede after a chapter headline, step up to `{typography.body-lede}` (15–18px).
- **Default size for any eyebrow label**: `{typography.micro-label}` (11–14px) at weight 600, uppercase, 0.18em tracking.
- **Default weight for any Archivo body**: 400. Archivo body at any other weight breaks the rhythm.
- **Default weight for any micro-label**: 600. Labels at weight 400 or 700 read as either timid or oversized.
- **Default tracking for any uppercase label**: 0.16em minimum, 0.32em maximum. Labels without wide tracking read as code, not editorial.

When unsure which display token to reach for, default to `{typography.headline}` (40–88px) for the primary moment, and `{typography.numeral-md}` (72–144px) for a single hero statistic. The display, display-sm, and display-md tokens are reserved for cover/colophon/poster-scale moments.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every display, numeral, headline, and ledger-title element is Instrument Serif at weight 400.** Bold serif display does not exist in this system — the face's contrast is its weight signal. Setting Instrument Serif at weight 700 collapses the entire elegance.
- **Every Instrument Serif display element uses tight line-height (0.84–1.06).** Generous line-height on display destroys the editorial poster feel — large serif headlines must feel stacked, not aerated.
- **Every Instrument Serif display element uses negative letter-spacing.** Display, headline, jumbo numerals at −0.018 to −0.04em; italic display at −0.005em. Without negative tracking, the wide-bodied glyphs read as untreated.
- **Every micro-label is uppercase Archivo weight 600 with tracking ≥ 0.16em.** No exceptions. A label without uppercase + tracking is not a label in this system; it's a stray sans element.
- **Every numerical metadata element (date, page number, chart value, calendar date) is JetBrains Mono.** Serif numerals are for display moments; mono numerals are for data chrome. Don't cross the line.
- **Every italic manifesto-scale quote uses `{typography.display-it}`.** Setting an italic quote at headline scale (40–88px) reads as a smaller moment; the italic is meant to dominate.
- **Every body paragraph is Archivo weight 400 with line-height ≥ 1.45.** Body in Instrument Serif does not exist — Instrument is for display only.

### Typography Principles

The voice contrast is **slow elegant serif ↔ wide-tracked uppercase sans ↔ tabular mono**. Italic Instrument is the system's "feeling" voice (reserved for quotes and manifesto moments); roman Instrument is the "statement" voice; Archivo upper-tracked is the "label" voice; mono is the "data" voice. Each has a single job.

Mixing rules are tight: an `<em>` inside an Instrument Serif headline stays in italic Instrument Serif (no face switch). An `<em>` inside an Archivo body paragraph becomes italic Archivo, not a serif. Don't mix faces inline.

Color is locked to ink on every element. There is no "accent color text" treatment in this system — accent is delivered through atmospheric blooms and panel fills, not text color.

## Layout

### Canvas System
The system targets `100vw × 100vh` per slide. Slides are absolutely positioned and crossfade via opacity transition (280ms ease). Only one slide is `.active` at a time. Every measurement uses CSS `clamp()` with both vw and vh terms — typography clamps include `min(...vw, ...vh)` patterns so display type scales by whichever viewport axis is shorter.

### Padding and Margin Scale

| Token | Range | Use |
|---|---|---|
| `{spacing.pad-edge}` | 40–76px | Standard edge padding from any slide edge to content |
| `{spacing.pad-region}` | 40–80px | Internal padding inside a flooded yellow panel or major region |
| `{spacing.pad-foot}` | 56–88px | Bottom padding when the footer band is present |
| `{spacing.gap-region}` | 20–48px | Gap between two major content columns/regions |
| `{spacing.gap-strand}` | 14–22px | Gap between strand rows in a numbered list |
| `{spacing.gap-footer-col}` | 20–44px | Gap between columns of the footer-band metadata strip |
| `{spacing.pagenum-bottom}` | 22–42px | Bottom inset of the persistent pagenum |
| `{spacing.pagenum-right}` | 24–48px | Right inset of the persistent pagenum |

### Persistent Chrome
The **pagenum** is the only persistent on-canvas element. It appears at `bottom-right` of every slide in JetBrains Mono at 11–13px, color ink, opacity 0.75. A **nav-hint** (`← / → · space`) appears once, fixed to the bottom-left of the viewport in JetBrains Mono at 10–12px / opacity 0.4. The nav-hint is not part of the slide composition — it lives outside the `.stage`.

### Edge Discipline
Every meaningful element respects a minimum 40px (mobile) to 76px (desktop) edge inset. The system's elegance depends on negative space at the edges — pushing content to the bleed (other than full-bleed panels, blooms, and tile blocks) breaks the catalogue feel.

### Atmospheric Layer
Every slide may carry one or both atmospheric layers behind content:
- A **sun-bloom** (`{components.sun-bloom}`) — a large soft radial gradient of solar yellow, sized 42-70% of viewport, placed off-center or behind a focal element.
- An **ember-bloom** (`{components.ember-bloom}`) — a small warm peach radial gradient at 15-22% opacity, placed in a corner opposite the sun bloom.

These layers are not optional decoration — they are the system's primary depth mechanism. A surface without a bloom reads as flat parchment.

## Depth and Elevation

### No Drop Shadows
The system has **zero drop shadows**. No `box-shadow`, no `text-shadow`, no `filter: drop-shadow(...)`. Depth is delivered atmospherically.

### Atmospheric Depth (Sun Bloom)
The primary depth mechanism is the **sun-bloom** — a large soft radial gradient of solar yellow blooming from a point on the canvas. Bloom anatomy is a layered radial gradient with three or four color stops:
- 0%: `{colors.sun}` at 70-95% opacity (the hot core)
- ~30-40%: `{colors.sun}` at 40-65% opacity (the bloom)
- ~55-65%: `{colors.haze}` at 18-22% opacity (the soft extension)
- 80-90%: `{colors.paper}` at 0% (smooth fade into ground)

Bloom size and position varies by surface need: cover surfaces use a centered or slightly-off-center bloom 42% × 38% of viewport; chapter surfaces use a corner-anchored 720px-radius bloom; closing surfaces use a bottom-anchored 55% × 50% bloom rising from below.

### Counter-Temperature Accent (Ember Bloom)
An optional **ember-bloom** in a corner opposite the sun-bloom provides warm-cool color tension without raising the saturation of the canvas. Always at 15-22% opacity, always smaller than the sun-bloom, always subordinate.

### Geometric Underprint (Block Tiles)
On cover and colophon surfaces, an additional **block-tile** layer can appear behind content — translucent solar yellow rectangles placed on an 8-row × 4-column grid system at 40-70% opacity. This layer suggests a layered poster underprint without committing to a solid panel. The tiles are decorative geometry, not active content regions.

### Yellow Panel (Structural Color)
For surfaces that need the strongest possible color statement, a **yellow-panel** flood (`{components.yellow-panel}`) covers a column, half, or third of the canvas in saturated `{colors.sun}`. This is the only "hard" color treatment in the system — when a panel is used, ink text sits on top at full opacity. Panels do not have borders or shadows; they meet the paper edge or another panel edge directly.

### Hairline Rules
Internal structural depth is delivered by **1px solid ink hairline rules** separating header bands from content, ledger rows from each other, and footer columns from each other. Rules are never thicker than 1px. Between secondary list rows (e.g., strand separators), the rule drops to `rgba(27, 37, 102, 0.18-0.2)` — same color, lower opacity.

## Shapes and Treatment

### Border Radius
**Zero, on everything.** Every shape is a strict rectangle. The radial blooms are technically circles but they have no visible edge — they fade into paper.

### Border Weights
- **1px solid `{colors.ink}`** — the universal rule. Used for header-band underlines, ledger row separators, footer-column tops, and the bordered chart bar accent on the lit row.
- **1px solid `rgba(27, 37, 102, 0.18-0.2)`** — soft variant of the same rule. Used for secondary row separators inside dense lists where full-weight ink would feel heavy.

The system has **no thicker borders**. There are no 2px, 3px, or 4px outlines anywhere. The visual structure depends on the lightness of the hairline.

### Decorative Element Types

**Sun-bloom** — Large soft radial gradient of solar yellow placed off-center or behind a focal element. The system's primary depth mechanism. Always one per surface, sometimes paired with a counter-bloom.

**Ember-bloom** — Small warm peach radial gradient at 15-22% opacity, placed in a corner opposite the sun-bloom. Subordinate atmospheric balance.

**Block-tile underprint** — Translucent solar yellow rectangles placed on an 8×4 grid system. Decorative geometry suggesting a layered poster, used on cover and colophon-type surfaces.

**Yellow panel** — A full-bleed column, half, or third of the canvas flooded with `{colors.sun}`. The system's strongest color statement. Carries ink text on top.

**Hairline rule** — 1px solid ink. Used for header-band underlines, ledger separators, footer column tops. The system's only border.

**Footer band** — A four-column metadata strip at the bottom of cover/colophon surfaces. Each cell has a `{components.hairline-rule}` top border, an Archivo micro-label, and a short body statement.

**Strand row** — Numbered editorial list row with serif numeral cell + serif title + sans body, separated from the next row by a hairline-soft rule.

**Ledger row** — Four-column tabular calendar/itinerary row: mono date + serif title + sans venue + mono duration (right-aligned), separated by hairline-soft rules.

**Vertical rail label** — Rotated Archivo uppercase text running up the left edge of a chapter-divider surface, with 0.32em tracking.

**Date rail** — Large serif date or date-range stacked at top-right of cover surfaces, often using an en-dash to indicate a span across years or months.

**Jumbo numeral** — A single huge Instrument Serif numeral (220-720px) dominating a divider surface. Always serif, always at weight 400, always with tight line-height.

**Chart bar** — A solid ink rectangle whose width carries the data value. The featured/current bar swaps to yellow fill with a 1px ink stroke (`{components.bar-lit}`). Chart layouts use grid-row patterns: mono year label + bar + mono value, separated by gap.

## Do's and Don'ts

### Do

- Apply `{colors.paper}` as the universal background. Every surface starts on parchment.
- Set every line of text in `{colors.ink}` — display, body, micro-label, mono, everything. The single text color is non-negotiable.
- Use Instrument Serif at weight 400 with tight line-height (0.84-1.06) and negative letter-spacing (-0.018 to -0.04em) for every display moment. The serif's elegance lives in this configuration.
- Add at least one `{components.sun-bloom}` to every surface. Atmospheric depth is the system's depth mechanism; a flat parchment surface reads as broken.
- Pair a sun-bloom with an `{components.ember-bloom}` in the opposite corner when you want warm-cool tension without raising the overall saturation.
- Use `{components.hairline-rule}` (1px solid ink) for every structural separator: header-band underline, ledger row, footer column, strand separator.
- Set every uppercase label in Archivo weight 600 with 0.16-0.32em tracking. Without the wide tracking, labels read as code, not editorial.
- Use `{components.yellow-panel}` (full-bleed sun column or panel) when a surface needs strongest color commitment — keep ink text on top at full opacity.
- Place the persistent `{components.pagenum}` (JetBrains Mono, 75% opacity ink) at bottom-right of every surface.
- Reserve JetBrains Mono exclusively for numerical and metadata callouts: dates, ledger figures, chart values, page numbers, nav-hint. Never use mono for display or body.

### Don't

- Don't add drop shadows. The system has zero box-shadows and zero text-shadows. Adding any blurred or offset shadow breaks the printed-paper feel immediately.
- Don't round any corner. Every shape is strict rectangle. Border-radius is forbidden.
- Don't use borders thicker than 1px. The hairline rule is the only border vocabulary; 2px, 3px, or 4px outlines do not exist.
- Don't set Instrument Serif at weight 700 or any bold weight. The serif's character lives at weight 400; bold serif display flattens the system.
- Don't introduce a second text color. Yellow text on paper, ember text anywhere, or muted-ink secondary text — none exist. Text is always full-opacity ink.
- Don't crowd the canvas with cards or panels. The system reads as elegant when sparse. Bordered cards, button stacks, or multi-region grids of containers break the editorial restraint.
- Don't invert: ink panels with yellow or paper text are not part of the system. Ink ground is reserved for chart bars and small rule elements only.
- Don't substitute Inter, Helvetica, or system-ui for Archivo, or Times for Instrument Serif. The font selection is the visual identity; substitution collapses the aesthetic.
- Don't use mono for body or headlines. JetBrains Mono is exclusively for numerical/metadata chrome.
- Don't omit the bloom layer on a surface. A flat parchment slide reads as a CMS template; the bloom is the atmosphere that signals "biennale".

## Responsive Behavior

This system is built as a **viewport-fluid 100vw × 100vh deck** with no responsive breakpoints. Every font size, padding value, and gap uses CSS `clamp()` with both vw and vh terms — `clamp(40px, min(4.4vw, 7vh), 88px)` is a typical pattern. Display type scales by whichever viewport axis is shorter, so portrait orientations don't blow out the headlines.

### Scaling Behavior
- Cover-scale display scales 120px → 240px.
- Chapter-divider jumbo numeral scales 220px → 720px.
- Headline scales 40px → 88px.
- Body scales 14px → 16px.
- Edge padding scales 40px → 76px.
- Hairline rule (1px) and pagenum sizing (11-13px) are essentially fixed.

### Presenter Behavior
- Slides advance via `ArrowRight`, `PageDown`, or `Space`.
- Slides reverse via `ArrowLeft` or `PageUp`.
- `Home` jumps to first slide, `End` to last.
- Horizontal touch swipe with a 40px threshold advances/reverses.
- Slide crossfades at 280ms ease via `opacity` toggle on the `.active` class. Only the active slide is `pointer-events: auto`.

### Print Behavior
The system has no `@media print` rule. The crossfade transition is screen-only. For static export, capturing each slide individually via screenshot preserves all atmospheric layers (the radial blooms are pure CSS gradients, not assets).

### Mobile Behavior
The `min(vw, vh)` pattern in display clamps means narrow portrait viewports automatically shrink display type to fit. The strand and ledger rows use fixed-px first columns (56px, 92px) that may feel tight on narrow widths — the system is designed for landscape presentation contexts and is functional but not optimized for sub-768px portrait usage.

## CJK & International Content

When using this template for Chinese (or other CJK) content, swap the Latin typeface stack for an equivalent Chinese pairing and apply universal CJK adjustments. All recommended Chinese fonts load via CDN — no install required.

### Recommended Chinese Pairing

| Role | Latin (default) | Chinese counterpart |
|---|---|---|
| Display / numerals / headlines / date rail | Instrument Serif 400 | 得意黑 Smiley Sans (oblique) — display moments; 思源宋体 Noto Serif SC 400 as fallback for long-form serif headlines |
| Body / lede / micro-label | Archivo 400–600 | 思源宋体 Noto Serif SC 400 for body; 思源黑体 Noto Sans SC 600 for micro-labels |
| Mono data / dates / page numbers | JetBrains Mono 400 | 思源黑体 Noto Sans SC 500 with tabular-feeling alignment — see Known CJK Gap below |

### Mixed-Content Strategy

**Strategy A** — single CJK family per role, with Latin glyphs handled by the same CJK family. Both 思源宋体 and 思源黑体 ship Latin glyphs that read cleanly alongside Chinese characters, so a mixed sentence renders in a consistent face. 得意黑 is used surgically — only on the biggest display moments where its slight oblique slant matches the Italian-poster register Instrument Serif provides in the Latin original. For everything else (body, micro-label, mono), Noto Serif SC / Noto Sans SC carries both scripts.

### Loading

Add to the template's `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cn-fontsource-smiley-sans-oblique/font.min.css">
```

After loading, reference 得意黑 as `font-family: 'Smiley Sans Oblique', 'Noto Serif SC', serif` on the display tokens that should carry the strongest poster register.

### Universal CJK Adjustments

- **Line-height**: increase by ~15–25% from the Latin spec. Body 1.75–1.85 (up from 1.5–1.55), display 1.05–1.15 (up from the very tight 0.84–0.96 used on Instrument Serif). The Latin display tokens here use line-height as low as 0.84 — at that compression, CJK characters collide vertically. Open display to a minimum of 1.0 for Chinese, and 1.15+ on multi-line headlines.
- **Letter-spacing**: set to 0 on every CJK run. The Latin display tokens use negative tracking from −0.005em down to −0.04em; on square CJK glyphs this overlaps strokes and reads as broken. Micro-labels at 0.16–0.32em wide tracking also drop to 0.
- **Text transform**: don't apply `uppercase` to Chinese text — CJK has no case. Every micro-label and rail-label in this system uses `text-transform: uppercase`; remove it for CJK runs.
- **Punctuation**: use full-width Chinese punctuation （，。：；！？「」（））. Replace the en-dash separator in date ranges with a Chinese 至 or full-width 「—」 hyphen.
- **No period on display headlines**: Chinese typography convention omits trailing 。 on display-scale headlines.
- **Space between CJK and Latin (盘古之白)**: insert an ASCII space between every Chinese character and adjacent Latin character or digit. Write `2024 春季双年展` not `2024春季双年展`.
- **One font per sentence**: 思源宋体 covers both CJK and Latin glyphs in a unified serif style — let it handle mixed editorial sentences. Don't let the browser font-switch to Archivo mid-paragraph.

### Aesthetic Notes for This System

The system's editorial identity rests on Instrument Serif's high-contrast, tall-ascender personality — a face that signals "art biennale catalogue" and "slow literary quarterly". The closest Chinese equivalent for register is **思源宋体 Noto Serif SC** for body and editorial display, with **得意黑 Smiley Sans Oblique** reserved for the poster-scale display moments where Instrument Serif at 120–240px does the heaviest identity work in the Latin original. 得意黑's slight italic tilt and slab character matches the Italian-exhibition-poster register; pure Noto Serif SC at jumbo numerals reads as restrained academic Chinese rather than biennale-loud.

The "single text color, single accent" discipline of this system transfers cleanly to CJK — ink-on-paper, sun-bloom atmosphere, hairline rules, no shadows. The micro-label treatment (Archivo weight 600, uppercase, 0.16–0.32em tracking) is the system's most fragile element when translated: CJK micro-labels lose both the uppercase signal and the wide tracking. Compensate by setting Chinese micro-labels in 思源黑体 weight 600 at 0 tracking with the **slightly heavier weight contrast** (drop body to weight 400 of 思源宋体, keep labels at 600 of 思源黑体) and by **always pairing the label with a hairline-soft rule beneath** — the rule does the chrome-recognition work the wide-tracked uppercase did in Latin.

### Known CJK Gap

- **No CDN-loadable Chinese monospace face for tabular data.** JetBrains Mono's role here (calendar ledger dates, chart year/value labels, page numbers) depends on monospaced figure rhythm that CJK doesn't provide. 思源黑体 at weight 500 with `font-feature-settings: "tnum"` gives tabular Latin digits but Chinese characters remain proportional. For ledger rows where alignment is structural, keep the date and value columns in Latin digits (Arabic numerals + Latin date abbreviations) and use 思源黑体 only for the title/venue cells.
- **Instrument Serif italic has no direct Chinese counterpart.** The italic display token (manifesto-scale quote body) loses its slow-reading personality entirely in CJK. Use 思源宋体 400 with looser line-height (1.4) and slightly larger size to compensate; consider 「」 quotation framing to signal "this is a quoted passage".
- **得意黑 may not load on restricted networks.** The cn-fontsource CDN is reliable in mainland China but less proven internationally. Always include `'Noto Serif SC', serif` in the stack as fallback so display headlines remain editorial even when 得意黑 fails.

## Iteration Guide

1. Any new surface starts on `{colors.paper}`, places at least one `{components.sun-bloom}` for atmosphere, and pins the persistent `{components.pagenum}` to bottom-right.
2. Any new headline uses Instrument Serif weight 400 with tight line-height and negative tracking. Reach for `{typography.headline}` for primary moments and `{typography.display}` only for cover-scale.
3. Any new body paragraph uses Archivo weight 400 with line-height 1.5. Lede paragraphs following a headline use the slightly larger `{typography.body-lede}` for breathing room.
4. Any new eyebrow or section tag uses the micro-label treatment: Archivo weight 600, uppercase, 0.16-0.32em tracking, ink color, no fill. Don't substitute a pill or chip.
5. Any new structural separator is a 1px `{components.hairline-rule}` in ink, or its soft variant for secondary list rows. Never reach for a thicker border.
6. Any new numerical or metadata content (date, page number, chart value, ledger figure) uses JetBrains Mono. Serif numerals are reserved for display moments only.
7. Any new "poster-scale" color statement uses `{components.yellow-panel}` — a flooded column or fraction of the canvas in `{colors.sun}` with ink text on top.
8. Any new ordered list of program items uses the `{components.strand-row}` pattern: serif numeral cell + serif title + sans body, separated by hairline-soft rule.
9. Any new tabular itinerary uses the `{components.ledger-row}` pattern: mono date + serif title + sans venue + mono duration right-aligned, separated by hairline-soft rule.
10. If a surface feels flat, add an `{components.ember-bloom}` in the opposite corner from the sun-bloom — never add a card border or shadow.

## Known Gaps

- **Instrument Serif, Archivo, and JetBrains Mono are loaded from Google Fonts** via a preconnect + `<link>`. Fallbacks (`Georgia`, `Helvetica Neue`, `ui-monospace`) are defined but render very differently — in environments where Google Fonts fail, the system collapses to generic editorial defaults and loses its identity.
- **The Instrument Serif italic axis is loaded** but used only for the manifesto-scale quote treatment. Other italic moments (an `<em>` inside a body paragraph, for instance) will not stylistically signal the same as the dedicated italic display.
- **The system has no chart engine** — the data slide uses inline `style="width: XX%"` on bar divs. Building dynamic charts requires computing widths in JS or templating the markup server-side.
- **The block-tile underprint uses hardcoded grid positions** (`grid-column: 1 / 3; grid-row: 6 / 9;`) per tile. Tiles are decorative and the placements are tuned per surface; there is no parametric tile placement system.
- **The vertical rail-label uses a rotated transform** that can produce subtle subpixel rendering artifacts on some browsers. The label is decorative; if rendering looks off, it can safely be dropped.
- **The slide navigation has no slide indicator beyond the pagenum.** There are no dot-rails, no progress bar, no thumbnail bar. The pagenum text is the only positional cue.
- **The crossfade transition is screen-only** and doesn't degrade to a sensible print/static state. Capturing slides for PDF export requires manual screenshot per surface.
- **The cover and colophon footer-band columns use fractional widths** (`1.1fr 1fr 1.4fr 2fr` and `1.2fr 1.1fr 1fr 1.4fr`). These ratios are tuned to the demo content and may need adjusting if footer cells carry significantly different text length.
- **The system loads Google Fonts with `ital` axis for Instrument Serif** but only `wght` axes for Archivo and JetBrains Mono. Adding italic body or italic mono moments requires updating the font-loading request.
