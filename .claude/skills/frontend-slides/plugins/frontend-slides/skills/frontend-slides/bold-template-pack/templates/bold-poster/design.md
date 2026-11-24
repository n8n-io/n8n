---
version: alpha
name: Bold Poster
description: "A populist editorial poster system that mashes vintage Italian sports-magazine display lettering with classical serif body and tight monospace metadata. The display face is Shrikhand — a heavy slab/script hybrid with playful italic personality — rendered at poster scale (often 200-320px) and routinely tilted off-axis. Body runs Libre Baskerville for a literary editorial register; Space Grotesk handles tiny uppercase labels and chrome. The palette is uncompromising: white canvas, deep brown-black ink (#1C1410), single saturated tomato red (#D8000F), and a warm off-white (#F5F2EF) for alternating panels. Borders are bold 1.5-3px ink rules; the only shadow is a single stacked offset behind red display text. The aesthetic is loud, confident, and unmistakably print-poster — closer to a 1970s European brand annual report or a wine merchant's catalogue than a contemporary slide deck."

colors:
  bg: "#FFFFFF"
  dark: "#1C1410"
  red: "#D8000F"
  light: "#F5F2EF"

typography:
  hero-title:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(72px, 16vw, 220px)"
    lineHeight: 0.88
    letterSpacing: 1px
    color: "{colors.dark}"
  hero-title-red:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(84px, 18vw, 260px)"
    lineHeight: 0.85
    color: "{colors.red}"
    transform: "rotate(-4deg)"
  hero-title-bottom:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(64px, 14vw, 200px)"
    lineHeight: 0.9
    color: "{colors.dark}"
    transform: "rotate(2deg)"
  close-big:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(80px, 18vw, 260px)"
    lineHeight: 0.88
    color: "{colors.red}"
    transform: "rotate(-5deg)"
  stat-big:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(120px, 26vw, 320px)"
    lineHeight: 0.82
    color: "{colors.red}"
    transform: "rotate(-6deg)"
  red-quote:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(32px, 7vw, 90px)"
    lineHeight: 1.15
    color: "{colors.bg}"
    textShadow: "2px 2px 0 rgba(28,20,16,0.25), 4px 4px 0 rgba(28,20,16,0.2), 6px 6px 0 rgba(28,20,16,0.15)"
  section-header:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(32px, 5vw, 64px)"
    lineHeight: 1
    color: "{colors.dark}"
  section-header-lg:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(36px, 6vw, 72px)"
    lineHeight: 1
    color: "{colors.dark}"
  cell-number-lg:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(28px, 3.5vw, 52px)"
    lineHeight: 1
    color: "{colors.red}"
  cell-number-md:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(28px, 3.5vw, 48px)"
    lineHeight: 1
    color: "{colors.red}"
  card-title:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(22px, 3vw, 36px)"
    lineHeight: 1.1
    color: "{colors.dark}"
  card-title-sm:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(20px, 2.5vw, 32px)"
    lineHeight: 1.1
    color: "{colors.dark}"
  pillar-num:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(36px, 5vw, 64px)"
    lineHeight: 1
    color: "{colors.red}"
  pillar-title:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(18px, 2.2vw, 28px)"
    lineHeight: 1.15
    color: "{colors.dark}"
  stat-item-num:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(28px, 4vw, 56px)"
    lineHeight: 1
    color: "{colors.dark}"
  roadmap-title:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(18px, 2.5vw, 32px)"
    lineHeight: 1.1
  inline-stat:
    fontFamily: "'Shrikhand', cursive"
    fontWeight: 400
    fontSize: "clamp(18px, 2vw, 28px)"
    lineHeight: 1
    color: "{colors.red}"
  body:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(13px, 1.2vw, 16px)"
    lineHeight: 1.75
    color: "{colors.dark}"
  body-card:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(12px, 1.1vw, 14px)"
    lineHeight: 1.6
    color: "{colors.dark}"
  body-cell:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(11px, 1vw, 13px)"
    lineHeight: 1.55
    color: "{colors.dark}"
  body-small:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(11px, 1vw, 13px)"
    lineHeight: 1.5
    color: "{colors.dark}"
  hero-meta:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(11px, 1vw, 14px)"
    lineHeight: 1.5
    color: "{colors.dark}"
  tag-body:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(13px, 1.2vw, 16px)"
    lineHeight: 1.6
    color: "{colors.dark}"
  red-cite:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(13px, 1.3vw, 16px)"
    lineHeight: 1.5
    color: "{colors.bg}"
  close-sub:
    fontFamily: "'Libre Baskerville', serif"
    fontWeight: 400
    fontSize: "clamp(14px, 1.5vw, 18px)"
    lineHeight: 1.6
    color: "{colors.dark}"
  label:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 10px
    letterSpacing: 2px
    textTransform: uppercase
    color: "{colors.dark}"
  label-red:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 10px
    letterSpacing: 2px
    textTransform: uppercase
    color: "{colors.red}"
  rm-label:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 9px
    letterSpacing: 3px
    textTransform: uppercase
    color: "{colors.red}"
  tag-label:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(10px, 0.9vw, 12px)"
    letterSpacing: 3px
    textTransform: uppercase
    color: "{colors.red}"
  bullet-body:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 400
    fontSize: "clamp(10px, 0.9vw, 12px)"
    lineHeight: 1.45
    color: "{colors.dark}"
  counter:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 11px
    lineHeight: 1
    letterSpacing: 2px
    textTransform: uppercase
    color: "{colors.dark}"
  link:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(10px, 0.9vw, 12px)"
    letterSpacing: 2px
    textTransform: uppercase
    color: "{colors.dark}"
  fc-micro:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 400
    fontSize: 10px
    lineHeight: 1.4
    color: "{colors.dark}"

spacing:
  pad-slide: "48px 56px"
  pad-cell: "22px 20px"
  pad-cell-sm: "20px 24px"
  pad-pillar: "32px 24px"
  pad-card: "24px"
  pad-roadmap: "40px 48px"
  gap-grid-md: "24px 32px"
  gap-grid-roadmap: "28px 36px"
  gap-grid-stats: "48px"
  gap-stat-row: "20px"
  pad-bottom-clearance: "40px"
  max-width-content: 1100px
  max-width-services: 1000px

