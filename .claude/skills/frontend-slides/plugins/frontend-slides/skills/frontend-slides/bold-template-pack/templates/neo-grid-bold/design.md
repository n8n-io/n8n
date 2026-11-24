---
version: alpha
name: Neo-Grid Bold
description: A heavy editorial poster system built on a strict 12-column × 8-row block grid with neon-yellow accents on putty-ecru. Space Grotesk at weight 700 in strict uppercase carries every display moment; JetBrains Mono carries every label and metadata tag. Each slide reads as a magazine spread divided into colored panels — paper-ecru, ink-black, and electric lemon-yellow trading roles across cells. The aesthetic borrows from contemporary editorial print, brutalist annual reports, and the populist-poster end of design week showcases.

colors:
  paper: "#F5F4EF"
  bg: "#ECECE8"
  ink: "#0A0A0A"
  accent-lemon: "#E6FF3D"
  muted: "#8A8A85"
  stage-bg: "#1A1A1A"

color-aliases:
  line: ink
  primary-bg: bg
  card-bg: paper

typography:
  display:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 132px
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: -0.02em
    textTransform: uppercase
  title:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 88px
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -0.015em
    textTransform: uppercase
  subtitle:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.01em
    textTransform: uppercase
  section-num:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 320px
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: -0.05em
  stat-num:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 156px
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.03em
  stat-num-lg:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 240px
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: -0.04em
  stat-num-sm:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 96px
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.03em
  card-headline:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.01em
    textTransform: uppercase
  card-h3:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.005em
    textTransform: uppercase
  body:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.35
  body-sm:
    fontFamily: "Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 24px
    fontWeight: 400
    letterSpacing: 0.08em
    textTransform: uppercase
  label-sm:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 16px
    fontWeight: 400
    letterSpacing: 0.08em
    textTransform: uppercase
  label-xs:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    letterSpacing: 0.12em
    textTransform: uppercase
  pagenum:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 24px
    fontWeight: 400
    letterSpacing: 0.04em

spacing:
  frame-inset: 40px
  grid-gap: 12px
  grid-gap-lg: 18px
  card-pad-sm: "24px 28px"
  card-pad-md: "28px 32px"
  card-pad-lg: "36px 32px"
  card-pad-xl: "40px 44px"

canvas:
  width: 1920px
  height: 1080px

