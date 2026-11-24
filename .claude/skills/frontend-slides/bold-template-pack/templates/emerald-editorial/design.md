---
version: alpha
name: Emerald Editorial
description: "A bold display-serif editorial system in the register of a fashion masthead or vintage magazine cover. Bodoni Moda runs at weight 900 across a wide scale (44–460px), set against a saturated emerald-green canvas with deep navy ink and oat-paper accents. The signature treatment is a stacked double-rule ornament that brackets centered display words like a 19th-century theatrical playbill. The aesthetic borrows from Harper's Bazaar / Vogue / Wallpaper covers: confident, theatrical, paper-and-ink committed, with a tight three-color palette and zero gradients or shadows."

colors:
  bg: "#3CD896"
  bg-2: "#2DC684"
  bg-3: "#25B377"
  ink: "#0F1A5C"
  ink-2: "#1B2774"
  ink-3: "#3A4593"
  paper: "#F1E9D6"
  rule: "rgba(15, 26, 92, 0.22)"
  rule-strong: "rgba(15, 26, 92, 0.85)"

typography:
  numeral-jumbo:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 460
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.04em
  display-section:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 200
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.015em
  display-cover:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 184
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.01em
  display:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 130
    fontWeight: 900
    lineHeight: 0.96
    letterSpacing: -0.015em
  display-md:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 128
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.015em
  display-sm:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 120
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.015em
  headline-xl:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 104
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.015em
  headline:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 92
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.02em
  ornament-word-lg:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 84
    fontWeight: 800
    lineHeight: 1
  ornament-word:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 76
    fontWeight: 800
    lineHeight: 1
  ornament-word-sm:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 68
    fontWeight: 800
    lineHeight: 1
  title-card-lg:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 64
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.005em
  title-card:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 48
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.005em
  title-card-sm:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 44
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.005em
  step-numeral:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 80
    fontWeight: 900
    lineHeight: 1
  step-title:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 40
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.005em
  kpi-figure:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 144
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.03em
  kpi-figure-unit:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 60
    fontWeight: 800
  stat-figure:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 92
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.02em
  stat-figure-unit:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: 48
    fontWeight: 900
  eyebrow:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 28
    fontWeight: 800
    letterSpacing: 0.18em
    textTransform: uppercase
  label:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 26
    fontWeight: 700
    letterSpacing: 0.08em
    textTransform: uppercase
  label-tight:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 26
    fontWeight: 700
    letterSpacing: 0.05em
    textTransform: uppercase
  tag:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 24
    fontWeight: 800
    letterSpacing: 0.12em
    textTransform: uppercase
  caption:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 24
    fontWeight: 700
    letterSpacing: 0.1em
    textTransform: uppercase
  body-lg:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 28
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 26
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 24
    fontWeight: 500
    lineHeight: 1.45
  credit:
    fontFamily: "'Manrope', sans-serif"
    fontSize: 28
    fontWeight: 700
    letterSpacing: 0.18em
    textTransform: uppercase

spacing:
  pad-default: "110px 110px 70px"
  pad-cover: "56px 110px"
  pad-closing: "80px 110px"
  pad-statement: "110px 110px 70px"
  masthead-inset: "56px 80px"
  rule-thick: "4px"
  rule-thicker: "5px"
  rule-thin: "2px"

canvas:
  width: 1920px
  height: 1080px