canvas:
  width: 100vw
  height: 100vh
  background: "{colors.bg}"

components:
  progress-bar:
    position: "fixed, bottom 0 left 0"
    height: 5px
    background: "{colors.red}"
    description: "Persistent thick red progress strip at the bottom of the viewport. Width grows linearly with slide index. The system's most prominent piece of chrome."
  counter:
    position: "fixed, bottom 18px right 24px"
    color: "{colors.dark}"
    opacity: 0.5
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: 11px
    letterSpacing: 2px
    description: "Persistent slide counter NN / NN at 50% opacity in Space Grotesk uppercase."
  hint-pill:
    position: "fixed, bottom 18px center"
    background: "{colors.light}"
    padding: "6px 14px"
    borderRadius: 4px
    fontSize: 10px
    opacity: 0
    description: "Bottom-center hint pill that fades to 50% opacity on body hover. Subtle wayfinding only."
  section-bordered-grid:
    border: "3px solid {colors.dark}"
    description: "Heavy 3px ink border enclosing a grid of cells. Each child cell carries a 1.5px ink inner border, producing a hairline-on-heavy double-border tabular grid. Used for financial-figure and summary-highlight grids."
  cell-bordered:
    border: "1.5px solid {colors.dark}"
    padding: "22px 20px"
    description: "Tabular cell with 1.5px ink border. Lives inside a 3px-bordered parent grid; the two border weights touch to produce the system's signature grid-with-double-edge."
  red-leftbar-card:
    borderLeft: "4px solid {colors.red}"
    paddingLeft: 18px
    description: "Service or content card marked by a 4px solid red left rule and 18px left padding. The system's editorial card pattern — no outline, just the red rule signaling the start of a block."
  red-leftbar-card-thin:
    borderLeft: "3px solid {colors.red}"
    paddingLeft: 16px
    description: "Thinner variant of the red-leftbar card used on dark surfaces (roadmap phases). Same pattern, scaled-down rule weight."
  bullet-em-dash:
    glyph: "—"
    color: "{colors.red}"
    fontWeight: 700
    paddingLeft: 14px
    description: "List bullet using a red em-dash (—) glyph in place of a disc. The dash sits at position absolute left and the body text indents to clear it."
  bullet-bullet:
    glyph: "•"
    color: "{colors.red}"
    paddingLeft: 12px
    description: "List bullet using a red round bullet (•) glyph. Same indent pattern as the em-dash variant."
  pillar-panel:
    flex: 1
    padding: "32px 24px"
    borderRight: "3px solid {colors.dark}"
    description: "Vertical column panel inside a multi-pillar layout. Each pillar separated by a 3px ink vertical rule. Alternating panels swap background from {colors.bg} to {colors.light} for striping."
  pillar-bullet-row:
    padding: "5px 0"
    borderBottom: "1px solid rgba(28, 20, 16, 0.08)"
    description: "Bullet row inside a pillar with a hairline-soft bottom border (ink at 8%) separating items. The last item drops the border."
  global-card:
    border: "2px solid {colors.dark}"
    padding: 24px
    description: "Bordered information card with 2px ink outline. Used on the global presence layout. Heavier than the leftbar pattern, more contained."
  stacked-text-shadow:
    textShadow: "2px 2px 0 rgba(28,20,16,0.25), 4px 4px 0 rgba(28,20,16,0.2), 6px 6px 0 rgba(28,20,16,0.15)"
    description: "Three-step decreasing-opacity stacked offset shadow in ink. Applied only to large red display text on red panels. The system's only shadow treatment."
  red-panel:
    background: "{colors.red}"
    color: "{colors.bg}"
    description: "Full-bleed saturated red panel surface. Carries white text with the stacked-text-shadow treatment on display."
  dark-panel:
    background: "{colors.dark}"
    color: "{colors.bg}"
    description: "Full-bleed deep brown-black panel surface. Carries white text and red accents (left bars, mono labels)."
  link-underline:
    color: "{colors.dark}"
    borderBottom: "2px solid {colors.red}"
    paddingBottom: 4px
    description: "Footer link style — Space Grotesk uppercase with a 2px red underline. Hover swaps text color to red."
  hero-title-stack:
    description: "A three-line stacked title where each line is a Shrikhand display element at a slightly different size. Two of the three lines carry rotation transforms (-4deg, +2deg) and one is set in red. The composition is the system's signature opener."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Bold Poster is a **populist editorial poster system** that lifts its visual vocabulary from vintage Italian sports magazines, mid-century European brand annual reports, and wine-merchant catalogues. The premise is that every slide should feel printed — set in heavy display type, locked to one strong red accent, on a white or off-white sheet, with grids ruled in ink and decoration kept to a strict minimum.

The type system is three faces working in tight roles. **Shrikhand** (Google Fonts) is the display face — a heavy slab/script hybrid with chunky italic terminals, narrow apertures, and a distinctly Italian-sports-script personality. Used at poster scale (often 100-320px) and almost always with playful rotation (-6° to +2°), Shrikhand carries every hero title, every section header, every stat figure, every card title. **Libre Baskerville** (Google Fonts) is the body face — a classical literary serif with strong stroke contrast that anchors the system in editorial register. Used at 11-16px with 1.5-1.75 line-height in deep ink, Libre Baskerville is what makes the system feel printed rather than digital. **Space Grotesk** (Google Fonts) is the chrome face — used exclusively for tiny uppercase labels (9-12px, 2-3px tracking), bullet body inside cards, slide counters, and footer links. The Space Grotesk treatment is the system's "metadata" voice.

The color philosophy is **uncompromising restraint**: white canvas, deep brown-black ink (`{colors.dark}` — `#1C1410`), single saturated tomato red (`{colors.red}` — `#D8000F`), and a warm off-white (`{colors.light}` — `#F5F2EF`) for alternating panels. There are no secondary brand colors, no gradients (except the inside of the stacked text-shadow), no tints, no semantic state colors. Every numerical callout, every active rule, every CTA, every emphasis moment is red — and red is reserved for these moments only (it is never used as body text, never as fill on a card without text on top, never as a tint).