components:
  frame:
    position: "absolute; inset: 40px"
    display: grid
    gridTemplateColumns: "repeat(12, 1fr)"
    gridTemplateRows: "repeat(8, 1fr)"
    gap: "{spacing.grid-gap}"
    description: "The universal slide frame — a 12-column × 8-row CSS grid inset 40px from each slide edge with 12px gaps between cells. Every slide composes its layout by spanning cells inside this frame."
  card:
    background: "{colors.paper}"
    position: relative
    overflow: hidden
    description: "Generic colored panel. Paper is the default fill; .ink switches to black with paper text; .lemon switches to yellow with ink text; .photo switches to deep-black with white text for image regions."
  card-ink:
    background: "{colors.ink}"
    color: "{colors.paper}"
    description: "Inverted card — black background, paper text. Used as a contrast block in any composition."
  card-lemon:
    background: "{colors.accent-lemon}"
    color: "{colors.ink}"
    description: "Yellow accent card — full neon-yellow fill with ink text. The system's loudest signal."
  pagenum:
    position: "absolute; left: 0; bottom: 0"
    background: "{colors.paper}"
    color: "{colors.ink}"
    padding: "14px 22px"
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.04em
    description: "Bottom-left page-number tag in the format '01 / 12'. Three variants: default (paper bg), .invert (ink bg), .lemon (yellow bg)."
  corner-mark:
    position: "absolute; top: 22px; right: 22px"
    width: 36px
    height: 36px
    display: "grid 2x2"
    gap: 4px
    description: "Top-right 2x2 block mark — three solid currentColor squares plus one transparent. A small structural identity stamp."
  blockmark:
    width: 56px
    height: 56px
    display: "grid 2x2"
    gap: 4px
    description: "Larger 2x2 block stamp with diagonal squares filled — used as a brand mark on covers and dividers. May be sized 56px, 96px, or larger."
  qr-tile:
    width: 90px
    height: 90px
    display: "grid 5x5"
    description: "Decorative QR-pattern tile composed of a 5x5 grid of black squares with some accent-lemon squares interspersed. Decorative, not a real scannable code."
  table-cell:
    padding: "18px 22px"
    borderBottom: "1.5px solid {colors.ink}"
    borderRight: "1.5px solid {colors.ink}"
    fontSize: 24px
    lineHeight: 1.35
    description: "Comparison-matrix cell. Solid hairline ink dividers on bottom and right; last column has no right border."
  table-head-row:
    background: "{colors.ink}"
    color: "{colors.paper}"
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 14px
    letterSpacing: 0.12em
    textTransform: uppercase
    description: "Inverted table header — black row with paper mono uppercase text."
  pill-yes:
    background: "{colors.accent-lemon}"
    color: "{colors.ink}"
    padding: "6px 14px"
    description: "Affirmative pill in a comparison cell — yellow fill, ink text, mono uppercase."
  pill-part:
    background: "{colors.paper}"
    color: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
    description: "Partial-state pill — paper fill, ink border, ink text."
  pill-no:
    background: "{colors.ink}"
    color: "{colors.paper}"
    description: "Negative pill — black fill, paper text."
  arrow:
    width: 64px
    height: 64px
    description: "Inline SVG arrow glyph (right-pointing) at 64px square. Used as a flow indicator between process steps and as an out-of-cell pointer on stat cards."
  highlight-mark:
    background: "{colors.accent-lemon}"
    color: "{colors.ink}"
    padding: "0 6px"
    description: "Inline <mark> element — yellow background swatch wrapping one or more words inside a headline for emphasis."
  bar-fill-ink:
    background: "{colors.ink}"
    description: "Solid black vertical bar for chart series A."
  bar-fill-lemon:
    background: "{colors.accent-lemon}"
    border: "1.5px solid {colors.ink}"
    description: "Yellow vertical bar with ink border for chart series B."
  copyright:
    position: "absolute; left: 22px; bottom: 22px"
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 16px
    lineHeight: 1.4
    color: "{colors.ink}"
    opacity: 0.85
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Neo-Grid Bold is a **heavy editorial poster system** built on a single structural premise: every slide is a 12-column × 8-row CSS grid inset 40px from the slide edges, with 12px gaps between cells. Composition happens by assigning colored panels to grid spans — `grid-column: 4 / span 5` and `grid-row: 1 / span 5` is how layout is described. The grid is rigid; the visual variety comes from how panels of `{colors.paper}`, `{colors.ink}`, and `{colors.accent-lemon}` are arranged across cells.

The typeface stack is intentionally narrow. **Space Grotesk** at weight 700 carries every display moment in strict uppercase with negative letter-spacing. Body copy runs at weight 400 in mixed case. **JetBrains Mono** at weight 400 carries every label, page number, axis tag, and metadata string — always uppercase with 0.08–0.12em positive tracking. There is no third face. The contrast between heavy Space Grotesk uppercase and JetBrains Mono uppercase is the system's primary typographic rhythm.