components:
  ornament-double-rule:
    description: "The system's signature treatment. A centered serif word framed by two stacked 4px horizontal rules on each side. The rules sit 3px apart on top and 3px apart on bottom, giving a 19th-century playbill / theatrical-poster bracket effect. Configurable via :root[data-ornament] to switch between double (default), single, or none."
    ruleHeight: "4px"
    ruleGap: "3px"
    wordWeight: 800
    wordFamily: "'Bodoni Moda', serif"
  ornament-vertical:
    description: "An inline horizontal pair of stacked rules (each 4px tall, 8px apart) on either side of a small serif word. Used as a side bracket around connector words like prepositions."
    ruleHeight: "4px"
    ruleGap: "8px"
    barWidth: "64px"
  masthead:
    position: "absolute"
    placement: "top: 56px, full-width between 80px side padding"
    layout: "flex space-between"
    typography: "{typography.label-tight}"
    color: "{colors.ink}"
  footline:
    position: "absolute"
    placement: "bottom: 56px, full-width between 80px side padding"
    layout: "flex space-between"
    typography: "{typography.label-tight}"
    color: "{colors.ink}"
  rule-h-thick:
    height: "4px"
    background: "{colors.ink}"
    description: "Universal 4px horizontal rule used as section separator and tile/row border. The system's standard rule weight."
  agenda-row:
    description: "A three-column grid row (130px / 1fr / 320px) with 4px ink top borders. Holds a serif ordinal, serif name, and sans-serif kind label. The last row in a list also carries a 4px bottom border, sealing the list."
    rowPad: "26px 0"
    topBorder: "4px solid {colors.ink}"
  inverse-tile:
    description: "A solid {colors.ink} rectangle holding {colors.bg} text. Used for chart-card containers, kpi tiles, process steps, section-opener panels. Carries no corner radius and no shadow."
    background: "{colors.ink}"
    color: "{colors.bg}"
    padding: "32px to 36px"
  paper-tile:
    description: "A solid {colors.paper} rectangle holding {colors.ink} text. The alt variant of inverse-tile — used in rotation across a row of process steps or kpi tiles to break the monotony of ink fills."
    background: "{colors.paper}"
    color: "{colors.ink}"
  mark-pill:
    background: "{colors.ink}"
    color: "{colors.bg}"
    padding: "10px 22px"
    fontWeight: 700
    letterSpacing: 0.1em
    fontSize: 24
    textTransform: uppercase
    description: "A small ink-on-bg pill used as a category mark or section tag. No border-radius — strict rectangle."
  tag-pill:
    background: "{colors.ink}"
    color: "{colors.bg}"
    padding: "8px 20px"
    fontWeight: 700
    letterSpacing: 0.12em
    fontSize: 24
    textTransform: uppercase
  delta-pill:
    background: "{colors.bg}"
    color: "{colors.ink}"
    padding: "6px 16px"
    fontWeight: 800
    letterSpacing: 0.08em
    fontSize: 24
    textTransform: uppercase
    description: "A small bg-on-ink delta indicator placed inside an inverse kpi tile to show change direction. Inverted to ink-on-bg when inside a paper-tile."
  bar:
    description: "A vertical rectangular chart bar in bg (primary), paper (alt). Value label printed above bar in Bodoni 30px. No corner radius."
    background: "{colors.bg} or {colors.paper}"
  chart-card:
    background: "{colors.ink}"
    color: "{colors.bg}"
    padding: "36px 50px 30px"
    gridLineColor: "rgba(60, 216, 150, 0.22)"
    description: "An ink container framing a bar chart on bg. Y-axis labels are Bodoni 26px on the left; x-axis labels are Manrope 24px. Grid lines are 2px at 22% bg-on-ink."
  ornament-numeral-panel:
    description: "A full-bleed inverse panel (ink background) holding a single oversized Bodoni numeral (~460px weight 900) centered. Used as a section-opener device. Topbar / footline strings sit absolutely positioned in the panel corners."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Emerald Editorial is a **bold display-serif editorial system** rooted in the visual language of fashion magazines and 19th-century theatrical playbills. The foundational premise is a single typographic face — **Bodoni Moda at weight 900** — used at unapologetic scale: 92px for routine headlines, 130–200px for statements and section openers, and 460px for hero numerals. The serif is loud, theatrical, and confident. Every slide leads with type, not with image.