Depth is **structural, not atmospheric**. The system has no drop shadows except a single stacked text-shadow applied to red display text on red panels (three steps at 2/2, 4/4, 6/6 in decreasing-opacity ink). All other depth comes from heavy borders: 3px ink outlines on tabular grids, 1.5-2px ink borders on cells, 4px red left rules on editorial cards, 1px hairline rules between bullet items. The double-border treatment (3px outer + 1.5px inner) is the system's signature tabular pattern — it produces a printed-newsprint quality that defines the look.

**Density philosophy: high — populist and packed.** This system reads as authoritative when slides are dense and timid when sparse. Roadmap, pillar, and financial slides routinely carry 3-6 distinct cells with body paragraphs, bullet lists, and tabular data — and they read as energetic, not crowded. Conversely, hero, closing, and statement slides intentionally drop to one or two huge display elements with massive negative space — the very-low and very-high density polarities are both deliberate. A typical content slide carries a section header + a grid of 3-6 cells, each holding a red numerical/title + a Libre Baskerville body paragraph + 3-6 Space Grotesk mono bullets. A typical statement slide carries one rotated red Shrikhand element occupying half the canvas with a single tagline below.

**Key Characteristics:**
- White (`{colors.bg}`) canvas alternating with off-white (`{colors.light}`) panels for striping, plus dark (`{colors.dark}`) and red (`{colors.red}`) full-bleed panel surfaces for statement moments.
- Single tomato red (`{colors.red}`) as the only accent — used for every numerical figure, every section rule, every label, every left-bar marker.
- Three-face stack: Shrikhand (display + numerical), Libre Baskerville (body), Space Grotesk (mono labels + bullets + chrome).
- Display Shrikhand is routinely tilted (-6° to +2°) — the rotation is the system's signature movement.
- Heavy ink borders: 3px on tabular grid containers, 1.5-2px on cells, 4px red on editorial leftbar cards, 1px hairlines between bullet rows.
- Stacked text-shadow (three steps at 2/2, 4/4, 6/6 in decreasing ink opacity) on red display elements — the only shadow in the system.
- Persistent red progress bar (5px thick) at the bottom edge of every slide.
- Em-dash and bullet glyphs in red as list markers — never default disc bullets.
- Hero compositions stack three Shrikhand lines at varying sizes with at least one in red and at least one tilted.
- Footer links use Space Grotesk uppercase with a 2px red underline.

## Colors

### Palette

- **Bg** (`{colors.bg}` — `#FFFFFF`): Pure white canvas. The default ground for most surfaces. Reads as fresh newsprint paper.
- **Dark** (`{colors.dark}` — `#1C1410`): A deep brown-black with warm bias — not pure black. Used for every line of body text, every border, every Space Grotesk label, every Libre Baskerville paragraph, and as a full-bleed panel ground on roadmap-class surfaces. The warmth distinguishes it from generic editorial black.
- **Red** (`{colors.red}` — `#D8000F`): Saturated tomato red. The system's single accent. Used for every numerical figure (Shrikhand red numerals are the most common element), every section eyebrow label, every leftbar rule on editorial cards, every list bullet glyph, every footer link underline, the persistent progress bar, and as a full-bleed panel ground on statement-class surfaces. Never used as body text color, never as a tint, never as a card fill without overlaid text.
- **Light** (`{colors.light}` — `#F5F2EF`): Warm off-white. Used for alternating panel backgrounds inside pillar layouts (every other pillar swaps to off-white for vertical striping) and as the background of the hint-pill chrome. Subtly warmer than the white canvas — creates surface differentiation without disrupting the printed-paper register.

### Defaults

- **Default surface background**: `{colors.bg}` (white). For statement moments, switch to `{colors.red}` (full-bleed red panel). For roadmap-class moments, switch to `{colors.dark}`. For striping inside a pillar layout, alternate `{colors.bg}` and `{colors.light}`.
- **Default headline / display color on white surfaces**: `{colors.dark}` for primary headlines, `{colors.red}` for numerical figures and stat-class display elements.
- **Default headline color on red panels**: `{colors.bg}` (white) with the stacked text-shadow treatment.
- **Default headline color on dark panels**: `{colors.bg}` (white). Numerical accents stay `{colors.red}`.
- **Default body text color**: `{colors.dark}` on white/light surfaces, `{colors.bg}` (white) on dark/red surfaces with opacity 0.5-0.8 for tertiary content.
- **Default eyebrow / label color**: `{colors.red}` on white surfaces (red Space Grotesk uppercase at 2-3px tracking), `{colors.dark}` for the smaller cell labels inside grids.
- **Default leftbar rule color**: `{colors.red}`. The 4px (or 3px on dark surfaces) red left rule is the editorial card signature.
- **Default border color for cells and grids**: `{colors.dark}`. There are no colored cell borders.
- **Default bullet glyph color**: `{colors.red}`. Default disc bullets do not exist in this system; every list uses red em-dash or red round-bullet glyphs.

The system commits **hard** to the four-color palette. Don't introduce a fifth color (green for positive, blue for info, yellow for highlight). All emphasis is achieved by red, all body is dark on light, all inversion is white on red or white on dark. Categorical differentiation comes from positioning, label, and tilt — never from color.

## Typography

### Font Family Stack
The system runs three faces, each tightly bound to its role.

**Shrikhand** (Google Fonts) is the display + numerical face. It's a single-weight (400) heavy slab-script with playful italic-leaning forms and narrow apertures — a face that reads as both old-world (postcard-script) and contemporary (variable-weight digital display). Used at every scale from 18px (inline stats) to 320px (the hero stat). Always weight 400 (the face has no other weights). Rotation is part of the face's voice — multiple Shrikhand elements per slide carry transforms ranging from -6° to +2°.

**Libre Baskerville** (Google Fonts, 400 / 700 + italic) is the body face. A classical literary serif with high stroke contrast — used for every paragraph, every body cell, every metadata line, every cite, every close-sub. Set at 11-16px with 1.5-1.75 line-height, the face reads as comfortably editorial. The face's italic and bold weights are loaded but used sparingly — italic exists for inline emphasis, bold weight 700 is rarely needed since Shrikhand already handles all the heavy display work.

