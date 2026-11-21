---
version: alpha
name: Cobalt Grid
description: "A Japanese-magazine trend-report system built on warm cream paper, electric cobalt ink, and a graph-paper grid that lives permanently behind every slide. Newsreader serif headlines tower at 18vh while DM Mono carries chrome and ticker text. The signature decoration is a pixel-glitch column — vertical scanlines stair-stepped down the right edge of declarative slides — paired with QR-style 8×8 grid patches. The cultural reference is WIRED Japan, Shift magazine, and architectural trend reports printed in two-color risograph: cream + one cobalt."

colors:
  paper: "#F0EBDE"
  paper-2: "#E6E0CE"
  ink: "#1F2BE0"
  ink-soft: "#5560E5"
  grid: "rgba(31, 43, 224, 0.10)"
  ink-faint: "rgba(31, 43, 224, 0.18)"

color-aliases:
  rule: ink
  bg: paper

typography:
  display-hero:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(100px, min(11vw, 18vh), 200px)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.008em
  display-closing:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(72px, min(8.4vw, 14vh), 180px)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: -0.005em
  display-chapter:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(56px, min(6vw, 10vh), 130px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.005em
  display-quote:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(50px, min(5.6vw, 9vh), 110px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.005em
  display-manifesto:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(56px, min(6.4vw, 11vh), 120px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.005em
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(46px, min(4.8vw, 8.2vh), 92px)"
    fontWeight: 400
    lineHeight: 0.95
  headline-index:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(48px, min(5vw, 8.5vh), 100px)"
    fontWeight: 400
    lineHeight: 0.95
  vbig-numeral:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(110px, min(11vw, 18vh), 240px)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.015em
  ed-callout:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(28px, min(2.8vw, 4.6vh), 50px)"
    fontWeight: 400
    lineHeight: 1.1
  row-headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(26px, 2vw, 40px)"
    fontWeight: 400
    lineHeight: 1.05
  table-name:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(20px, 1.6vw, 28px)"
    fontWeight: 400
    lineHeight: 1.15
  micro:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(12px, 0.9vw, 14px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.16em
    textTransform: uppercase
  micro-strong:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(13px, 1vw, 16px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.18em
    textTransform: uppercase
  micro-sm:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(11px, 0.75vw, 12px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.18em
    textTransform: uppercase
  body:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(14px, 0.95vw, 15px)"
    fontWeight: 400
    lineHeight: 1.5
  body-lede:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(15px, 1vw, 18px)"
    fontWeight: 400
    lineHeight: 1.5
  body-stat:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(15px, 1vw, 17px)"
    fontWeight: 400
    lineHeight: 1.5
  mono-tag:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "clamp(13px, 0.9vw, 15px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.04em
  mono-chrome:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "clamp(11px, 0.82vw, 13px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.06em
  mono-tick:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "clamp(12px, 0.85vw, 14px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.04em

spacing:
  edge: "clamp(36px, 3.6vw, 80px)"
  edge-inner: "clamp(60px, 8vw, 160px)"
  pad-top: "clamp(76px, 8vh, 130px)"
  pad-bottom: "clamp(100px, 10vh, 150px)"
  gap-lg: "clamp(28px, 3vw, 56px)"
  gap-md: "clamp(20px, 2.2vh, 36px)"
  gap-sm: "clamp(14px, 1.6vh, 24px)"
  gap-xs: "clamp(10px, 1.2vh, 18px)"

canvas:
  width: 100vw
  height: 100vh

components:
  graph-paper-grid:
    backgroundImage: "linear-gradient(to right, {colors.grid} 1px, transparent 1px), linear-gradient(to bottom, {colors.grid} 1px, transparent 1px)"
    backgroundSize: "clamp(28px, 2.2vw, 44px) clamp(28px, 2.2vw, 44px)"
    description: "Permanent ::before pseudo on every stage. 28–44px squared graph paper grid in 10%-opacity cobalt that sits behind every slide at z-index 1. Cannot be turned off — it is the canvas tone."
  hairlines:
    height: "1.5px"
    background: "{colors.ink}"
    description: "Two persistent slim cobalt rules — one at the top of every slide (≈2.6vh from top) and one near the bottom (≈2vh from bottom) — both inset from edges by {spacing.edge}. They frame the slide composition."
  pagenum:
    position: absolute
    right: "{spacing.edge}"
    bottom: "clamp(48px, 4.8vh, 76px)"
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "clamp(11px, 0.82vw, 13px)"
    color: "{colors.ink}"
    letterSpacing: 0.06em
    description: "Mono cobalt page number anchored bottom-right above the bottom hairline. One per slide."
  nav-hint:
    position: fixed
    left: "{spacing.edge}"
    bottom: "clamp(48px, 4.8vh, 76px)"
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "clamp(10px, 0.75vw, 12px)"
    color: "{colors.ink}"
    letterSpacing: 0.08em
    opacity: 0.4
    description: "Mono cobalt navigation hint anchored bottom-left, mirrors pagenum."
  pixel-glitch:
    description: "Stair-stepped column of vertical scanlines, rendered as inline SVG. Each stepped rectangle contains evenly-spaced cobalt vertical lines on cream. Sits absolutely positioned (typically right edge) at z-index 3, decorative only. Size ranges from 16vw × full-height (compact decoration) to 32vw × full-height (signature cover decoration)."
  qr-block:
    display: grid
    gridTemplateColumns: "repeat(8, 1fr)"
    gridTemplateRows: "repeat(8, 1fr)"
    gap: 1.5px
    background: "{colors.paper}"
    padding: 4px
    boxShadow: "0 0 0 1.5px {colors.paper}"
    description: "8×8 QR-style mosaic of cobalt cells on cream background. Paper-fill ensures it reads as a discrete patch when overlapping the pixel-glitch column. Typical size 58–100px square."
  topbar-rule:
    borderBottom: "1.5px solid {colors.ink}"
    paddingBottom: "clamp(12px, 1.4vh, 22px)"
    description: "1.5px cobalt rule under the topbar of an index, data, or table layout. Below the rule sits a Newsreader headline (left) and a mono lab-tag (right)."
  row-divider:
    borderBottom: "1px solid {colors.ink-faint}"
    description: "Faint 18%-opacity cobalt rule between rows of an index list, table, or ledger."
  attribution-rule:
    borderTop: "1px solid {colors.ink}"
    paddingTop: "clamp(10px, 1.2vh, 18px)"
    description: "Solid cobalt rule above a quote attribution or manifesto byline."
  pixel-stack-bars:
    description: "Vertical bar chart rendered as a column of stacked 'cells' — flex column-reverse with 3px gaps, each cell a small horizontal block. Cells default to 10%-opacity cobalt (the grid color); .on cells fill solid cobalt to represent the value. Reads as a pixelated bar made of grid units."
  ledger-row:
    display: grid
    gridTemplateColumns: "76px 0.6fr 1.4fr 0.7fr 0.5fr"
    gap: "clamp(14px, 1.4vw, 28px)"
    borderBottom: "1px solid {colors.ink-faint}"
    description: "Dense table row carrying a num-tag, name (Newsreader), description (Hanken Grotesk), mood-tag, and delta-tag (mono with up/down arrow prefix). Header row uses 1.5px solid cobalt bottom border."
  vstack-label:
    fontFamily: "DM Mono, ui-monospace, monospace"
    writingMode: "vertical-rl"
    textOrientation: "mixed"
    letterSpacing: 0.04em
    description: "Vertical-orientation mono label column anchored to the right edge of a slide. Replaces the Korean vertical column of the reference with mono catalogue text rotated 90°."
  delta-up:
    content: "↑ "
    description: "Up arrow prefix via ::before on a mono delta tag in the ledger table."
  delta-down:
    content: "↓ "
    opacity: 0.6
    description: "Down arrow prefix via ::before, dimmed 40% to read as decline."
  delta-flat:
    content: "— "
    opacity: 0.6
    description: "Em-dash prefix via ::before, dimmed 40% to read as neutral."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Cobalt Grid is a **two-color trend-report editorial system** built on three immovable foundations: a warm cream paper canvas (`{colors.paper}`), an electric cobalt ink (`{colors.ink}`), and a **permanent graph-paper grid** that sits behind every slide. The grid is not optional decoration — it is rendered via a `::before` pseudo on every `.stage` and cannot be turned off. The aesthetic is "two-color risograph monograph": cream + cobalt only, with the grid lending the entire deck the feel of architectural tracing paper or a Japanese trend report.

The typeface stack is a deliberate three-face conversation. **Newsreader** — a contemporary literary serif with low-modulation roman letterforms — carries every display moment, every section headline, every stat numeral. Newsreader is used at weight 400 only; the type relies on size to assert hierarchy, not weight. **Hanken Grotesk** — a humanist sans — carries every body paragraph, every uppercase label, every micro-text. Hanken runs at 400 for body and 600 for labels. **DM Mono** — a monospace — carries every chrome element: page numbers, mono tags, axis ticks, vertical-stack labels, delta arrows in tables. The three-face system creates the system's identity: serif statements + sans bodies + mono chrome.

The palette is **strictly two-color**: cream and cobalt, with a softer cobalt `{colors.ink-soft}` and two opacity tones (`{colors.grid}` at 10%, `{colors.ink-faint}` at 18%) for atmospheric and structural use. There are no accent colors. Cobalt is the *only* ink color — for headlines, body, borders, page numbers, the graph paper, the pixel-glitch decoration, and the QR patches. The cream paper is the *only* surface. Even the pixel-stack bar chart uses cobalt at two opacities (10% off, 100% on) to render data.

Depth is **flat with structural rules**. There are no drop shadows, no elevated cards, no rounded surfaces. Hierarchy comes from:
- The 1.5px cobalt **hairline frame** (top and bottom of every slide).
- 1.5px cobalt **topbar rule** under section headers.
- 1px faint-cobalt **row dividers** between table or index entries.
- The 10%-opacity **graph paper grid** behind everything.
- The pixel-glitch and QR-block **decorative SVG patches** as compositional accents.

**Density philosophy: medium to dense, structured by the grid.** Cobalt Grid is built for editorial density — magazine spreads, trend indices, data ledgers. A correctly composed slide pairs one large Newsreader headline with multiple structured information rows (an index of six trends, a ledger of eight entries, a chart with eight pixel-stack bars). The graph paper underneath actively wants to be filled; sparse slides leave too much grid showing and read as wireframe. The exception is the manifesto, quote, and colophon layouts, which deliberately leave space open and let the graph paper breathe. Choose density by slide type: chapter / manifesto / quote / colophon are sparse; index / data / table are dense.

**Key Characteristics:**
- Cream paper canvas `{colors.paper}` with electric cobalt `{colors.ink}` as the only ink — strictly two-color.
- Permanent 28–44px graph-paper grid in 10%-opacity cobalt behind every slide.
- Top and bottom 1.5px cobalt hairlines frame every slide with `{spacing.edge}` insets.
- Newsreader serif at weight 400 for every display/headline; Hanken Grotesk sans for body/labels; DM Mono for all chrome.
- Pixel-glitch vertical scanline columns and QR-style 8×8 mosaics as the system's signature decorative patches.
- Display type can be enormous — `{typography.display-hero}` up to 18vh (≈194px on a 1080-tall display) and `{typography.vbig-numeral}` to 240px.
- Hanken labels are uppercase at 0.16–0.18em letter-spacing; mono tags carry 0.04–0.06em tracking.
- Pixel-stack bar charts render data as stacks of grid-unit cells (cobalt on / cobalt-10% off).
- Page number bottom-right, mono navigation hint bottom-left, both anchored above the bottom hairline.

## Colors

### Two-Color System
- **Paper** (`{colors.paper}` — #F0EBDE): The canvas. Warm cream off-white with a clear yellow-warm bias — closer to "newsprint paper" than "blank white." Used as the universal slide background and as the fill behind QR-blocks so they read as discrete patches against the pixel-glitch column.
- **Paper-2** (`{colors.paper-2}` — #E6E0CE): A slightly deeper cream. Defined in the palette but used sparingly — available for subtle region differentiation when needed.
- **Ink** (`{colors.ink}` — #1F2BE0): Electric cobalt / royal blue. The *only* ink color in the system. Used for all headlines, all body text, all borders, all chrome, the graph paper grid, the pixel-glitch decoration, and the QR patches. The high saturation is intentional — at full strength it reads as risograph-printed cobalt, not navy blue.
- **Ink Soft** (`{colors.ink-soft}` — #5560E5): A lighter cobalt for secondary marks. Defined in the palette but used sparingly — most softened cobalt in the system comes from opacity-on-ink rather than this dedicated tone.
- **Grid** (`{colors.grid}` — rgba(31, 43, 224, 0.10)): 10%-opacity cobalt. Used exclusively for the permanent graph-paper grid behind every slide, and for the "off" cells in pixel-stack bar charts.
- **Ink Faint** (`{colors.ink-faint}` — rgba(31, 43, 224, 0.18)): 18%-opacity cobalt. Used exclusively for the faint row dividers in index lists, tables, and ledgers — between rows that share the same dense information layer.

### Defaults
- **Default slide surface**: `{colors.paper}`.
- **Default headline color**: `{colors.ink}` — every Newsreader serif headline is cobalt. There is no other headline color.
- **Default body text color**: `{colors.ink}` — body is also cobalt, just smaller. Cobalt-on-cream is the system's only text relationship.
- **Default label / mono / micro color**: `{colors.ink}`.
- **Default border color (structural rules)**: `{colors.ink}` at 1.5px solid.
- **Default border color (row dividers within dense lists)**: `{colors.ink-faint}` at 1px solid.
- **Default grid color**: `{colors.grid}` — never visible at full strength; never disabled.
- **Default chart data color (on)**: `{colors.ink}`.
- **Default chart data color (off)**: `{colors.grid}`.

The system has **no accent color** in the populist sense. A second color does not exist — adding a red callout, a green stat, or a yellow highlight breaks the risograph two-color identity. When emphasis is needed, increase type size, switch from Hanken to Newsreader, add a mono delta arrow, or use opacity to dim rather than coloring to highlight.

## Typography

### Font Family
The system runs on a **three-face conversation**: `Newsreader` (serif, weight 400 / 500 italic) carries every display and headline; `Hanken Grotesk` (sans, weights 400–700) carries every body, label, and micro-text; `DM Mono` (monospace, 400–500) carries every chrome element. There is no fourth face.

Newsreader's roman letterforms run at weight 400 almost exclusively — the type relies on size to assert hierarchy, not weight. Italic Newsreader is loaded (300/400/500 italic axis) and is used inside the manifesto's `.roman` modifier (which is *non-italic* — the modifier flips the italic body back to roman for an inline pull moment) and is available for inline `<em>` emphasis. Hanken Grotesk carries body at 400 and labels at 600. DM Mono provides chrome at 400.

The serif/grotesk/mono three-way pairing is the system's primary typographic rhythm. Each face has a strict role: serif = statement, grotesk = supporting copy, mono = catalogue chrome.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.vbig-numeral}` | clamp(110px, min(11vw, 18vh), 240px) | Newsreader | 400 | Largest numerical display — hero stat figure |
| `{typography.display-hero}` | clamp(100px, min(11vw, 18vh), 200px) | Newsreader | 400 | Largest title — cover or hero display |
| `{typography.display-closing}` | clamp(72px, min(8.4vw, 14vh), 180px) | Newsreader | 400 | Conclusive headline on a colophon/closing layout |
| `{typography.display-chapter}` | clamp(56px, min(6vw, 10vh), 130px) | Newsreader | 400 | Section-opening or chapter title |
| `{typography.display-manifesto}` | clamp(56px, min(6.4vw, 11vh), 120px) | Newsreader | 400 | Manifesto statement display |
| `{typography.display-quote}` | clamp(50px, min(5.6vw, 9vh), 110px) | Newsreader | 400 | Pull-quote body |
| `{typography.headline-index}` | clamp(48px, min(5vw, 8.5vh), 100px) | Newsreader | 400 | Index or trend-list section header |
| `{typography.headline}` | clamp(46px, min(4.8vw, 8.2vh), 92px) | Newsreader | 400 | Data, table, or chart section header |
| `{typography.ed-callout}` | clamp(28px, min(2.8vw, 4.6vh), 50px) | Newsreader | 400 | Editorial subtitle below a hero title |
| `{typography.row-headline}` | clamp(26px, 2vw, 40px) | Newsreader | 400 | Per-row headline inside an index list |
| `{typography.table-name}` | clamp(20px, 1.6vw, 28px) | Newsreader | 400 | Per-row name cell inside a ledger table |
| `{typography.body-lede}` | clamp(15px, 1vw, 18px) | Hanken Grotesk | 400 | Lead paragraph below a chapter title |
| `{typography.body-stat}` | clamp(15px, 1vw, 17px) | Hanken Grotesk | 400 | Descriptive paragraph next to a stat figure |
| `{typography.body}` | clamp(14px, 0.95vw, 15px) | Hanken Grotesk | 400 | Standard paragraph body |
| `{typography.micro-strong}` | clamp(13px, 1vw, 16px) | Hanken Grotesk | 600 | Largest uppercase label / kicker |
| `{typography.micro}` | clamp(12px, 0.9vw, 14px) | Hanken Grotesk | 600 | Standard uppercase label / lab-tag |
| `{typography.micro-sm}` | clamp(11px, 0.75vw, 12px) | Hanken Grotesk | 600 | Smallest uppercase label / table header |
| `{typography.mono-tag}` | clamp(13px, 0.9vw, 15px) | DM Mono | 400 | Mono catalogue tag, num-tag in an index row |
| `{typography.mono-tick}` | clamp(12px, 0.85vw, 14px) | DM Mono | 400 | Mono chart tick label, vertical-stack-label entry |
| `{typography.mono-chrome}` | clamp(11px, 0.82vw, 13px) | DM Mono | 400 | Mono page number, navigation hint, secondary meta |

### Defaults
- **Default size for the primary section headline (index, data, table)**: `{typography.headline}` (clamp 46–92px) or `{typography.headline-index}` for index layouts.
- **Default size for a cover or hero display**: `{typography.display-hero}` (clamp 100–200px).
- **Default size for a chapter or section-opener title**: `{typography.display-chapter}` (clamp 56–130px).
- **Default size for paragraph body**: `{typography.body}` (clamp 14–15px).
- **Default size for any inline uppercase label**: `{typography.micro}` (clamp 12–14px) at weight 600 with 0.16em tracking.
- **Default size for any mono chrome (page number, tag, tick)**: `{typography.mono-tag}` (clamp 13–15px).
- **Default weight for Newsreader**: 400. Newsreader bold is not used.
- **Default weight for Hanken body**: 400.
- **Default weight for Hanken label**: 600.

When unsure, reach for `{typography.headline}` (clamp 46–92px) for the slide's primary section header, not `{typography.display-chapter}` (which is for chapter-opening moments only).

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Newsreader element is set at weight 400.** Newsreader at 600/700 is not used in this system. The literary-serif aesthetic depends on the open roman letterforms at modest weight.
- **Every Newsreader element is rendered in `{colors.ink}` (cobalt).** A cream serif headline does not exist.
- **Every Hanken label, kicker, lab-tag, and micro-text is uppercase with at least 0.16em letter-spacing** at weight 600. Hanken caps without tracking read as untreated.
- **Every DM Mono element is rendered in `{colors.ink}` with 0.04–0.08em letter-spacing.** Mono with tighter tracking reads as code, not editorial.
- **Every display element carries negative letter-spacing.** Display-hero at -0.008em, vbig-numeral at -0.015em, chapter / closing / manifesto / quote at -0.005em.
- **The graph-paper grid is permanent on every slide.** The `.stage::before` rule is not overridable per-slide — every composition sits on top of it.
- **The top and bottom hairlines frame every slide.** The `.hairlines::before` and `.hairlines::after` rules apply by default; they should not be suppressed.
- **Page number sits above the bottom hairline with clear vertical space.** The bottom hairline anchors at `bottom: clamp(20px, 2vh, 32px)`; the page number anchors at `bottom: clamp(48px, 4.8vh, 76px)` — they must not collide.

### Typography Principles
The Newsreader-400 + Hanken-600-uppercase-tracked + DM-Mono-tracked combination is the system's voice. Switching any of those three face/weight/case rules reads as a different design system. Italic is permitted via Newsreader italic (loaded) for inline `<em>` and for the manifesto's editorial italic-with-`.roman`-flip treatment. Underline is not used.

Line-height collapses at the top: display-hero / vbig-numeral at 0.92, display-chapter at 1.0, body at 1.5. The tight display + open body contrast is what gives the system its trend-report rhythm.

## Layout

### Canvas System
The canvas is `100vw × 100vh` — full viewport with hidden overflow. Each `.slide` is absolutely positioned to fill the viewport; one slide carries `.active` (opacity 1, pointer-events auto) at a time. Transitions are 280ms opacity fades.

A `.stage` wrapper sits inside `.deck` (`position: fixed; inset: 0`) and provides the cream background plus the permanent `::before` graph-paper grid.

### Edge and Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.edge}` | clamp(36px, 3.6vw, 80px) | Standard slide edge inset for content, page number, hairlines |
| `{spacing.edge-inner}` | clamp(60px, 8vw, 160px) | Tighter inset used for manifesto-style centered statements |
| `{spacing.pad-top}` | clamp(76px, 8vh, 130px) | Top padding inside index/data/table frame, below the top hairline |
| `{spacing.pad-bottom}` | clamp(100px, 10vh, 150px) | Bottom padding inside index/data/table frame, above the bottom hairline |
| `{spacing.gap-lg}` | clamp(28px, 3vw, 56px) | Large gap between major regions inside a slide |
| `{spacing.gap-md}` | clamp(20px, 2.2vh, 36px) | Standard inter-element spacing |
| `{spacing.gap-sm}` | clamp(14px, 1.6vh, 24px) | Tight spacing — chrome bar inner gap, attribution-to-quote gap |
| `{spacing.gap-xs}` | clamp(10px, 1.2vh, 18px) | Vertical-stack row gap, smallest inter-element gap |

### Universal Chrome Frame
Every slide carries a four-piece chrome frame:
1. **Top hairline** — 1.5px solid cobalt at ≈2.6vh from top, inset by `{spacing.edge}` left/right.
2. **Bottom hairline** — 1.5px solid cobalt at ≈2vh from bottom, inset by `{spacing.edge}` left/right.
3. **Page number** — DM Mono cobalt anchored bottom-right, ≈4.8vh from bottom (above the bottom hairline).
4. **Nav hint** — DM Mono cobalt at 40% opacity anchored bottom-left, same vertical level as page number.

This frame is rendered automatically by the `.hairlines` and `.pagenum` / `.nav-hint` rules — every new slide inherits it.

A nested **`.frame` content rectangle** sits inside the chrome on index, data, table, and chapter layouts. It is absolutely positioned with `inset: {spacing.pad-top} {spacing.edge} {spacing.pad-bottom}` and serves as the actual content container.

### Composition Patterns
Within the chrome frame, content typically follows one of these compositional moves (not enumerated as available layouts — these are descriptive, not prescriptive):
- A `topbar` block (Newsreader headline left, mono lab-tag right, 1.5px cobalt rule beneath) above a main content region.
- A pixel-glitch column anchored to the right edge of the content region (or occasionally the left, as on the colophon).
- A QR-block patch as a small punctuation mark (typically top-right corner).
- A vertical-stack mono label column anchored to one edge.
- A dense ledger or index of equal-flex rows separated by faint cobalt dividers.

## Depth and Elevation

### Flat With Structural Rules
Cobalt Grid has no drop shadows, no elevated cards, no rounded surfaces, no gradients. Every element sits on a single plane.

Depth signals are entirely structural:
- **1.5px cobalt rules** — top/bottom slide hairlines, topbar rule, attribution rule.
- **1px faint cobalt dividers** — row separators inside index lists, tables, and ledgers.
- **Graph-paper grid** — the 10%-opacity cobalt background creates a sense of measured plane.
- **Pixel-glitch decoration** — vertical scanline columns add visual texture without z-axis elevation.
- **QR-block patches** — read as discrete graphic objects against the grid+glitch background due to their paper-fill and 1.5px paper-color outset shadow (which is functionally an "anti-shadow" — it pushes the grid away so the QR mosaic stays readable).

The QR-block's 1.5px paper-color outset is the *only* shadow-like effect in the system, and it exists to preserve readability against the pixel-glitch column, not to create elevation. There is no z-axis depth.

## Shapes and Treatment

### Border Radius
| Value | Use |
|---|---|
| 0 | Every structural element — frames, cards, ledger rows, QR cells, pixel-glitch rectangles, charts, tables |
| 50% (circle) | None — Cobalt Grid has no circular elements |

The system uses **zero rounded corners**. Every shape is a strict rectangle. This is unusual for editorial systems and is part of the trend-report identity.

### Border Weights
- **1.5px solid `{colors.ink}`** — primary structural rules: top/bottom slide hairlines, topbar bottom rule, table head row bottom border, chart baseline rule.
- **1px solid `{colors.ink}`** — attribution rules above quote bylines, manifesto attribution top border.
- **1px solid `{colors.ink-faint}`** (18% opacity) — faint row dividers between dense list / table / ledger entries.
- **1px solid `{colors.grid}`** (10% opacity) — the permanent graph-paper grid behind every slide.
- **1.5px box-shadow in `{colors.paper}`** — QR-block readability outset (functional, not decorative).

All structural borders are cobalt. Colored borders do not exist (there is no "colored" — only cobalt at different opacities).

### Decorative Element Types

**Pixel-glitch column** — A stair-stepped vertical column rendered as inline SVG. Each step is a rectangle filled with evenly-spaced cobalt vertical scanlines on cream. Steps decrease in width as the column descends (or vice versa), creating a "glitch" pixelation effect. Anchored to one edge of a slide (typically right), absolutely positioned, z-index 3, pointer-events disabled. Decorative only — sizes range from compact 16vw × full-height secondary use to 32vw × full-height signature cover decoration. Opacity 0.6–1.0 depending on context (lower opacity when used as background, full opacity when used as primary decoration).

**QR-block patch** — An 8×8 grid of cells (some `.on` = solid cobalt, some default = paper) forming a QR-code-like mosaic. Sits over a paper-fill background with 4px internal padding and 1.5px paper-color outset (which preserves readability when overlapping the pixel-glitch column). Typical size 58–100px square. Used as compositional punctuation — typically top-right corner.

**Vertical-stack label column** — A column of DM Mono labels written with `writing-mode: vertical-rl` and `text-orientation: mixed`, rotating Latin text 90° clockwise. Anchored to right edge, vertically centered, evenly spaced. Reads as catalogue-style metadata stacked along the slide edge.

**Topbar (with rule)** — A flex row containing a Newsreader headline left and a small mono lab-tag right, separated from the content below by a 1.5px solid cobalt bottom border. The universal section-header pattern.

**Frame** — An absolutely-positioned content container with `inset: {spacing.pad-top} {spacing.edge} {spacing.pad-bottom}`. Holds the slide's actual content while keeping it clear of the hairline frame, page number, and nav hint.

**Index list** — A 2×3 grid of equal-flex rows, each row a 56px num-tag column + a content column with a Newsreader row-headline and a Hanken body paragraph, separated by 1px faint-cobalt bottom borders.

**Pixel-stack bar chart** — A row of 8 vertical "stacks," each a flex column-reverse of small horizontal cells (default 10%-cobalt off, .on solid cobalt). Cell counts represent values. A 1.5px cobalt top border with mono tick labels sits beneath the bars as the axis. Renders data as pixelated bars made of grid units — directly echoes the pixel-glitch decoration.

**Ledger table** — A flex column of dense rows, each row a 5-column grid (76px num-tag / 0.6fr name / 1.4fr description / 0.7fr mood-tag / 0.5fr delta-tag), separated by 1px faint-cobalt bottom borders. Header row uses 1.5px solid cobalt. Delta tags use `↑` / `↓` / `—` prefixes via `::before`.

**Manifesto** — A centered statement in `{typography.display-manifesto}` Newsreader with an italic `<em>` body containing inline `.roman` (non-italic) emphasis moments. Below: a 1px cobalt top border with a Hanken who-tag and a mono meta-tag side-by-side.

**Quote** — A Hanken kicker above a `{typography.display-quote}` Newsreader pull, with a 1px cobalt top-border attribution row beneath. Paired with a compact pixel-glitch column at the right edge.

**Colophon** — Right-aligned closing layout. A large `{typography.display-closing}` Newsreader title aligned right with a kicker above. Pixel-glitch column anchored to left edge (mirroring the cover). Page footer with 3–4 column grid of paragraph credits.

## Do's and Don'ts

### Do
- Set every Newsreader element at weight 400 in `{colors.ink}`. The thin roman serif at modest weight is the literary register's identity.
- Render every label, kicker, and micro-text in Hanken Grotesk weight 600 uppercase with 0.16em+ letter-spacing in `{colors.ink}`.
- Render every chrome element (page number, mono tag, tick label, vertical-stack) in DM Mono with 0.04–0.08em tracking in `{colors.ink}`.
- Keep the permanent graph-paper grid behind every slide. The grid is the system — disabling it breaks the identity.
- Maintain the top and bottom 1.5px cobalt hairlines on every slide, with the page number and nav hint sitting above the bottom hairline.
- Use the pixel-glitch column as the system's primary decorative move on declarative slides (cover, chapter, quote, colophon).
- Pair pixel-glitch with a QR-block patch when the composition needs a discrete graphic anchor — the QR's paper-fill keeps it readable against the glitch lines.
- Use the `topbar + 1.5px cobalt rule` pattern as the standard section-header treatment on index, data, and table layouts.
- Use 1px faint-cobalt dividers between rows of dense lists, tables, and ledgers.
- Render charts as pixel-stack columns of grid cells (cobalt on / cobalt-10% off). The pixel-stack bar treatment echoes the decorative glitch and unifies the visual language.

### Don't
- Don't introduce a second ink color. The system is strictly two-color: cream paper + cobalt ink. A second hue breaks the risograph identity.
- Don't render a Newsreader headline at weight 600 or 700. The 400-only rule is a signature.
- Don't disable or hide the graph-paper grid. It is the canvas tone, not optional decoration.
- Don't suppress the top/bottom hairlines on a slide. They are the frame — every slide carries them.
- Don't round any corner. Every shape is a strict rectangle; the system has zero circular elements.
- Don't add drop shadows, elevated cards, or gradient fills. Depth is structural (rules + grid + glitch), not z-axis.
- Don't use Hanken caps without 0.16em+ tracking. Untracked Hanken caps read as untreated.
- Don't put the page number directly on the bottom hairline. It sits at `bottom: clamp(48px, 4.8vh, 76px)` with clear space above the hairline.
- Don't render the QR-block without its paper-fill and 1.5px paper outset. The fill is what preserves QR readability against the pixel-glitch column.
- Don't crowd the manifesto, quote, or colophon layouts. Those layouts deliberately leave grid showing — over-stuffing them breaks the contemplative register.

## Responsive Behavior

Cobalt Grid is a viewport-fluid 1920×1080 presentation system using `clamp()` and viewport-relative units throughout. There are no explicit responsive breakpoints in the source — every dimension scales between a min and max.

### Scaling Behavior
- Display-hero scales from ~100px at minimum viewport to ~200px at maximum.
- Body text scales from 14px to 15px (deliberately narrow range — body stays compact).
- Graph-paper grid scales from 28px cells (smaller viewports) to 44px cells (larger viewports), maintaining roughly 50–80 cells across the slide width.
- Edge insets scale from 36px to 80px.
- The 1.5px hairlines and 1px row dividers are fixed and do not scale.

### Presenter Behavior
- Slides cross-fade via 280ms opacity transitions.
- Navigation is JS-driven (the source includes a `.deck` / `.slide.active` pattern); typical keyboard arrow / spacebar conventions apply.
- The nav hint at bottom-left displays interaction guidance in mono cobalt at 40% opacity.

### Print / Export
Not explicitly handled. Each slide is a 100vw × 100vh block; export workflows should snapshot each slide at 1920×1080. The grid and hairline overlays should render correctly in PDF capture (no blend modes or filters).

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin font | Recommended Chinese pairing | Source |
|---|---|---|---|
| Display / Headline (Newsreader 400) | Newsreader | 思源宋体 Noto Serif SC 700 | Google Fonts |
| Body / Label (Hanken Grotesk 400–600) | Hanken Grotesk | 思源宋体 Noto Serif SC 400 | Google Fonts |
| Chrome / Mono (DM Mono) | DM Mono | DM Mono (Latin/digit only — keep mono chrome in Latin) | Google Fonts |

### Mixed-Content Strategy

Use **Strategy A — single-font-stack with fallback**: declare Noto Serif SC *after* the Latin font in the same `font-family` stack so Latin glyphs render in Newsreader / Hanken Grotesk and CJK glyphs fall through to NSC automatically. Mono chrome stays Latin/digit-only — page numbers, ticks, and vertical-stack tags do not need a CJK fallback (and DM Mono has no CJK glyphs by design).

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..500;1,6..72,400..500&family=Hanken+Grotesk:wght@400..700&family=DM+Mono:wght@400..500&family=Noto+Serif+SC:wght@400;700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: "Newsreader", "Noto Serif SC", Georgia, serif;
  --font-body: "Hanken Grotesk", "Noto Serif SC", sans-serif;
  --font-mono: "DM Mono", ui-monospace, monospace;
}
/* Headlines use Noto Serif SC 700; body uses Noto Serif SC 400. */
```

### Universal CJK Adjustments

- **Line-height**: bump CJK body line-height to ~1.7 (from 1.5) — Hanzi need more vertical breathing than Latin lowercase.
- **Letter-spacing**: zero out `letter-spacing` on Hanzi runs (the 0.16em+ Hanken caps tracking shatters Hanzi cadence). Keep tight tracking only on Latin spans.
- **Text-transform**: drop `text-transform: uppercase` on any micro/label/kicker when content is Hanzi — Chinese has no case; forcing uppercase does nothing for Hanzi but breaks the rendering of any mixed Latin acronyms inside.
- **Punctuation**: use Chinese full-width punctuation (，。：；「」) for Chinese sentences, half-width (`,.:;""`) for Latin. Never mix half-width punctuation into a Chinese sentence.
- **No period on headlines**: Chinese headline convention omits the terminal 。 — strip it from display strings.
- **Pangu spacing**: insert a thin space (or a regular space) between adjacent Hanzi and Latin/digit runs (e.g. `2026 年`, `AI 产品`). Improves readability of mixed runs.
- **One font per sentence**: don't switch CJK families mid-sentence. Pick a single weight of Noto Serif SC for a given text run, never two inside one phrase.

### Aesthetic Notes

Noto Serif SC (思源宋体) is the natural Hanzi partner for Newsreader — both are quiet literary serifs with thin-thick modulation that holds at very large display sizes (up to 18vh / 240px on the vbig-numeral). The cobalt-on-cream two-color rule absorbs Chinese without negotiation because there's only one ink color to assign. NSC 700 carries display moments where Newsreader 400 would have at 100–200px; NSC 400 carries body and labels. The DM Mono chrome layer (page numbers, vertical-stack tags, ticks) intentionally stays Latin/digit-only — `编号 001` is rendered as Latin "001" in DM Mono with the Hanzi prefix in Hanken/NSC, preserving the mono catalogue chrome's "technical spec" voice. The graph-paper grid, pixel-glitch column, and QR-block decoration are content-agnostic and read identically in any language. Vertical-stack labels written with `writing-mode: vertical-rl` work for Hanzi too — Chinese is the original vertical script — but mixing Latin and Hanzi in the same vertical run will rotate the Hanzi to upright while keeping Latin rotated 90°; isolate runs by language.

### Known CJK Gap

Noto Serif SC has no italic axis (Chinese type historically has no italic), so the manifesto layout's italic-Newsreader-with-`.roman`-flip emphasis pattern collapses when content is Hanzi. Substitute a weight contrast (NSC 700 vs NSC 400) or a faint-cobalt tone (`{colors.ink-faint}`) to recover the emphasis register. Newsreader's optical-size axis (6..72) has no NSC equivalent — the literary "this is a small caption" optical refinement is unavailable for Hanzi, but at NSC's quality this is rarely noticeable.

## Iteration Guide

1. Every new slide inherits the permanent graph-paper grid, the top and bottom 1.5px cobalt hairlines, the page number bottom-right, and the nav hint bottom-left. Don't author these per-slide — they live on `.stage` and `.hairlines`.
2. Every new headline uses Newsreader at weight 400 in `{colors.ink}`. Don't bold; don't color.
3. Every new label uses Hanken Grotesk weight 600 uppercase with 0.16em+ letter-spacing in `{colors.ink}`.
4. Every new chrome element uses DM Mono in `{colors.ink}` with 0.04–0.08em tracking.
5. New content slides on index / data / table layouts use a topbar (Newsreader headline left + Hanken lab-tag right) with a 1.5px cobalt bottom rule.
6. New chart slides use the pixel-stack treatment — cobalt on / cobalt-10% off cells in column-reverse stacks. Don't introduce filled bar charts in a single solid block.
7. New declarative slides (cover, chapter, quote, colophon) use a pixel-glitch column as the primary decoration. Pair with a QR-block when the composition needs a discrete graphic anchor.
8. New row dividers in dense lists use 1px solid `{colors.ink-faint}` (18% opacity), not full-strength cobalt. Full-strength cobalt is reserved for major structural rules.
9. New components inherit the zero-radius, no-shadow, no-gradient flatness. If a component breaks any of these, redesign it before adding.
10. The system has one ink color (`{colors.ink}`) and one surface (`{colors.paper}`). New compositions should never introduce a third color or a third surface tone (paper-2 is available but rarely needed).

## Known Gaps

- The pixel-glitch column is rendered as inline SVG hand-authored per usage; there is no generative component — adjusting the stair-step pattern requires editing the SVG markup directly.
- The QR-block 8×8 cell pattern is hand-authored per usage; each instance places `.on` cells manually. There is no QR-code generation logic.
- The pixel-stack bar chart cell counts are hardcoded in markup; there is no data-binding layer translating numeric values to cell-on counts.
- The vertical-stack label column uses `writing-mode: vertical-rl`; this works in modern browsers but rendering of mixed Latin/CJK in this orientation may vary across rendering engines.
- The manifesto layout's italic-with-`.roman`-flip pattern (italic Newsreader body containing inline non-italic `.roman` spans for emphasis) is the inverse of typical italic emphasis — the rule lives in the manifesto-specific CSS and is not generalized.
- The 1.5px paper-color outset on the QR-block is a `box-shadow` used as an anti-shadow (it extends the paper fill outward to clear the grid behind the QR cells). This is the only `box-shadow` in the system and it should not be repurposed for elevation.
- The colophon's pixel-glitch column anchors to the left edge (mirroring the cover); other slides anchor to the right edge — the directionality is per-slide and should be considered when authoring new declarative layouts.
- The graph-paper grid cell size scales between 28–44px via `clamp` — at extreme aspect ratios, the grid count across the slide width may feel uneven.
- The system loads three Google Fonts families (Newsreader, Hanken Grotesk, DM Mono) with multiple weights — initial render requires successful font load to avoid Georgia/Helvetica fallback shifting the visual rhythm.