The palette has three working colors plus a putty surface. **Paper** (`{colors.paper}` — a warm ecru off-white) is the default panel fill. **Ink** (`{colors.ink}` — a near-black) is the structural color: text on paper, fills for inverted panels, all dividers, all rules. **Accent Lemon** (`{colors.accent-lemon}` — an electric neon-yellow #E6FF3D) is the loud signal — used as panel fill, as a highlight `<mark>` swatch inside headlines, and as the second series in charts. **Putty BG** (`{colors.bg}`) is the slightly cooler ecru that sits behind the 40px slide inset, framing the composition like a passe-partout. **Muted graphite** is present in the token list but rarely used in practice.

Depth is created entirely through **panel adjacency and color contrast**, not shadows. Cards do not carry box-shadows; cards do not have rounded corners; cards do not have borders (except for table cells and pill outlines, which use 1.5px solid ink). The visual weight of a slide is determined by how many cells are filled with `{colors.ink}` vs. `{colors.accent-lemon}` vs. `{colors.paper}`. A composition with three yellow panels reads as much more aggressive than one with a single yellow panel.

**Density philosophy: dense.** Neo-Grid Bold reads as authoritative when the 12×8 grid is fully populated with panels of varying span and color. A slide with only one or two panels and large empty grid areas reads as broken; the system was designed as an editorial poster, and posters are dense. The expected pattern is 4–8 panels per slide, each occupying a non-trivial cell span, with the grid fully used corner-to-corner. The exception is a section-divider slide where a single 320px section number occupies an entire pane of the grid — but even there, the rest of the canvas is filled with a second panel of contrasting color.

**Key Characteristics:**
- Universal 12-column × 8-row CSS grid (`{components.frame}`) inset 40px from each slide edge, with 12px gaps between cells.
- Three-color panel system: paper ecru (`{colors.paper}`) as default, ink black (`{colors.ink}`) for inverted blocks, accent lemon (`{colors.accent-lemon}`) for signal blocks.
- Space Grotesk weight 700 uppercase with negative letter-spacing for every display element.
- JetBrains Mono uppercase with 0.08–0.12em tracking for every label, page number, axis tag.
- A signature corner-mark and blockmark — small 2×2 block stamps that act as decorative identity tags.
- Inline `<mark>` element that wraps words inside a headline in a neon-yellow swatch — the system's headline emphasis mechanism.
- A persistent page-number tag (`{components.pagenum}`) anchored bottom-left of every slide.
- No rounded corners, no drop shadows, no gradients (apart from photo-region stylized noise textures).
- Stat numerals scale up to 240px and even 320px — type is allowed to dominate entire panels.

## Colors

### Palette

- **Paper** (`{colors.paper}` — #F5F4EF): Warm ecru off-white. The default panel fill, the default text color when inverted, and the canvas of any "neutral" card. Slightly creamier than pure white — chosen so the neon-yellow accent doesn't vibrate against it.
- **BG (Putty)** (`{colors.bg}` — #ECECE8): A cooler ecru that sits behind the 40px slide inset, framing the grid composition like a passe-partout. The 40px border of putty around every slide is the system's universal frame.
- **Ink** (`{colors.ink}` — #0A0A0A): The structural near-black. Used for all text on paper, all inverted panel fills, all dividers, all table cell borders, all pill outlines. Not pure #000 — slightly softer.
- **Accent Lemon** (`{colors.accent-lemon}` — #E6FF3D): Electric neon-yellow. The signal color. Used as a panel fill, as the inline `<mark>` highlight swatch inside headlines, as the second chart series, as the affirmative pill fill, and as page-number variant background. Never as a text color (the yellow is too light to read as type against any surface).
- **Muted** (`{colors.muted}` — #8A8A85): A reserved graphite tone present in the token list but used only at low opacity on photo-region tags. Available for de-emphasized text but rarely deployed.
- **Stage BG** (`{colors.stage-bg}` — #1A1A1A): The viewport background outside the 1920×1080 slide canvas. This is the deck-stage container color, not part of slide design.

### Defaults

- **Default slide canvas background**: `{colors.bg}` — visible as the 40px putty frame around every grid composition.
- **Default panel fill**: `{colors.paper}`. When in doubt, a panel is paper.
- **Default primary headline color**: `{colors.ink}` on paper or lemon panels; `{colors.paper}` on ink panels.
- **Default body text color**: `{colors.ink}` on paper/lemon; `{colors.paper}` on ink.
- **Default label / metadata color**: `{colors.ink}` on paper, at opacity 0.7–0.85 to mute; `{colors.paper}` on ink, at opacity 0.7–0.85.
- **Default chart series color**: `{colors.ink}` for series A; `{colors.accent-lemon}` for series B (with 1.5px ink border).
- **Default emphasis mechanism inside a headline**: wrap in `<mark>` for a neon-yellow swatch on ink text. This is the system's primary headline-level emphasis.
- **Default affirmative state**: `{colors.accent-lemon}` fill. Default negative state: `{colors.ink}` fill. Default neutral state: `{colors.paper}` fill with `{colors.ink}` border.

Neon yellow is the system's only chromatic accent — never substitute red, blue, or any third color. Yellow's role is to draw the eye, not to communicate meaning (it is not "warning" or "highlight" in the semantic sense; it is simply the signal).

## Typography

### Font Family

The system uses two web fonts: **Space Grotesk** (weights 400, 500, 700) for all display and body, and **JetBrains Mono** (weights 400, 500) for all labels and metadata. There is no third face — no serif, no italic, no display script. The system's character lives in the weight contrast between Space Grotesk 700 uppercase and Space Grotesk 400 mixed case, plus the structural mono labels in JetBrains Mono.

A specific inline mixing rule: **the `<em>` tag inside a Space Grotesk headline switches color to `{colors.accent-lemon}` and stays upright** (font-style is normalized to non-italic). Em is repurposed as a yellow inline color switch, like the `<mark>` swatch but without the background fill.

A second inline mixing rule: **the `<mark>` element wraps words inside a Space Grotesk headline in a neon-yellow swatch with 0 6px padding**, creating the highlighter-pen emphasis that is a recurring signature of the system.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.section-num}` | 320px | Space Grotesk | 700 | Hero section ordinal in a section-divider panel |
| `{typography.stat-num-lg}` | 240px | Space Grotesk | 700 | Featured large numerical stat |
| `{typography.stat-num}` | 156px | Space Grotesk | 700 | Standard stat numeral |
| `{typography.display}` | 132px | Space Grotesk | 700 | Cover, section, or hero display headline |
| `{typography.stat-num-sm}` | 96px | Space Grotesk | 700 | Compact stat numeral inside a small card |
| `{typography.title}` | 88px | Space Grotesk | 700 | Primary content-slide headline |
| `{typography.subtitle}` | 56px | Space Grotesk | 700 | Secondary headline, region heading |
| `{typography.card-headline}` | 44px | Space Grotesk | 700 | Card title at panel-fill scale |
| `{typography.card-h3}` | 30px | Space Grotesk | 700 | Sub-headline inside a smaller card |
| `{typography.body}` | 28px | Space Grotesk | 400 | Body paragraph inside a feature card |
| `{typography.label}` | 24px | JetBrains Mono | 400 | Standard mono label or kicker |
| `{typography.body-sm}` | 22px | Space Grotesk | 400 | Compact body inside dense cards |
| `{typography.pagenum}` | 24px | JetBrains Mono | 400 | Page-number tag (e.g. "01 / 12") |
| `{typography.label-sm}` | 16px | JetBrains Mono | 400 | Secondary metadata label, copyright text |
| `{typography.label-xs}` | 14px | JetBrains Mono | 400 | Axis labels, table header text, fine print |

### Defaults

- **Default primary section headline**: `{typography.title}` (88px) — the workhorse content-slide headline.
- **Default cover or section-opening display**: `{typography.display}` (132px) for a cover; `{typography.section-num}` (320px) for a section-divider ordinal.
- **Default body paragraph size**: `{typography.body}` (28px). For dense multi-card slides, drop to `{typography.body-sm}` (22px).
- **Default label / metadata size**: `{typography.label}` (24px) for standalone mono tags; `{typography.label-sm}` (16px) for inline metadata.
- **Default stat numeral**: `{typography.stat-num}` (156px). Reach for `{typography.stat-num-lg}` (240px) only when the stat occupies an entire featured panel.
- **Default weight for any display element**: 700. Display in any other weight does not exist in this system.
- **Default weight for body**: 400.

When unsure, reach for `{typography.title}` for the slide's primary text moment and pair it with `{typography.body}` for supporting copy.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Space Grotesk display, title, subtitle, card-headline, and stat numeral is uppercase** with negative letter-spacing (-0.005 to -0.05em depending on scale). Mixed-case display does not exist in this system.
- **Body copy is mixed case at weight 400.** Never uppercase body.
- **Every JetBrains Mono element is uppercase** with at least 0.08em positive tracking.
- **The `<mark>` element inside a headline always uses `{colors.accent-lemon}` background with `{colors.ink}` text and 0 6px padding.** The yellow highlighter swatch is the system's headline emphasis signal.
- **The `<em>` element inside a headline switches to `{colors.accent-lemon}` color and stays upright (font-style: normal).** Italic letterforms are not used.
- **Negative letter-spacing scales with size**: smaller headlines use -0.005em to -0.015em; larger displays use -0.02 to -0.05em. The tighter the tracking, the more compressed and brutalist the headline reads — at 320px size, -0.05em is correct.
- **Page numbers are always JetBrains Mono at 24px with 0.04em tracking** in the format `01 / 12` with a single padded zero and slash separator.

### Typography Principles

The rhythm is **heavy uppercase display + light mixed-case body + small uppercase mono label**. Switching any of those three modes breaks the editorial register. Body in uppercase reads as a shouting paragraph. Display in mixed case reads as a different design system. Mono in mixed case reads as code, not editorial metadata.

Italic letterforms are not used. The `<em>` and `<mark>` tags are repurposed as color/highlight switches, not italic emphasis. Underline is not used. Bold inside body text is not used — emphasis is achieved by isolating the headline in its own cell.

## Layout

### Canvas System

The system targets a **fixed 1920×1080 canvas** rendered inside a `<deck-stage>` web component that handles scaling to fit the viewport. All sizes are in `px` (not vw/vh) — typography sizes, padding values, grid gaps, and inset values are all pixel-fixed. The composition is designed at 1920×1080 and the stage scales the entire deck proportionally.

The viewport background outside the deck stage is `{colors.stage-bg}` (#1A1A1A) — a dark gray frame that visually anchors the bright slide against the browser chrome.

### The Universal Frame

Every slide carries a `.frame` div positioned `absolute; inset: 40px` with `display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: repeat(8, 1fr); gap: 12px`. This is the structural constant of the system: a 12-column × 8-row grid with 12px gaps, inset 40px from the slide edges. Some slide variants increase the grid gap to 16–18px for breathing room, but the column/row counts and the 40px inset never change.

Composition happens entirely by spanning cells inside this grid. A panel occupying `grid-column: 1 / span 4; grid-row: 1 / span 3` is a 4-cell-wide × 3-row-tall card in the upper-left. The grid is the only layout language — flexbox is used only for internal alignment inside a single cell.

### Padding Inside Cells

Internal padding inside a cell varies with cell size and purpose:
- Compact cards (small stat tiles): 24px × 28px
- Standard cards (feature panels): 28px × 32px
- Large cards (chapter panels): 36px × 32px
- Hero cards (section dividers): 40px × 44px

These are not rigid tokens — they're a practical scale. Choose the padding that gives the card's internal type room to breathe without losing the panel's identity.

### Persistent Chrome

Every slide carries a `{components.pagenum}` tag bottom-left in the format `01 / 12`. Three variants:
- Default: paper background, ink text.
- `.invert`: ink background, paper text.
- `.lemon`: yellow background, ink text.

Some slides also carry a `{components.corner-mark}` (small 2×2 block) top-right, a `{components.copyright}` bottom-left, or a `{components.blockmark}` (larger 2×2 stamp) as a brand identifier.

## Depth and Elevation

### No Shadows, Color-Block Adjacency Only

The system uses **zero box-shadow declarations** on any structural panel. Depth is entirely a function of color adjacency: a paper panel next to an ink panel reads as elevated (paper toward viewer); a yellow panel next to an ink panel reads as the loudest signal in the composition. The 12px grid gap between panels reveals the putty `{colors.bg}` between cells, which acts as a unifying frame color.

### No Gradients (Except Photo Regions)

The only gradients in the system are inside photo-region placeholder textures, where a `radial-gradient` plus a `repeating-linear-gradient` creates a stylized B&W-grain texture as a stand-in for photography. These textures live inside cells classed `.photo` or `.ph`, never on a structural panel.

### Borders on Tables and Pills

- Table cells (`{components.table-cell}`) use 1.5px solid ink dividers on bottom and right edges to create a wireframe grid.
- Comparison pills (`{components.pill-part}`) use a 1.5px solid ink border as the partial-state outline.
- Chart axes use 2px solid ink as the bottom-left wireframe.
- The yellow bar in a bar chart (`{components.bar-fill-lemon}`) carries a 1.5px solid ink border to prevent the bright fill from vibrating against the paper background.

No other elements carry borders. Cards are borderless and rely on fill contrast.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0px | Every element — cards, pills, tags, page numbers, table cells, chart bars, blockmarks |

The system has **zero border-radius** on any element. Every shape is a strict rectangle or square. The block-stamp and corner-mark glyphs are composed of right-angle squares.

### Border Weights

- **1.5px solid `{colors.ink}`** — used on table cell dividers, pill outlines, and the yellow bar's border. The most common border weight.
- **2px solid `{colors.ink}`** — used on chart axes (left and bottom of the plot area) for slightly stronger wireframe.

No other border weights exist. There are no muted-color borders, no dashed borders (except a very specific `1px dashed rgba(0,0,0,.18)` chart grid line used internally).

### Decorative Element Types

**Block stamp (`{components.blockmark}`)** — A 2×2 grid of small squares with the top-left and bottom-right cells filled (and the other two transparent). A diagonal-fill stamp that acts as a brand identity mark. Sized from 36px (corner-mark) up to 96px (block stamp on quote slides). May render in ink or accent-lemon.

**Corner mark (`{components.corner-mark}`)** — A 36px × 36px version of the block stamp anchored top-right of a panel. Acts as a small structural identity tag.

**QR tile (`{components.qr-tile}`)** — A 5×5 grid of small squares with a checkerboard-like pattern of ink and accent-lemon fills. Decorative QR-pattern visual, not a real scannable code. Used as a cover-slide flourish.

**Arrow (`{components.arrow}`)** — An inline SVG right-pointing arrow at 64px × 64px (or 24px × 24px for small flow indicators). Used as a flow signal between process steps and as an out-pointing indicator on stat panels.

**Highlight mark (`{components.highlight-mark}`)** — A neon-yellow swatch wrapping one or more words inside a headline via the `<mark>` element. The system's headline emphasis mechanism. Padding is `0 6px` (or `0 8px` at larger sizes).

**Page number (`{components.pagenum}`)** — Bottom-left position-tag in the format `01 / 12` with a colored background. The three background variants (paper, ink, lemon) let the page number adapt to whichever color is most visible against the active slide's dominant panels.

**Photo region** — A cell classed `.photo` with a deep-black background (#111) containing a `.ph` child that renders a stylized B&W noise texture (radial + diagonal stripes). A small mono tag inside the cell labels the region (e.g., "PORTRAIT / B&W"). Used as a placeholder until real photography arrives.

**Pills (`{components.pill-yes}`, `{components.pill-part}`, `{components.pill-no}`)** — Inline mono uppercase labels in a comparison cell with three color states: yellow fill (affirmative), paper with ink border (partial), ink fill with paper text (negative). All three are 0-radius rectangles, not rounded pills despite the name.

**Section ordinal panel** — A panel containing a 320px Space Grotesk weight-700 numeral as the entire content. Used as the visual identity of a section-divider slide; the rest of the slide carries a complementary headline panel in ink.

**Chart bar pair** — Vertical bars in groups of two (series A in solid ink, series B in yellow with ink border). The bars share equal width inside their column and the column gap is set by the parent grid.

## Do's and Don'ts

### Do
- Compose every slide on the 12-column × 8-row grid (`{components.frame}`) with 40px inset and 12px (or 18px for breathing room) gaps. The grid is the system's identity.
- Fill the grid corner to corner. The system reads as authoritative when the grid is densely populated with panels of varying span.
- Use `{colors.paper}` as your default panel fill, `{colors.ink}` for contrast blocks, and `{colors.accent-lemon}` for one to three signal panels per slide.
- Set every display, title, subtitle, and stat numeral in Space Grotesk 700 uppercase with negative letter-spacing. The combination is the system's typographic voice.
- Use `<mark>` inside a headline to wrap one or more words in a yellow highlighter swatch — the system's primary headline emphasis.
- Use `<em>` inside a headline to switch one word to accent-lemon color (stays upright, no italic).
- Place a `{components.pagenum}` tag bottom-left of every slide. Choose the background variant (paper / ink / lemon) that contrasts with the lower-left panel.
- Use JetBrains Mono uppercase with at least 0.08em tracking for every label, page number, axis tag, and metadata string.
- Render pills (yes / part / no) in their canonical three-color treatment inside comparison tables.
- Allow stat numerals to scale to 156–320px when they occupy a featured panel. Large numbers are part of the editorial poster identity.

### Don't
- Don't add box-shadow to any panel. Depth comes from color adjacency only.
- Don't round any corner on any element. The system is strictly rectangular.
- Don't put display headlines in mixed case. Space Grotesk display is always uppercase.
- Don't put body copy in uppercase. Mixed case at weight 400 is the body voice.
- Don't introduce a second accent color. Neon yellow is the only chromatic accent — adding red, blue, or green breaks the system.
- Don't use the yellow as a text color. The accent is too light to read as type; it's a fill color only.
- Don't compose layouts outside the 12×8 grid. Absolutely-positioned elements that break the grid (page number, corner mark, copyright) are explicitly the only exceptions.
- Don't use italic letterforms. The `<em>` tag is repurposed as a color switch — italic visual style does not exist here.
- Don't use rounded "pill" shapes despite the pill component naming. Pills are 0-radius rectangles.
- Don't sparsely populate the grid. A slide with one panel and seven empty cells reads as broken — the system needs density to function as an editorial poster.

## Responsive Behavior

The system targets a **fixed 1920×1080 canvas** rendered inside a `<deck-stage>` web component (loaded via `deck-stage.js`). The stage scales the entire 1920×1080 composition proportionally to fit the browser viewport — type sizes, panel positions, grid gaps, and inset values are all pixel-fixed inside the canvas, and the stage handles the responsive transform.

This means: every typographic and layout decision in the system is made at 1920×1080 resolution. Sizes do not scale per breakpoint; the entire canvas scales as a single unit. There are no media queries inside slide styles.

### Presenter Behavior
- The `<deck-stage>` web component manages slide-to-slide navigation, viewport scaling, and presenter chrome.
- Keyboard navigation, touch swipe, and mouse wheel are handled by the stage component, not by inline scripts.
- The slide canvas is constant 1920×1080 regardless of browser viewport; the stage proportionally scales it.

### Frontend Slides Integration Note

When using this design system inside the `frontend-slides` skill, preserve the
fixed 1920×1080 canvas model. Do not translate the 12-column × 8-row grid,
fixed typography, and fixed spacing into independent viewport-responsive
`clamp()` values. That breaks the relationship between panel size and type
scale, especially with CJK text, and can create clipping even when the original
template would have scaled cleanly.

The safe single-file implementation is:

1. Render each slide as a 1920×1080 `.stage`.
2. Scale that stage proportionally to fit the current viewport.
3. Keep the internal `.frame` grid at `inset: 40px`, `12` columns, `8` rows,
   and `12px` gaps.
4. Fit content at the 1920×1080 design size first, then scale the whole stage.
5. Verify both text overflow and panel overlap in the rendered browser. A
   `scrollHeight` check can pass while one grid panel visually covers another.

### Print Behavior
The template uses the deck-stage component for rendering. Print export depends on the component's print handling, which may render slide-per-page or capture the active slide only.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face | Chinese face | Weight |
|---|---|---|---|
| Display / title / stat (Space Grotesk 700 UPPERCASE) | Space Grotesk | Noto Sans SC (思源黑体) | 900 |
| Body (Space Grotesk 400) | Space Grotesk | Noto Sans SC | 400 |
| Label / page number (JetBrains Mono UPPERCASE) | JetBrains Mono | Noto Sans SC | 400 (do not force monospace on CJK) |

### Mixed-Content Strategy

Strategy A — single `font-family` stack with Latin-first fallback. Update each token's `fontFamily` from `"Space Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"` to `"Space Grotesk, Noto Sans SC, Helvetica Neue, Helvetica, Arial, sans-serif"`. Latin glyphs render in Space Grotesk 700; CJK characters fall through to Noto Sans SC 900 automatically. Mixed strings like `THE CLAUDE 模型` render correctly inline.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

- Line-height: body 1.75–1.85, display 1.15–1.25
- Letter-spacing: 0 on CJK
- Text-transform: no uppercase on CJK
- Full-width punctuation （，。：；！？「」（））
- No period on display headlines (Chinese typography convention)
- Pangu spacing 盘古之白 (space between CJK and Latin: `使用 Claude` not `使用Claude`)
- One font per sentence

### Aesthetic Notes for This System

Neo-Grid Bold is heavy uppercase Space Grotesk 700 with negative letter-spacing at sizes up to 320px. **Chinese has no concept of uppercase**, so the system's primary typographic signature (uppercase brutalist headlines) must transfer through *weight and density* instead. Set every Chinese display moment in **Noto Sans SC 900** — the heaviest available weight — to match the visual weight of Space Grotesk 700 ALL CAPS at large sizes. Chinese headlines should also drop the negative letter-spacing entirely; CJK glyphs are designed on a square em-box and tightening them causes glyph collision.

The `<mark>` neon-yellow swatch highlighting one word inside a headline is a perfect transfer to Chinese — wrap one CJK character or one phrase in `<mark>` and the lemon swatch reads the same. **Keep the highlighter mechanism as the system's primary headline emphasis in CJK.** The `<em>` color switch (yellow inline) also transfers cleanly.

JetBrains Mono uppercase labels (page numbers in `01 / 12` format) are pure Latin / numeric — keep them in JetBrains Mono. Don't try to render Chinese in monospace; CJK glyphs are already monospaced by design and forcing JetBrains Mono produces missing glyphs. For mixed mono labels containing CJK, fall through to Noto Sans SC 400 at the same size.

Section numerals (320px Space Grotesk 700) and stat numerals (156–240px) are pure digits — they transfer unchanged. The neon-yellow accent panel system is script-agnostic; the brutalist poster aesthetic survives the script switch as long as the weight stays at 900.

### Known CJK Gap

The negative letter-spacing (-0.005 to -0.05em) scales with display size in this system and is part of the "brutalist compressed" signature. **Removing it for Chinese characters breaks visual parity with Latin slides in a mixed deck.** Accept this: pure-CJK slides will read as slightly less compressed than pure-Latin slides. Don't try to compensate by tightening Chinese — glyph collision is a worse failure than tonal mismatch.

## Iteration Guide

1. Every new slide composes its layout on the 12×8 grid via `grid-column` and `grid-row` span declarations. Never break the grid with absolute positioning except for the page-number tag, corner-mark, and copyright stamp.
2. Every new panel uses one of three fill colors: paper (default), ink (inverted), or accent-lemon (signal). Don't introduce a fourth panel color.
3. Every new display headline is Space Grotesk weight 700 uppercase with negative letter-spacing scaled to the headline size (-0.005em at 30px, up to -0.05em at 320px).
4. Every new body element is Space Grotesk weight 400 mixed case at one of the three body sizes (28px, 24px, 22px).
5. Every new label or metadata tag is JetBrains Mono uppercase with at least 0.08em tracking.
6. Every new chart-series color is either `{colors.ink}` (series A) or `{colors.accent-lemon}` with an ink border (series B). Don't add a third series color.
7. Every new card uses 0 border-radius. Square corners are non-negotiable.
8. To emphasize a word inside a headline, wrap it in `<mark>` for a yellow swatch or `<em>` for a yellow color switch. Don't use bold, italic, or underline.
9. Every new comparison cell uses the three-state pill system: yellow fill (yes), paper with ink border (partial), ink fill (no).
10. Densely populate the grid. If a composition leaves more than two cells empty in a row, reconsider whether a card is missing.

## Known Gaps

- The system relies on a `<deck-stage>` web component loaded via `deck-stage.js`. Without this script, the 1920×1080 canvas will not scale to the viewport and slides will render at native pixel size.
- Photo regions use stylized CSS-generated noise textures (radial + diagonal stripe gradients) as placeholders. Real photography must be inserted by replacing the `.photo` cell contents with an `<img>` and ensuring the surrounding panel colors complement the photo's negative space.
- The QR-pattern tile is decorative — the 5×5 grid of squares does not encode a real scannable code. Real QR codes would need a separate SVG generated externally.
- Bar chart heights are set via inline `style="height: XX%"` declarations on each bar fill. There is no data-binding layer.
- The arrow SVG used between process steps is hand-pathed inside each slide template; if a slide adds or removes process nodes, the arrow positions must be recomputed manually.
- The `<deck-stage>` component is not loaded directly by this template's script tag — it's expected to be globally available via `deck-stage.js`. Missing the script will silently render slides as flat absolute-positioned divs.
- The system uses fixed pixel sizes throughout (no `vw`/`vh`). At unusual viewport aspect ratios, the deck-stage proportional scaling may letterbox the canvas with putty bars.
- The `{colors.muted}` (#8A8A85) token is defined but used only in low-opacity overlays on photo region tags — it has no role in the main type or panel system.