**Space Grotesk** (Google Fonts, weights 400-700) is the metadata + chrome face. Used at 9-12px in uppercase with 2-3px letter-spacing for labels, eyebrows, slide counters, link text, card bullet bodies (when not using Libre Baskerville), and progress chrome. The wide-tracked uppercase treatment is the system's "stamped metadata" voice.

The roles are non-overlapping: Shrikhand handles every display moment and every numerical figure; Libre Baskerville handles every body paragraph and editorial text; Space Grotesk handles every uppercase label, bullet, and chrome element. Don't cross — Shrikhand body would be illegible; Libre Baskerville labels would look like book footnotes; Space Grotesk headlines would feel like a tech startup.

### Typography Scale

| Token | Size (clamp / px) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.stat-big}` | 120–320px clamp | Shrikhand | 400 | Hero-class stat figure (always rotated -6°, always red) |
| `{typography.hero-title-red}` | 84–260px clamp | Shrikhand | 400 | Red word in a multi-line hero stack (always rotated -4°) |
| `{typography.close-big}` | 80–260px clamp | Shrikhand | 400 | Closing-statement title (always rotated -5°, always red) |
| `{typography.hero-title}` | 72–220px clamp | Shrikhand | 400 | Top line of a hero stack (default no rotation) |
| `{typography.hero-title-bottom}` | 64–200px clamp | Shrikhand | 400 | Bottom line of a hero stack (always rotated +2°) |
| `{typography.section-header-lg}` | 36–72px clamp | Shrikhand | 400 | Large section header for financial / dense-data slides |
| `{typography.section-header}` | 32–64px clamp | Shrikhand | 400 | Standard section header (summary, services, global, close) |
| `{typography.pillar-num}` | 36–64px clamp | Shrikhand | 400 | Numeral atop a pillar panel (red) |
| `{typography.cell-number-lg}` / `{typography.cell-number-md}` | 28–52px clamp | Shrikhand | 400 | Tabular cell numerical figure (always red) |
| `{typography.stat-item-num}` | 28–56px clamp | Shrikhand | 400 | Inline supplementary stat numeral (dark color) |
| `{typography.card-title}` | 22–36px clamp | Shrikhand | 400 | Service card title or global card title |
| `{typography.card-title-sm}` | 20–32px clamp | Shrikhand | 400 | Smaller card title (global cards) |
| `{typography.pillar-title}` | 18–28px clamp | Shrikhand | 400 | Pillar panel title |
| `{typography.roadmap-title}` | 18–32px clamp | Shrikhand | 400 | Roadmap phase title (white on dark surface) |
| `{typography.red-quote}` | 32–90px clamp | Shrikhand | 400 | Quote body on a red panel (white text + stacked shadow) |
| `{typography.inline-stat}` | 18–28px clamp | Shrikhand | 400 | Inline mini-stat number (red) inside a body block |
| `{typography.body}` | 13–16px clamp | Libre Baskerville | 400 | Standard body paragraph |
| `{typography.body-card}` | 12–14px clamp | Libre Baskerville | 400 | Card body inside service/global cards |
| `{typography.body-cell}` | 11–13px clamp | Libre Baskerville | 400 | Tabular cell body inside grids |
| `{typography.body-small}` | 11–13px clamp | Libre Baskerville | 400 | Small body for summary highlights |
| `{typography.hero-meta}` | 11–14px clamp | Libre Baskerville | 400 | Hero meta line above the title stack |
| `{typography.red-cite}` | 13–16px clamp | Libre Baskerville | 400 | Citation under a red-panel quote (white text) |
| `{typography.close-sub}` | 14–18px clamp | Libre Baskerville | 400 | Subtitle / contact line under a closing title |
| `{typography.label-red}` / `{typography.tag-label}` | 10–12px | Space Grotesk | 600 | Section label (uppercase, 2-3px tracking, red) |
| `{typography.label}` | 10px | Space Grotesk | 600 | Cell label inside grids (uppercase, 2px tracking, dark) |
| `{typography.rm-label}` | 9px | Space Grotesk | 600 | Roadmap phase label (uppercase, 3px tracking, red) |
| `{typography.bullet-body}` | 10–12px clamp | Space Grotesk | 400 | List bullet body inside cards and pillars |
| `{typography.counter}` | 11px | Space Grotesk | 600 | Persistent slide counter |
| `{typography.link}` | 10–12px clamp | Space Grotesk | 600 | Footer / closing link text (uppercase, 2px tracking) |
| `{typography.fc-micro}` | 10px | Space Grotesk | 400 | Tiny micro-context line at the bottom of a tabular cell |

### Defaults

- **Default size for a hero or cover title**: `{typography.hero-title}` (72–220px) at the top of a stack, paired with `{typography.hero-title-red}` (84–260px, red, rotated -4°) on a second line and `{typography.hero-title-bottom}` (64–200px, rotated +2°) on a third line. The three-line stacked composition is the system's standard hero pattern.
- **Default size for a primary section headline**: `{typography.section-header}` (32–64px). Always Shrikhand.
- **Default size for a hero-class statistic**: `{typography.stat-big}` (120–320px) rotated -6°, always red.
- **Default size for a tabular cell numeral**: `{typography.cell-number-md}` (28–52px) in red.
- **Default size for body**: `{typography.body}` (13–16px) Libre Baskerville at line-height 1.75.
- **Default size for a card body**: `{typography.body-card}` (12–14px) at line-height 1.6.
- **Default size for a section eyebrow label**: `{typography.tag-label}` (10–12px) Space Grotesk weight 600 in red, uppercase, with 2-3px letter-spacing.
- **Default size for a list bullet body**: `{typography.bullet-body}` (10–12px) Space Grotesk weight 400.
- **Default weight for Shrikhand**: 400 — the face has no other weights.
- **Default weight for Libre Baskerville body**: 400. Bold (700) is used only for inline emphasis inside body paragraphs.
- **Default weight for Space Grotesk labels**: 600. Wide tracking is the system's label voice; weight 400 is for bullet bodies only.

When unsure which display token to reach for, default to `{typography.section-header}` (32–64px) for a primary slide section opener. Reserve `{typography.stat-big}` for hero-stat moments and `{typography.hero-title}` triples for cover-class surfaces.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every hero-class Shrikhand element is part of a multi-line stacked composition with at least one rotated line and at least one red line.** A single-line Shrikhand hero title without rotation or color contrast collapses into a generic display moment.
- **Every tabular numerical cell figure is Shrikhand at the cell-number scale (28–52px) in `{colors.red}`.** Numerical cells in dark text break the system's hierarchy — red is the data signal.
- **Every section eyebrow is Space Grotesk weight 600 in `{colors.red}`, uppercase, with 2-3px letter-spacing.** No exceptions. Eyebrows at any other tracking, weight, color, or case are not the system's eyebrow.
- **Every statement-class Shrikhand element (stat-big, close-big) is rotated -5° to -6° in `{colors.red}`.** Untilted red Shrikhand at hero scale looks like a misplaced word — the tilt is the system's "movement" signal.
- **Every red-panel display element carries the stacked text-shadow** (`2px 2px 0 rgba(28,20,16,0.25), 4px 4px 0 rgba(28,20,16,0.2), 6px 6px 0 rgba(28,20,16,0.15)`). Without the shadow, white Shrikhand on red reads as floating; with it, the text feels printed-and-pressed into the panel.
- **Every list bullet uses a `{colors.red}` em-dash (—) or round-bullet (•) glyph** at position absolute left with a 12-14px padding-left on the body. Default disc bullets do not exist; the red marker is the system's list signal.
- **Every Libre Baskerville body is at line-height ≥ 1.5 (preferably 1.6-1.75).** Tighter line-height collapses the editorial register.
- **Every body strong (`<strong>`) inside a Libre Baskerville paragraph switches face to Space Grotesk weight 600.** The inline face-switch is the system's primary inline emphasis mechanism — a serif strong tag does not produce the same effect.

### Typography Principles

The voice contrast is **chunky tilted display Shrikhand ↔ literary serif body ↔ wide-tracked mono labels**. Italic is rare (Libre Baskerville italic exists but is used only for inline emphasis inside body); underline is reserved for the red-underline footer link treatment. Bold within Libre Baskerville body is replaced by an inline face-switch to Space Grotesk weight 600 — the change-of-face is the emphasis signal.

Numerical content (stat figures, financial values, percentage callouts, mini-stats) is always Shrikhand in red. Even small inline stats inside body cells become red Shrikhand. The numerical-as-display pattern is what gives the system its sports-magazine register.

## Layout

### Canvas System
The system targets `100vw × 100vh` per slide. Slides are absolutely positioned and animate in via opacity + translateY (30px) + scale (0.98 → 1) on 550ms ease. Only one slide is `.active` at a time. Default slide padding is `48px 56px` with major variations:
- Hero slides: `5vh 7vw` top-padding, alignment shifted to top-left.
- Roadmap slides: `40px 48px` to accommodate the dense two-column grid.
- Pillars slides: `0` (the pillar columns provide their own internal padding).

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-slide}` | 48px 56px | Default slide padding |
| `{spacing.pad-cell}` | 22px 20px | Tabular cell internal padding (financial grid) |
| `{spacing.pad-cell-sm}` | 20px 24px | Summary highlight cell padding |
| `{spacing.pad-pillar}` | 32px 24px | Pillar column padding |
| `{spacing.pad-card}` | 24px | Global card padding |
| `{spacing.pad-roadmap}` | 40px 48px | Roadmap surface padding |
| `{spacing.gap-grid-md}` | 24px 32px | Standard service/global grid gap (row × col) |
| `{spacing.gap-grid-roadmap}` | 28px 36px | Roadmap two-column grid gap |
| `{spacing.gap-grid-stats}` | 48px | Big stat row gap |
| `{spacing.gap-stat-row}` | 20px | Vertical gap within a stat-item stack |