The palette is a tight three-color editorial set: a **saturated emerald green** (`{colors.bg}` — #3CD896) as the dominant surface, a **deep navy ink** (`{colors.ink}` — #0F1A5C) as both the primary text color and the inverse-panel surface, and an **oat paper** (`{colors.paper}` — #F1E9D6) as the secondary surface for alternate tiles. The navy / emerald contrast is the system's chromatic identity; every body of text is navy-on-emerald or emerald-on-navy. Two near-duplicates of the emerald (`{colors.bg-2}`, `{colors.bg-3}`) and two of the navy (`{colors.ink-2}`, `{colors.ink-3}`) exist in the token system but are reserved — the published slides commit almost entirely to the three primaries.

The supporting typeface is **Manrope**, a humanist geometric sans, run at weight 500 for body paragraphs and weight 700–800 in uppercase with wide letter-spacing for every label, tag, eyebrow, caption, and footline. Manrope never crosses into display territory — it stops at 28px and stays in the chrome layer.

The signature treatment is the **double-rule ornament** — a centered serif word framed by two stacked 4px horizontal rules on each side, with 3px between the rules. This treatment appears as the cover's centerpiece and as a recurring statement bracket. It reads as a 19th-century playbill or vintage program — a "The [word] of [word]" framing device. The double-rule ornament is configurable to a single-rule or no-rule variant via a `:root[data-ornament]` attribute, but the double variant is the system's identity.

Depth is **flat and ink-based**. There are no drop shadows, no gradients, no blur, no glow. Every surface is solid emerald, solid navy, or solid paper. Elevation happens through color-block inversion (a navy tile on the emerald canvas is the "elevated" element) and 4px ink rules separating sections. The whole system reads as printed ink on paper, not as a digital interface.

**Density philosophy: medium-full and centered.** Most slides carry one display headline at scale (92–200px) plus 3–4 supporting elements (a stat row, a kpi grid, a process flow, a chart card). The slide padding of 110px gives breathing room, and the masthead/footline chrome at top and bottom anchors the page. A slide that crams six small elements reads as broken; a slide with one giant headline plus three supporting tiles reads as authoritative. Reach for fewer, larger elements. The exception: the agenda-list pattern (a vertical list of large-numbered rows separated by 4px ink rules) is naturally dense and fills the canvas vertically — and it should, when used.

**Key Characteristics:**
- Bodoni Moda at weight 900 for every display moment; Manrope at weight 500/700/800 for every body and label moment.
- Saturated emerald canvas (`{colors.bg}`) with deep navy ink (`{colors.ink}`) text and inverse panels.
- Double-rule ornament with centered serif word is the signature decorative device.
- 4px ink horizontal rules separate every stacked section, every list row, every chart border. The 4px weight is the system's default rule.
- No corner radius anywhere. Every shape is a strict rectangle, except for the round logo/typographic glyphs themselves.
- No shadows, no gradients, no blur. Depth is color-block inversion + 4px rules.
- Display type scales aggressively — 184–460px for hero / section-opener / closing moments.
- Manrope chrome (labels, tags, captions) is always uppercase with 0.05em–0.18em letter-spacing.

## Colors

### Palette
- **BG / Emerald** (`{colors.bg}` — #3CD896): The dominant slide canvas. A saturated, slightly cool emerald — saturated enough to feel like printed ink, not like a CSS preset. The default slide background.
- **BG-2** (`{colors.bg-2}` — #2DC684): A slightly darker emerald reserved for tonal variation; available in the token system but used sparingly. Reach for it only when two emerald surfaces sit adjacent and need separation.
- **BG-3** (`{colors.bg-3}` — #25B377): The darkest emerald variant; similarly reserved.
- **Ink / Navy** (`{colors.ink}` — #0F1A5C): The deep navy primary. The text color on emerald and paper surfaces; the inverse-panel background color; the rule color; the border color. The system's structural color.
- **Ink-2** (`{colors.ink-2}` — #1B2774): A slightly lighter navy variant — available for tonal contrast inside ink-on-ink situations, but rarely used.
- **Ink-3** (`{colors.ink-3}` — #3A4593): The lightest navy variant; reserved.
- **Paper** (`{colors.paper}` — #F1E9D6): The oat-cream secondary surface. Used as the alt-tile fill in process / kpi rows, as the alt bar-chart series, and anywhere a third "warm" surface is needed to break a row of all-navy inverse tiles. Carries `{colors.ink}` text.
- **Rule** (`{colors.rule}` — `rgba(15, 26, 92, 0.22)`): A semi-transparent navy used only for subtle internal grid lines (e.g., chart grid lines on a dark ground). Not a structural rule color.
- **Rule Strong** (`{colors.rule-strong}` — `rgba(15, 26, 92, 0.85)`): An 85%-opacity navy, available as a near-solid rule alternative.

### Defaults
- **Default slide background**: `{colors.bg}` (emerald). Reach for `{colors.ink}` (navy) as a full slide surface when the moment wants gravity (section opener, closing).
- **Default headline color on emerald**: `{colors.ink}`.
- **Default headline color on navy**: `{colors.bg}` — emerald-on-navy is the only color flip the system uses for display type.
- **Default body color on emerald**: `{colors.ink}`.
- **Default body color on navy**: `{colors.bg}`.
- **Default body color on paper**: `{colors.ink}`.
- **Default label / eyebrow / tag color**: `{colors.ink}` on emerald and paper surfaces, `{colors.bg}` on navy surfaces.
- **Default rule color**: `{colors.ink}` at 4px solid. Always.
- **Default inverse tile fill**: `{colors.ink}` with `{colors.bg}` text. The alt tile in a row uses `{colors.paper}` with `{colors.ink}` text.
- **Default delta / pill fill** inside an ink tile: `{colors.bg}` background with `{colors.ink}` text. Inside a paper tile, invert to `{colors.ink}` background with `{colors.bg}` text.

The palette is intentionally tight. Introducing a fourth chromatic family (red, yellow, orange, lavender) shatters the editorial commitment. Stay inside emerald / navy / paper. The bg-2/3 and ink-2/3 variants exist for tonal nuance but should rarely be needed.

## Typography

### Font Family
The system loads several display serif families from Google Fonts (Bodoni Moda, Playfair Display, DM Serif Display, Rozha One, Yeseva One) plus Manrope as the supporting sans. **In practice, only Bodoni Moda is used for display** — the other serif families are loaded but dormant, reserved as future variants. Bodoni Moda is the canonical display face; the others are not part of the system's voice.

Bodoni Moda is run almost exclusively at **weight 900** — the heaviest cut. Weight 800 appears for small ornament words and tile titles (slightly less heavy so they don't compete with the primary headline). Weight 700 appears once or twice for the smallest ornament prepositions. There is no weight-500 Bodoni in the published system. The 900-weight commitment is what gives the system its theatrical-playbill voice.

Manrope handles everything else: body paragraphs at weight 500, labels / eyebrows / tags / captions at weight 700 or 800 in uppercase with 0.05em–0.18em letter-spacing. Manrope never appears at display scale; Bodoni never appears at chrome scale.

### Display, Body, and Chrome Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.numeral-jumbo}` | 460px | Bodoni Moda | 900 | Hero numeral on an inverse section-opener panel |
| `{typography.display-section}` | 200px | Bodoni Moda | 900 | Agenda / section-title hero |
| `{typography.display-cover}` | 184px | Bodoni Moda | 900 | Cover masthead title |
| `{typography.display}` | 130px | Bodoni Moda | 900 | Statement / pull-quote scale |
| `{typography.display-md}` | 128px | Bodoni Moda | 900 | KPI-row introductory headline |
| `{typography.display-sm}` | 120px | Bodoni Moda | 900 | Process-flow introductory headline |
| `{typography.headline-xl}` | 104px | Bodoni Moda | 900 | Chart / data introductory headline |
| `{typography.headline}` | 92px | Bodoni Moda | 900 | Routine slide headline |
| `{typography.ornament-word-lg}` | 84px | Bodoni Moda | 800 | Large ornament-bracketed word (statement variant) |
| `{typography.ornament-word}` | 76px | Bodoni Moda | 800 | Standard ornament-bracketed word (cover variant) |
| `{typography.ornament-word-sm}` | 68px | Bodoni Moda | 800 | Cover preposition between the double-rule brackets |
| `{typography.kpi-figure}` | 144px | Bodoni Moda | 900 | KPI-tile numeral |
| `{typography.kpi-figure-unit}` | 60px | Bodoni Moda | 800 | Unit suffix on a KPI numeral |
| `{typography.stat-figure}` | 92px | Bodoni Moda | 900 | Secondary stat numeral (in a side panel) |
| `{typography.stat-figure-unit}` | 48px | Bodoni Moda | 900 | Unit suffix on a secondary stat |
| `{typography.title-card-lg}` | 64px | Bodoni Moda | 800 | Title inside a large card / agenda-row name |
| `{typography.title-card}` | 48px | Bodoni Moda | 800 | Chart-card take-away title |
| `{typography.title-card-sm}` | 44px | Bodoni Moda | 800 | Statement-supporting cell title |
| `{typography.step-numeral}` | 80px | Bodoni Moda | 900 | Process-step ordinal |
| `{typography.step-title}` | 40px | Bodoni Moda | 800 | Process-step title (sits below a top rule) |
| `{typography.body-lg}` | 28px | Manrope | 500 | Lede / subtitle paragraph |
| `{typography.body}` | 26px | Manrope | 500 | Standard body paragraph |
| `{typography.body-sm}` | 24px | Manrope | 500 | Compact body in a tile / chart side panel |
| `{typography.eyebrow}` | 28px | Manrope | 800 / 0.18em | Section eyebrow above a headline |
| `{typography.label}` | 26px | Manrope | 700 / 0.08em | Masthead / footline label |
| `{typography.label-tight}` | 26px | Manrope | 700 / 0.05em | Cover top/bottom strings |
| `{typography.tag}` | 24px | Manrope | 800 / 0.12em | Inverse pill / tag (mark, delta, side-tag) |
| `{typography.caption}` | 24px | Manrope | 700 / 0.1em | Agenda-row kind label, chart x-axis, kpi label |
| `{typography.credit}` | 28px | Manrope | 700 / 0.18em | Author / org credit row |

### Defaults
- **Default size for a routine slide headline**: `{typography.headline}` (92px).
- **Default size for a hero / cover-scale moment**: `{typography.display-cover}` (184px) or `{typography.display-section}` (200px).
- **Default size for a body paragraph**: `{typography.body}` (26px) in Manrope weight 500.
- **Default size for a body paragraph inside a tile**: `{typography.body-sm}` (24px).
- **Default size for an eyebrow above a headline**: `{typography.eyebrow}` (28px) in Manrope 800 uppercase 0.18em.
- **Default size for a tag / pill / chip**: `{typography.tag}` (24px) in Manrope 800 uppercase 0.12em.
- **Default size for a KPI figure**: `{typography.kpi-figure}` (144px) with an optional 60px unit.
- **Default weight for any Bodoni display moment**: 900. The 800 variant is reserved for ornament words and tile titles, never for primary headlines.
- **Default weight for any Manrope body line**: 500.

When unsure, reach for `{typography.headline}` (92px) for the slide's primary headline. The 120–200px tier is reserved for section openers, statements, and KPI-row headlines — using it for routine headlines flattens the hierarchy.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every primary Bodoni headline runs at weight 900 with negative letter-spacing (-0.01em to -0.03em) and tight line-height (0.9–0.95).** A weight-700 or weight-800 Bodoni headline reads as a sub-headline, not a primary moment.
- **Every Manrope label, eyebrow, tag, caption, footline, and credit element is UPPERCASE with letter-spacing of at least 0.05em.** Manrope in sentence case or with default tracking reads as web app body, not editorial chrome.
- **The double-rule ornament, when used, is bilateral — rules on both sides of the centered word.** A one-sided ornament breaks the bracket symmetry. The ornament can be downgraded to a single-rule or no-rule variant via `:root[data-ornament]`, but the default and recommended form is double.
- **Every section separator and tile divider is a 4px solid `{colors.ink}` rule.** Never 1px, never 2px, never colored beyond ink. The 4px weight is the system's structural rhythm.
- **Inverse tiles always carry `{colors.ink}` background with `{colors.bg}` text.** The alt paper tile carries `{colors.paper}` background with `{colors.ink}` text. Color combinations outside these pairings break the system's printed-ink discipline.
- **Bodoni numerals at jumbo scale (200px+) live on inverse navy panels.** Putting a 460px numeral on the emerald canvas is technically possible but visually breaks the panel-anchored playbill voice; the jumbo numerals belong inside ink panels.

### Typography Principles
The weight 900 + negative tracking + tight leading combination is the system's display voice. Switching any of those three properties (e.g., weight 700, or default tracking, or 1.2 leading) reads as a different design system. The serif/sans role split is strict: Bodoni never appears at body / label scale, Manrope never appears at display scale.

Italics are loaded in the Bodoni font request but not used in the published system — keep them out unless intentionally introducing a new pattern. Underline is not used. Emphasis is communicated through size, color inversion, and ornamentation.

## Layout

### Canvas System
The system targets a fixed **1920×1080** canvas. Slides are `<section class="slide">` elements at exact width/height. Rendering relies on `deck-stage.js` to scale the canvas to fit the viewport. The canvas is paper-stock, not a viewport — designed for projector, printer, or PDF export at 16:9.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-default}` | 110px 110px 70px | Standard content slide (asymmetric — slightly less bottom for footline) |
| `{spacing.pad-cover}` | 56px 110px | Cover slide (less top padding to give masthead room) |
| `{spacing.pad-closing}` | 80px 110px | Closing slide |
| `{spacing.masthead-inset}` | 56px top, 80px sides | Absolute masthead / footline inset on cover and closing |

### Chrome Anatomy
The cover and closing carry a **masthead** at top (a Manrope flex row with two label strings on opposite sides) and a **footline** at bottom (a matching row). Content slides typically skip the masthead and footline, leaning on the 110px-top padding to give the headline space. When the masthead is used, it lives at `top: 56px, left/right: 80px`.

### Card and Tile Treatment
The system has **no border-radius anywhere**. Cards, tiles, kpi panels, ornament rules, mark pills, tag pills — all strict rectangles. The only round shapes are the natural curves of the Bodoni glyphs themselves. The visual rhythm comes entirely from rectangle composition and 4px ink rules.

### Rule Weights
| Weight | Use |
|---|---|
| 2px | Chart grid lines (subtle, semi-transparent) |
| 4px | Universal structural rule — section separators, list-row borders, tile top rules |
| 5px | Cover ornament rules (slightly heavier so they hold weight next to the 184px display headline) |
| 18px height (with 4px rule top + 4px rule bottom) | Double-rule ornament span |

The 4px weight is the system's default; reach for it unless the moment specifically needs the cover's heavier 5px rules.

## Depth and Elevation

### Flat, No Shadows
The system uses **zero shadows**. No box-shadow, no text-shadow, no filter blur, no gradient. Elevation is communicated entirely through:

1. **Color-block inversion** — a navy tile on the emerald canvas is the system's "elevated" element. Inversion is the depth language.
2. **4px ink rules** — sections are separated by 4px solid navy lines that read as paper-fold creases between regions.
3. **Solid panels with no border-radius** — the strict-rectangle treatment combined with full inverse fill gives tiles the weight of printed ink blocks.

There is no soft-glow, no glass, no neumorphism. Adding box-shadow shatters the printed-ink discipline.

### Section-Opener Panel
A signature elevation device: a slide can be split into a full-bleed two-column grid where the left side is a solid `{colors.ink}` panel holding a jumbo Bodoni numeral (`{typography.numeral-jumbo}` at 460px) and the right side is the standard emerald canvas with headline + lede + category marks. The panel reads as a magazine title-page opening — heavy, anchored, ceremonial. Treat this as an opener pattern, not a routine slide layout.

## Shapes and Treatment

### Border Radius
**Zero.** Every shape is a strict rectangle. Pills, tags, tiles, panels, bars, mastheads, footlines, ornament words — all square corners.

### Border / Rule Style
- **4px solid `{colors.ink}`** — universal structural rule. Section separators, list-row borders, tile internal rules.
- **5px solid `{colors.ink}`** — the cover ornament's slightly heavier rule.
- **4px solid `currentColor`** — used inside tiles where the rule should match the tile's text color (e.g., a paper tile's internal rule is `{colors.ink}`; an ink tile's internal rule is `{colors.bg}`).

Rules are never dashed, never dotted, never colored beyond the ink / currentColor pattern.

### Decorative Element Types

**Double-Rule Ornament** (`{components.ornament-double-rule}`) — The system's signature. A centered serif word framed by two stacked 4px horizontal rules on each side (3px between them). Used on the cover ("The [word] of [word]" framing), on statement slides (around a small connector word), and anywhere a typographic moment needs theatrical bracketing. Configurable to single-rule or no-rule via `:root[data-ornament]`.

**Vertical Side-Bracket** (`{components.ornament-vertical}`) — A smaller inline variant: a pair of stacked 4px rules on the left and a matching pair on the right of a small serif preposition. Used inline within a sentence rather than as a centered span.

**Masthead / Footline** (`{components.masthead}`, `{components.footline}`) — Absolutely positioned flex rows at top/bottom of cover and closing slides. Two Manrope uppercase strings on opposite sides (e.g., publication name + date; section + page number). Establishes the magazine-page identity.

**Inverse Tile** (`{components.inverse-tile}`) — A solid `{colors.ink}` rectangle holding `{colors.bg}` text. Used as a chart-card container, a kpi tile, a process step, a side panel. No border-radius, no shadow.

**Paper Tile** (`{components.paper-tile}`) — The alt variant: solid `{colors.paper}` with `{colors.ink}` text. Used in rotation across a row of inverse tiles to break monotony (e.g., a four-step process flow alternates ink → paper → ink → paper).

**Mark Pill** (`{components.mark-pill}`) — A small ink-on-bg pill used as a category mark or section tag in the bottom margin of a section opener. Strict rectangle.

**Tag Pill** (`{components.tag-pill}`) — Slightly smaller pill variant used inside chart sides and kpi tiles to mark a takeaway or stat type.

**Delta Pill** (`{components.delta-pill}`) — A bg-on-ink (or inverted ink-on-bg when inside a paper tile) chip showing a directional change indicator (e.g., "↑ 12% YoY"). Lives at the corner of a kpi tile.

**Agenda Row** (`{components.agenda-row}`) — A three-column grid row separated above and below by 4px ink rules. Holds a serif ordinal in the left column, a serif name in the middle, and a Manrope kind label in the right. Stacked agenda rows form the system's table-of-contents pattern.

**Chart Card** (`{components.chart-card}`) — A navy inverse panel holding a bar chart on emerald + paper bars. Y-axis labels in Bodoni; x-axis labels in Manrope. Grid lines are 2px at 22% opacity emerald-on-navy. The panel reads as a magazine data-spread.

**Ornament Numeral Panel** (`{components.ornament-numeral-panel}`) — A full-bleed inverse half-slide holding a single Bodoni numeral at 460px. Topbar / footline strings sit in the corners. Used as a section-opener device only.

## Do's and Don'ts

### Do
- Run every Bodoni display headline at weight 900 with negative letter-spacing (-0.01em to -0.03em) and tight line-height (0.9–0.95). The combination is the system's voice.
- Run every Manrope label / eyebrow / tag / caption / footline in uppercase with at least 0.05em letter-spacing. Manrope in sentence case loses the editorial register.
- Default slide background to `{colors.bg}` (emerald). Reach for `{colors.ink}` as a full slide surface only for section openers and closing moments.
- Use 4px solid `{colors.ink}` rules for every section separator, list border, tile divider. The 4px weight is the system's structural rhythm.
- Reach for the double-rule ornament when a typographic moment needs theatrical framing — especially around small connector words ("of", "in", "for") between two display headlines.
- Use inverse tiles (`{colors.ink}` bg with `{colors.bg}` text) as the default elevated element. Rotate in paper tiles to break a row of all-inverse fills.
- Scale display type aggressively — 130–460px for hero, section-opener, and statement moments. The system rewards scale.
- Pair ink-on-bg with bg-on-ink for color flips. Do not introduce a third color flip (paper-on-ink, ink-on-paper) without a clear semantic reason.
- Keep every shape a strict rectangle. The no-radius commitment is the system's signature alongside the double-rule ornament.

### Don't
- Don't add box-shadow, text-shadow, gradient, or blur to any element. The system is flat printed-ink only.
- Don't introduce a third typeface beyond Bodoni Moda and Manrope. The other serif families in the Google Fonts request (Playfair, DM Serif, Rozha, Yeseva) are loaded but not part of the published voice — adding them shatters the Bodoni commitment.
- Don't run Bodoni at weight 500 or lighter. The system commits to 900 (default), 800 (ornament words, tile titles), and 700 (small prepositions only).
- Don't render Manrope in sentence case or without letter-spacing. Manrope is always uppercase chrome.
- Don't introduce a fourth chromatic family. The emerald / navy / paper triad is the entire palette.
- Don't use border-radius on any element. Zero radius is the system's signature.
- Don't use 1px or 2px structural rules. The 4px weight is the structural default; 2px is reserved for subtle chart grid lines.
- Don't place a 460px numeral on the emerald canvas without an ink panel anchor. Jumbo numerals live on inverse navy panels.
- Don't crowd a slide with six small elements. One display headline + 3–4 supporting tiles is the rhythm; more elements need a smaller scale and break the editorial register.
- Don't omit the masthead / footline on cover and closing slides. The chrome is what makes them read as magazine title pages.

## Responsive Behavior

This is a **fixed 1920×1080 presentation system** rendered through `deck-stage.js`. The canvas is not responsive in the CSS sense — there are no media queries, no breakpoints, no fluid sizing. Every measurement is in fixed pixels at 1920×1080.

### Scaling Behavior
`deck-stage.js` wraps each `<section class="slide">` and scales the 1920×1080 canvas uniformly to fit the browser viewport, letterboxing as needed. Type, padding, gaps, and rule weights are all fixed pixels and scale proportionally with the canvas.

### Presenter Behavior
Navigation is delegated to `deck-stage.js`. Each `<section class="slide">` is one frame; the runtime handles transitions.

### Print / Export
Fixed-pixel measurements inside a 1920×1080 canvas export cleanly to PDF at 16:9. Bodoni Moda renders well at print resolution because the heavy display weight carries the page even at large physical sizes.

### Ornament Variant Switch
The `:root[data-ornament]` attribute controls a global ornament style: `"double"` (default, two stacked rules), `"single"` (one rule centered), or `"none"` (no rule, word floats alone). This is a presentation-level decision per deck, not per slide.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Chinese Face | Weight | Why |
|---|---|---|---|
| Display headline (92–460px) | 霞鹜文楷 LXGW WenKai (with Noto Serif SC fallback at 900) | 400 / 900 | LXGW WenKai's hand-lettered warmth is the closest Chinese analog to Bodoni Moda's theatrical-playbill voice; Noto Serif SC at weight 900 carries the structural mass at jumbo sizes |
| Stat / KPI figure (144px+) | 思源宋体 Noto Serif SC | 900 | Mincho weight 900 provides the printed-ink mass Bodoni Moda achieves at 900 |
| Body paragraph (24–28px) | 思源宋体 Noto Serif SC | 400 | Mincho body voice for warm magazine-spread reading |
| Eyebrow / label / tag (24–28px) | 思源黑体 Noto Sans SC | 700–800 | Replaces Manrope for chrome-layer Chinese; geometric humanist quality |
| Tile mark / pill / caption | 思源黑体 Noto Sans SC | 700 | Maintains the uppercase-tracked chrome feel for inverse pills and tags |

### Mixed-Content Strategy

Use **Strategy C** — keep Bodoni Moda as the Latin display face and let CJK glyphs fall through to LXGW WenKai (display) or Noto Serif SC (body). The Bodoni Moda commitment at weight 900 is the entire brand identity of Emerald Editorial; replacing it with a CJK family would break the fashion-magazine / 19th-century playbill register that defines the deck. Stack:

```css
/* Bodoni Moda roles (every display moment) */
font-family: 'Bodoni Moda', 'LXGW WenKai TC', 'Noto Serif SC', Georgia, serif;
/* Manrope roles (every chrome / body moment) */
font-family: 'Manrope', 'Noto Sans SC', system-ui, sans-serif;
```

The per-glyph fallback strategy lets Latin words render in Bodoni 900 (with the theatrical compression that gives the system its voice) and Chinese characters render in LXGW WenKai or Noto Serif SC. Baseline mismatch at jumbo sizes (200–460px) is the biggest watchpoint — Bodoni Moda at -0.03em tracking sits visually denser than LXGW WenKai, so a mixed-script numeral panel like `第 3 期` may show wobble. For section-opener panels with jumbo numerals, prefer all-numeric (Bodoni) or all-Chinese (LXGW WenKai) lines.

### Loading

Add to the existing Google Fonts `<link>` (or as a second link tag):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@500;700;800&display=swap" rel="stylesheet">
```

LXGW WenKai TC is the version on Google Fonts (ships both traditional and simplified glyphs).

### Universal CJK Adjustments

These adjustments apply to **every CJK block** in this system, regardless of size or role:

- **Loosen line-height by 0.05–0.08.** CJK glyphs are full-width squares with more visual weight than Latin letterforms; line-heights tuned for Latin (0.9–0.95 on display, 1.45–1.5 on body) read as cramped in Chinese. Bump display to 1.0–1.1 and body to 1.55–1.65.
- **Remove negative letter-spacing on CJK headlines.** Bodoni Moda display uses -0.01em to -0.03em tracking, which collides Chinese glyphs into each other. For CJK runs, set `letter-spacing: 0` — or a tiny positive `0.02em` if the headline feels visually packed.
- **Never `text-transform: uppercase` on CJK text.** Chinese has no case; the CSS property does nothing on Han glyphs but will silently break any mixed-script line where the Manrope portion was meant to be capitalized. (This matters here — every Manrope label, eyebrow, tag, caption uses `text-transform: uppercase`.)
- **Use Chinese full-width punctuation** (`，。：；！？「」『』（）`) inside Chinese sentences, not the Latin equivalents (`,.:;!?""''()`). Mixing punctuation systems within one sentence reads as a typesetting error.
- **No period (。) at the end of CJK headlines.** Chinese headlines follow the same rule as Latin — title-style lines drop terminal punctuation. Body paragraphs keep their 。
- **Apply Pangu spacing (盘古之白) at the boundary between CJK and Latin runs.** A space (or 0.25em margin) belongs between a Chinese character and an adjacent Latin word or digit, e.g. `2026 年 5 月` not `2026年5月`. Either type the spaces manually or use a `pangu.js`-style auto-spacer.
- **One font per sentence.** Don't switch between LXGW WenKai and Noto Serif SC inside the same sentence — pick the face that matches the size tier (display = LXGW WenKai, body = Noto Serif SC) and commit to it for the whole run.

### Aesthetic Notes for This System

Emerald Editorial's whole voice is "fashion masthead / 19th-century theatrical playbill" — Bodoni Moda weight 900 at extreme scale with the double-rule ornament bracketing centered words. The Chinese equivalent of that theatrical heaviness is **LXGW WenKai at large display sizes** (its brush-warmth replicates Bodoni's hand-set character) with **Noto Serif SC at weight 900 for jumbo numerals** (where pure mass matters more than warmth). Avoid Noto Sans SC for display — the geometric grotesque flattens the playbill voice into "modern corporate."

The double-rule ornament works in Chinese — bracket a single Chinese word (e.g., 「春」) between the 4px stacked rules and let LXGW WenKai's warmth carry the theatrical bracket. For the "The X of Y" cover convention, Chinese reads naturally as `「X」之「Y」` or `X 与 Y`, with the connector preposition (之 / 与 / 的) replacing the Latin "of" inside the small-prep slot. The connector word should use LXGW WenKai at weight 400 (matching the ornament-word-sm role in Latin).

Manrope's role as the chrome layer (uppercase + 0.08em–0.18em tracking) translates to **思源黑体 Noto Sans SC weight 700–800 with 0.05em positive tracking** for Chinese. Don't try to fake uppercase — drop the `text-transform: uppercase` rule on CJK runs and let the geometric humanist quality of Noto Sans SC carry the chrome feel through weight and tracking alone.

### Known CJK Gap

The system's commitment to Bodoni Moda weight 900 at 460px (jumbo numerals on inverse navy panels) is the hardest to translate — there is no Chinese face on the Google Fonts CDN that delivers Bodoni 900's optical heaviness at that scale. Noto Serif SC at weight 900 is the closest, but the contrast profile of Han glyphs at 460px reads visually heavier than Bodoni numerals, which can overwhelm the navy panel. For jumbo-numeral section openers in Chinese, consider: (1) using a Chinese numeral character (一二三四五六七八九十) which sits visually lighter than Western digits, or (2) keeping the numeral in Bodoni (Latin) and letting the panel label below it carry the Chinese context. The pure-Chinese jumbo numeral on this system is the riskiest moment and benefits from per-slide manual review.

## Iteration Guide

1. Any new display headline is Bodoni Moda at weight 900 with negative letter-spacing and tight leading. Pick the size from the display ladder (92 / 104 / 120 / 128 / 130 / 184 / 200) — do not invent a new size.
2. Any new chrome line (label, eyebrow, tag, caption) is Manrope at weight 700 or 800 uppercase with 0.05em–0.18em letter-spacing. Pick the size from the chrome ladder (24 / 26 / 28).
3. Any new section separator or list-row border is a 4px solid `{colors.ink}` rule. No 1px / 2px / 3px structural rules.
4. Any new tile uses the inverse-fill pattern (`{colors.ink}` bg with `{colors.bg}` text) or the paper-fill pattern (`{colors.paper}` bg with `{colors.ink}` text). Mix the two in rotation across a row of tiles.
5. Any new pill / tag / chip is a strict rectangle (no border-radius) in the inverse-fill or bg-fill color combination from `{components.tag-pill}` / `{components.delta-pill}`.
6. Any new KPI figure is `{typography.kpi-figure}` (144px) with an optional `{typography.kpi-figure-unit}` (60px) suffix. Smaller KPI sizes are not in the system.
7. Any new ornament moment uses the double-rule treatment by default. Switch to single or none only via the `:root[data-ornament]` global, not per-element.
8. Any new section-opener uses the half-bleed inverse panel + jumbo numeral pattern. The numeral lives on the navy panel; the right half holds the eyebrow + headline + lede + marks.
9. Any new color must come from `{colors.bg}` / `{colors.ink}` / `{colors.paper}` (or the reserved bg-2/3 / ink-2/3 variants if tonal nuance is needed). Do not introduce a yellow, red, or third accent.
10. When the layout feels crowded, increase the display headline size rather than adding more elements. The system rewards bigger type, not more pieces.

## Known Gaps

- The Google Fonts request loads Bodoni Moda, Playfair Display, DM Serif Display, Rozha One, Yeseva One, and Manrope. **In practice only Bodoni Moda and Manrope are used.** The other four serif families are dormant — loaded but not referenced in the CSS. They are available as alternate display voices but must be wired in explicitly.
- The system depends on `deck-stage.js` for canvas scaling and slide navigation. The script is not described in this design.md — treat it as a runtime dependency.
- The `:root[data-ornament]` switch (`double` / `single` / `none`) is a global presentation setting. It cannot be applied per-slide or per-ornament — switching variants applies deck-wide.
- The ink-2 / ink-3 and bg-2 / bg-3 color tokens are defined but not actively used in the published CSS. They are reserved for tonal variation but currently dormant.
- The bar chart uses hand-set bar heights (CSS `%`). There is no data-binding layer — extending the chart requires manually computing percentages.
- Offline rendering will fall back to system serif (likely Georgia) for Bodoni and system sans (likely SF/Segoe) for Manrope. The Bodoni fallback dramatically flattens the display voice; self-hosting recommended for offline / print reliability.
- The 92px Bodoni headlines maintain WCAG AA contrast at navy-on-emerald and emerald-on-navy, but smaller text (24–28px Manrope) on the same color pairings approaches the contrast floor. Keep small text in navy-on-emerald (the more contrastful direction) when possible.
- The masthead and footline strings are hardcoded placeholders in the source (publication name, date, page numbers). They must be edited per-deck.
- The system has no `@media print` rule and no responsive breakpoints. It is fixed 1920×1080 and relies on `deck-stage.js` for any viewport adaptation.