### Persistent Chrome
Three elements appear on every slide:
- **Progress bar** at the bottom edge — a 5px thick `{colors.red}` strip that grows in width with slide index. The thickest, most visible piece of chrome; it functions as both progress indicator and bottom-edge poster trim.
- **Slide counter** at bottom-right (`bottom: 18px right: 24px`) — Space Grotesk weight 600 uppercase NN / NN at 50% opacity.
- **Hint pill** at bottom-center — Space Grotesk uppercase text in an off-white pill, opacity 0 by default, fading to 50% on `body:hover`.

### Surface Variations
The deck cycles through five surface treatments:
- **White content surfaces** — default, most slides.
- **Off-white striped panels** — inside pillar layouts, alternating columns get `{colors.light}` background for vertical striping.
- **Full-bleed red panel** — statement / quote slides flood the canvas in `{colors.red}` with white display text and the stacked text-shadow.
- **Full-bleed dark panel** — roadmap-class surfaces use `{colors.dark}` ground with white text and red accents.
- **Bordered tabular grids** — financial-figure and summary-highlight grids carry a 3px ink outer border + 1.5px ink inner cell borders, producing the system's signature double-border tabular composition.

### Hero Stack Composition
The standard cover/hero pattern is a **three-line Shrikhand stack** where each line carries a different size and at least one carries rotation and at least one is in red. The stack reads top-left → bottom-right, with the smallest line at the bottom and the boldest red rotation in the middle. The composition is the system's most distinctive opener.

## Depth and Elevation

### No Cards, No Shadows (Mostly)
The system uses **almost no box-shadows**. Cards do not float off the surface via shadow. Depth comes from:
- **Heavy borders** (3px outer + 1.5px inner double-border on tabular grids; 2px solid borders on global cards; 4px red left rules on editorial leftbar cards).
- **Surface inversion** (full-bleed red or dark panels switch the entire surface).
- **Tilted display elements** that break the grid alignment.

### The Single Shadow Pattern (Stacked Text Shadow)
The only shadow in the entire system is the **stacked text-shadow on red display text on red panels**: three steps at 2/2, 4/4, 6/6 with decreasing-opacity ink fill (0.25, 0.20, 0.15). The shadow is applied via `text-shadow:` not `box-shadow:`. The effect is a printed-press feel — the text reads as having been stamped slightly off-register, three times. This treatment appears only on the red-quote and certain rotated Shrikhand display moments on red panels.

### Border-as-Depth (Tabular Grid Signature)
The financial-grid and summary-highlight-grid patterns use a **3px solid ink outer border** with **1.5px solid ink inner cell borders** — the two border weights touch at every cell intersection, producing a printed-newsprint quality. This is the system's primary structural depth mechanism on data-heavy surfaces.

### Leftbar Rules
Editorial cards (service cards, roadmap phases, global cards) are marked by a **4px (or 3px on dark surfaces) red solid left border** with 16-18px padding-left. The leftbar rule signals "this is a card" without enclosing it — the card reads as cantilevered off the red rule. This is the system's most common card pattern.

### Tilt as Depth
Rotated Shrikhand display elements break the horizontal baseline and create perceived dimensionality without using perspective. The standard rotations are -6° (stat-big), -5° (close-big), -4° (hero-title-red), +2° (hero-title-bottom). These tilts are part of the system's spatial language.

## Shapes and Treatment

### Border Radius
- **0px** on everything except the hint-pill (4px) and the bar-track elements (none in this template, but if used should be 0px). Every card, every cell, every panel, every callout is a strict rectangle.
- **4px** on the hint-pill only — a minor concession for the floating chrome.

The square-corner discipline is essential. Rounded cards immediately collapse the printed-poster feel into generic web aesthetic.

### Border Weights
- **5px solid `{colors.red}`** — used only on the persistent progress bar.
- **4px solid `{colors.red}`** — used on the editorial leftbar card (service cards on white surfaces).
- **3px solid `{colors.dark}`** — used on the outer border of tabular grids (financial-grid, summary-highlights) and as the vertical pillar separator.
- **3px solid `{colors.red}`** — used on the leftbar of roadmap phase cards (on dark surfaces).
- **2px solid `{colors.red}`** — used as the underline rule on footer links.
- **2px solid `{colors.dark}`** — used as the outline border on global cards.
- **1.5px solid `{colors.dark}`** — used on inner cells of tabular grids.
- **1px solid `rgba(28, 20, 16, 0.08)`** — hairline-soft separator between bullet rows inside pillar panels.

The border ladder (1px-soft / 1.5px / 2px / 3px / 4px / 5px) is fixed. Every border is solid; dashed and dotted borders do not exist.

### Decorative Element Types

**Hero title stack** — A three-line Shrikhand composition at varying sizes with rotation and color contrast. The system's signature opener.

**Red panel** — Full-bleed `{colors.red}` ground with white display text carrying the stacked text-shadow. Used for statement / quote moments.

**Dark panel** — Full-bleed `{colors.dark}` ground with white text and red accents. Used for roadmap-class dense-data surfaces.

**Tabular bordered grid** — 3px ink outer border + 1.5px ink inner cell borders producing a double-border tabular composition. Each cell holds a Shrikhand red numeral + Space Grotesk uppercase label + Libre Baskerville body paragraph + optional Space Grotesk micro line at bottom.

**Red leftbar card** — A 4px solid red left rule with 18px left padding holding a Shrikhand card title + Libre Baskerville body + Space Grotesk red-bullet list. The system's primary editorial card pattern.

**Pillar panel** — A vertical column inside a multi-pillar layout, separated by 3px ink vertical rules and alternating between white and off-white backgrounds. Each pillar holds a Shrikhand red numeral, Shrikhand title, Libre Baskerville lead, and Space Grotesk bullets separated by 1px hairline-soft rules.

**Global card** — A 2px solid ink-bordered card with 24px padding holding a Space Grotesk red label + Shrikhand title + Libre Baskerville body + inline gc-stats row. Used on the global-presence surface.

**Em-dash bullet** — A red em-dash glyph at position absolute left with 14px padding-left on the body. The system's primary list marker.

**Round bullet** — A red round-bullet glyph at position absolute left with 12px padding-left on the body. Secondary list marker, used in card and pillar bullets.

**Footer link** — Space Grotesk uppercase text with a 2px red underline and 4px padding-bottom. Hover swaps text color to red.

**Stacked text shadow** — Three-step decreasing-opacity ink shadow applied to red display text on red panels. The system's only shadow treatment.

**Tilted display** — Shrikhand elements rotated -6° to +2°. Used on hero-title-red, stat-big, close-big, and hero-title-bottom.

## Do's and Don'ts

### Do

- Apply `{colors.bg}` (white) as the default canvas on most surfaces. Switch to `{colors.red}` for statement slides, `{colors.dark}` for dense-data slides, and alternate `{colors.bg}` / `{colors.light}` for vertical pillar striping.
- Set every hero-class title as a multi-line Shrikhand stack with at least one rotated line and at least one red line. The composed-stack is the system's opener signature.
- Use Shrikhand at every numerical-callout moment in `{colors.red}` — tabular cells, summary highlights, pillar numbers, inline mini-stats. Red Shrikhand numerals are the system's data voice.
- Set every section eyebrow in Space Grotesk weight 600 uppercase with 2-3px letter-spacing in `{colors.red}`. The wide-tracked red label is the universal section opener.
- Apply the stacked text-shadow to red display text on red panels. The three-step decreasing-opacity ink shadow is the system's only shadow and creates the printed-press feel.
- Use the 4px red leftbar pattern (`{components.red-leftbar-card}`) for editorial cards. The cantilevered-off-the-rule treatment is the system's primary card pattern.
- Build tabular grids with the double-border treatment: 3px ink outer border + 1.5px ink inner cell borders touching at intersections.
- Render every list bullet with a red em-dash (`{components.bullet-em-dash}`) or red round-bullet (`{components.bullet-bullet}`) at position absolute left. Default disc bullets are forbidden.
- Tilt Shrikhand statement elements (-5° to -6°) to create the system's signature movement. Untilted red statement display reads as misplaced.
- Use Libre Baskerville at line-height 1.5-1.75 in `{colors.dark}` for every body paragraph. The literary editorial body is what makes the system feel printed.

### Don't

- Don't introduce a second accent color. Red is the only accent — green for positive, blue for info, yellow for highlight all break the single-accent discipline.
- Don't round any corner on cards, panels, cells, or callouts. Square corners are non-negotiable; the only exception is the 4px hint-pill chrome.
- Don't add drop shadows or blurred shadows. The system has zero box-shadows; the only shadow is the stacked text-shadow on red display text.
- Don't substitute fonts. Shrikhand + Libre Baskerville + Space Grotesk is the trio. Replacing Shrikhand with any other display face collapses the entire identity.
- Don't use Shrikhand for body or Libre Baskerville for labels. The three-face role discipline is non-negotiable.
- Don't use default bullet points or disc list markers. Lists always use red em-dash or red round-bullet glyphs at position absolute left.
- Don't omit the tilt on hero-class red Shrikhand elements. The rotation is the system's signature movement; untilted red display reads as flat.
- Don't render headlines in red on white surfaces (except for stat-big, close-big, hero-title-red — the rotated statement elements). Most section headers are `{colors.dark}` Shrikhand, not red.
- Don't tighten Libre Baskerville body line-height below 1.5. Tight body line-height collapses the literary register into something cramped.
- Don't crowd a statement slide with cards or structural content. Statement surfaces (red panel, stat slide, close slide) deliberately reserve massive negative space around a single rotated red display element.

## Responsive Behavior

Bold Poster is designed as a **1920×1080 presentation system**. Sizing uses CSS `clamp()` with `vw`-based mid values for display type, fixed `px` for borders and chrome, and `rem`-adjacent fixed values for cell padding. The system has a single responsive breakpoint at 768px for narrow viewports.

### Scaling Behavior
- Hero stat scales 120px → 320px on viewport width.
- Hero titles scale 64px → 260px.
- Section headers scale 32px → 72px.
- Body scales 11px → 16px.
- Borders (1px-soft / 1.5px / 2px / 3px / 4px / 5px) and rotation transforms are fixed and do not scale.

### Mobile Breakpoint (max-width: 768px)
A single `@media (max-width: 768px)` block restructures dense layouts for narrow viewports:
- Slide padding shrinks from 48px × 56px to 32px × 24px.
- Summary columns collapse from 2 → 1.
- Summary highlights grid collapses from 3 → 1.
- Financial grid collapses from 3 → 2.
- Service grid collapses from 2 → 1.
- Roadmap grid collapses from 2 → 1.
- Pillars switch from horizontal flex-row to vertical flex-column; vertical separators become horizontal bottom borders.
- Global grid collapses from 2 → 1.
- Stat row stacks vertically.
- Hero tagline shifts from absolute-positioned bottom-right to relative-positioned below the hero title stack.

The system is functional but not optimized for sub-768px portrait usage — it's designed for landscape presentation contexts.

### Presenter Behavior
- Slides advance via `ArrowRight`, `ArrowDown`, `Space`, `Enter`, or `PageDown`.
- Slides reverse via `ArrowLeft`, `ArrowUp`, or `PageUp`.
- Click on the right half of the viewport advances; click on the left half reverses.
- Horizontal touch swipe with a 50px threshold advances/reverses.
- Slide transitions are 550ms cubic-bezier `(0.22, 1, 0.36, 1)` with combined opacity, translateY (30px), and scale (0.98 → 1).
- Progress bar at bottom edge animates to current slide percentage with a 500ms cubic-bezier ease.

### Print Behavior
The system has no `@media print` rule. The transition is screen-only. For static export, screenshots of each slide preserve all rotation transforms and the stacked text-shadow (both are pure CSS).

### Interactive States
- Footer links swap text color from `{colors.dark}` to `{colors.red}` on hover.
- The hint-pill fades from opacity 0 to 0.5 on `body:hover` via a 400ms ease.

## CJK & International Content

When using this template for Chinese (or other CJK) content, swap the Latin typeface stack for an equivalent Chinese pairing and apply universal CJK adjustments. All recommended Chinese fonts load via CDN — no install required.

### Recommended Chinese Pairing

| Role | Latin (default) | Chinese counterpart |
|---|---|---|
| Display / hero / stat / section header / numerical figures / card titles | Shrikhand 400 (heavy slab-script, rotated) | 思源宋体 Noto Serif SC 900 |
| Body / body-card / body-cell / hero-meta / cite / close-sub | Libre Baskerville 400 (literary serif) | 思源宋体 Noto Serif SC 400 |
| Label / bullet body / counter / link / micro chrome | Space Grotesk 400–600 (uppercase, 2–3px tracking) | 思源黑体 Noto Sans SC 500 (no transform, no tracking) |

### Mixed-Content Strategy

**Strategy A** — single CJK family per role with Latin glyph coverage built in. Use **思源宋体 Noto Serif SC** for both display and body (weight 900 for display, weight 400 for body — visual hierarchy comes from weight, size, color, and rotation, not face contrast). Use **思源黑体 Noto Sans SC** weight 500 for the small uppercase chrome (labels, bullet bodies, counter, links). 思源宋体 ships Latin glyphs that pair cleanly with Chinese characters; for mixed display moments, 思源宋体 weight 900 will render both 中文 and Latin in the same heavy serif voice.

### Loading

Add to the template's `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700;900&family=Noto+Sans+SC:wght@400;500;600&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

- **Line-height**: increase by ~15–25% from the Latin spec. Body 1.75–1.85 (already close to Libre Baskerville 1.75; keep at 1.8 for CJK), display 1.1–1.25 (up from the very tight 0.82–0.9 used on Shrikhand). Display at 0.82 collides vertically in CJK; open to 1.0 minimum.
- **Letter-spacing**: set to 0 on every CJK run. The template's 1px positive tracking on hero-title and the 2–3px tracking on Space Grotesk labels both read as gappy on square CJK glyphs.
- **Text transform**: don't apply `uppercase` to Chinese text — CJK has no case. Every Space Grotesk label, tag-label, rm-label, counter, and link uses `text-transform: uppercase` in the Latin original; remove for CJK runs.
- **Punctuation**: use full-width Chinese punctuation （，。：；！？「」（））.
- **No period on display headlines**: Chinese typography convention omits trailing 。 on display-scale headlines.
- **Space between CJK and Latin (盘古之白)**: insert an ASCII space between every Chinese character and adjacent Latin character or digit. Write `1970 米兰式海报` not `1970米兰式海报`.
- **One font per sentence**: 思源宋体 covers both CJK and Latin glyphs in a unified serif style — let it handle mixed sentences in display and body. Don't let the browser fall back to Shrikhand or Libre Baskerville mid-word for ASCII characters.

### Aesthetic Notes for This System

The system's identity rests on **Shrikhand's chunky slab-script personality + rotation + saturated red**. Shrikhand is the most distinctive single decision in this template — and it has no Chinese equivalent. 思源宋体 weight 900 carries weight and editorial register but loses the playful italic-leaning slab character entirely. Compensate by **leaning harder on the non-typographic signatures**: keep all rotations intact (-6° on stat-big, -5° on close-big, -4° on hero-title-red, +2° on hero-title-bottom), keep the stacked text-shadow on red-panel display, keep the saturated tomato red as the only accent, keep the 3px + 1.5px double-border tabular grids, keep the red leftbar cards, keep the red em-dash bullet markers. The rotation, red, and printed-newsprint structural language survive the face swap.

The system's three-face role discipline (Shrikhand display / Libre Baskerville body / Space Grotesk chrome) collapses to a two-face system in CJK: 思源宋体 for everything Latin-serif, 思源黑体 for everything Latin-mono. The body-vs-display contrast becomes pure weight (400 vs 900) plus color (dark vs red). For inline `<strong>` emphasis inside body, switch from 思源宋体 400 to 思源黑体 600 — the change-of-face is what signals emphasis in the Latin original, and the serif-to-sans swap preserves the same logic in CJK.

### Known CJK Gap

- **No exact online CJK match for Shrikhand's slab-script personality.** The face is Italian-sports-magazine display script with chunky terminals and playful italic forms — there is no Chinese equivalent on Google Fonts, Adobe Fonts, or cn-fontsource. 思源宋体 weight 900 gives heft and editorial register but reads as serious rather than playful. The rotation transforms and saturated red carry the playful-sports-magazine voice on their own; don't drop the tilts when translating to CJK.
- **No CDN Chinese monospace face for the chrome voice.** Space Grotesk's role (uppercase tracked labels, slide counter, footer links with red underline) depends on the uppercase + 2–3px tracking treatment. 思源黑体 weight 500–600 at 0 tracking is the closest match but loses the "stamped metadata" signal. The red color and 1–2px border treatments on tags/links do most of the chrome-recognition work in a CJK build.
- **Libre Baskerville's classical literary register has no exact Chinese counterpart.** 思源宋体 reads as institutional-modern rather than 19th-century-literary. For projects that need the literary-quarterly voice specifically (long body paragraphs in essays or manifestos), consider 霞鹜文楷 LXGW WenKai instead of 思源宋体 — it carries a hand-written/calligraphic warmth closer to Baskerville's editorial personality.

## Iteration Guide

1. Any new content slide starts with a Shrikhand section header at `{typography.section-header}` (32–64px) in `{colors.dark}`, optionally preceded by a Space Grotesk red eyebrow label.
2. Any new numerical callout (cell figure, pillar number, inline stat, summary highlight) is Shrikhand in `{colors.red}` at the appropriate cell-number scale.
3. Any new body paragraph is Libre Baskerville weight 400 in `{colors.dark}` at line-height 1.5-1.75.
4. Any new editorial card uses the `{components.red-leftbar-card}` pattern (4px red left rule + 18px padding-left), holding a Shrikhand title + Libre Baskerville body + Space Grotesk red-bullet list.
5. Any new data-grid is wrapped in a 3px ink outer border with 1.5px ink inner cell borders. Each cell holds: Shrikhand red numeral + Space Grotesk uppercase label + Libre Baskerville body + optional Space Grotesk micro-context line at bottom.
6. Any new statement slide uses a full-bleed `{colors.red}` panel with white Shrikhand display text carrying the stacked text-shadow, and white Libre Baskerville cite below.
7. Any new dense-data slide uses a full-bleed `{colors.dark}` panel with white text, red Space Grotesk labels, red 3px leftbar rules on phase cards, and red round-bullet glyphs on lists.
8. Any new list uses red em-dash or red round-bullet glyphs at position absolute left — never default disc bullets.
9. Any new hero composition is a multi-line Shrikhand stack: at least three lines, at least one rotated, at least one in red. Don't collapse to a single horizontal title.
10. If a surface feels too monotone, switch the surface ground (white → red / dark / off-white panel) — don't add a second accent color or a third typeface.

## Known Gaps

- **Shrikhand is a single-weight (400) display face** — there are no bolder or lighter weights available. Every Shrikhand element is the same weight; visual hierarchy comes from size, color, and rotation only.
- **Shrikhand, Libre Baskerville, and Space Grotesk are loaded from Google Fonts** via a single `<link>` request. There are no system fallbacks beyond `cursive` / `serif` / `sans-serif` — in environments where Google Fonts fail, the system collapses to generic system fonts and loses its identity entirely.
- **The stacked text-shadow is hardcoded for ink-on-red contexts.** Applying it to different color combinations (e.g., red text on a light ground) does not produce the same effect; the three-step shadow is specifically tuned for the red-panel surface.
- **Rotation transforms are fixed per element type** (-6° on stat-big, -5° on close-big, -4° on hero-title-red, +2° on hero-title-bottom). Adjusting individual rotations requires per-instance style overrides.
- **The financial-grid and summary-highlights grid use overlapping borders** (3px outer + 1.5px inner that physically overlap by half-pixel due to box-sizing). Browser rendering of this overlap is generally clean but can produce subtle 1-pixel artifacts at certain zoom levels.
- **The pillars layout uses `overflow-y: auto`** on each pillar column. On surfaces with long content, this introduces visible scrollbars on certain operating systems — the system is designed for content that fits the viewport.
- **The hero tagline on slide-hero is absolutely positioned at `bottom: 8vh; right: 7vw`** with a 300px max-width. On very wide aspect ratios or very narrow ones it may misalign with the hero title stack.
- **The progress bar is a 5px height strip** that may visually overlap content on slides with bottom-edge text — the slide-close surface in particular places close-links at `bottom: 5vh` which clears the progress bar but only by a small margin.
- **The click-to-advance interaction divides the viewport at 50% width** for next/prev. This may conflict with click-to-interact behaviors on links inside slides (the close-slide footer links). The system relies on link click events to stopPropagation, which they do not by default.
- **The bullet-list class is defined globally** with em-dash glyphs but is not used in the demo template — the pillar bullets, service bullets, and roadmap bullets all redefine their own bullet styles inline. There's some inconsistency between the defined utility and the actual usage patterns.
