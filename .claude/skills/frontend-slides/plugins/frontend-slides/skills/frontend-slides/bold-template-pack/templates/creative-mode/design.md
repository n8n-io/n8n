---
version: alpha
name: Creative Mode
description: A neo-brutalist editorial presentation system built for 1920x1080 slides. The deck anchors on a warm cream canvas with heavy 4px ink borders, hard offset drop-shadows, and a bold four-color accent palette (forest green, hot pink, burnt orange, sunshine yellow). Display headlines run Archivo Black in pure uppercase — aggressive, loud, zero letter-spacing softness. Monospace labels in JetBrains Mono echo a typesetting rule-sheet. Body copy sits in Space Grotesk. Every slide uses flat color-blocking with no gradients, no rounded cards, and no subtlety. The aesthetic is part Bauhaus grid, part punk zine, part Swiss editorial.

colors:
  cream: "#EFE9D9"
  cream-2: "#E4DCC4"
  ink: "#0F0F0F"
  ink-2: "#2A2A2A"
  green: "#1F8A4C"
  green-dark: "#136636"
  pink: "#F06CA8"
  pink-dark: "#D14E8B"
  orange: "#E85A1F"
  yellow: "#F5C518"

typography:
  display-jumbo:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 220px
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.01em
    textTransform: uppercase
  display-hero:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 160px
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.01em
    textTransform: uppercase
  display-xl:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 140px
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.01em
    textTransform: uppercase
  display-lg:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 100px
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.01em
    textTransform: uppercase
  display-md:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 96px
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.01em
    textTransform: uppercase
  display-sm:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 84px
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: -0.01em
    textTransform: uppercase
  display-xs:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 72px
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: -0.01em
    textTransform: uppercase
  stat-num:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 96px
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: 0
  step-num:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 140px
    fontWeight: 400
    lineHeight: 0.85
    letterSpacing: 0
  step-title:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 34px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
    textTransform: uppercase
  stamp-num:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: 0
  marker-label:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 46px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
    textTransform: uppercase
  badge-label:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
    textTransform: uppercase
  table-head:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
    textTransform: uppercase
  table-label:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
    textTransform: uppercase
  body-lg:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0
  mono-label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.06em
    textTransform: uppercase
  mono-kicker:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.14em
    textTransform: uppercase
  mono-tag:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.1em
    textTransform: uppercase
  mono-chart:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.08em
    textTransform: uppercase

spacing:
  slide-gutter: 96px
  chrome-gutter: 64px
  grid-gap: 28px
  cell-pad: 32px
  step-pad: 28px
  topbar-top: 48px
  meta-bottom: 40px
  table-cell-pad: 18px 26px

canvas:
  width: 1920px
  height: 1080px

components:
  slide-chrome:
    topbar:
      fontFamily: "JetBrains Mono, monospace"
      fontSize: 24px
      letterSpacing: 0.08em
      textTransform: uppercase
      position: absolute
      left: 64px
      right: 64px
      top: 48px
    topbar-pill:
      border: "2px solid {colors.ink}"
      padding: 6px 14px
      borderRadius: 999px
    slide-meta:
      fontFamily: "JetBrains Mono, monospace"
      fontSize: 24px
      letterSpacing: 0.06em
      textTransform: uppercase
      position: absolute
      left: 64px
      right: 64px
      bottom: 40px
    slide-meta-dot:
      width: 10px
      height: 10px
      background: "{colors.ink}"
      borderRadius: 50%
  stat-cell:
    border: "4px solid {colors.ink}"
    padding: 28px 32px
  stat-cell-green:
    background: "{colors.green}"
    color: "{colors.cream}"
  stat-cell-pink:
    background: "{colors.pink}"
    color: "{colors.ink}"
  stat-cell-cream:
    background: "{colors.cream}"
    color: "{colors.ink}"
  stat-cell-orange:
    background: "{colors.orange}"
    color: "{colors.cream}"
  step-card:
    border: "4px solid {colors.ink}"
    padding: 28px
    height: 420px
  step-card-cream:
    background: "{colors.cream}"
    color: "{colors.ink}"
  step-card-pink:
    background: "{colors.pink}"
    color: "{colors.ink}"
  step-card-yellow:
    background: "{colors.yellow}"
    color: "{colors.ink}"
  step-card-green:
    background: "{colors.green}"
    color: "{colors.cream}"
  step-arrow:
    borderTop: "18px solid transparent"
    borderBottom: "18px solid transparent"
    borderLeft: "24px solid {colors.ink}"
  table:
    border: "4px solid {colors.ink}"
    background: "{colors.cream-2}"
    rowBorder: "3px solid {colors.ink}"
    colBorder: "3px solid {colors.ink}"
  table-head-row:
    background: "{colors.ink}"
    color: "{colors.cream}"
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 28px
    borderColor: "{colors.cream}"
  table-col-pink:
    background: "{colors.pink}"
    color: "{colors.ink}"
  table-col-green:
    background: "{colors.green}"
    color: "{colors.cream}"
  table-col-orange:
    background: "{colors.orange}"
    color: "{colors.cream}"
  marker-block:
    background: "{colors.pink}"
    border: "4px solid {colors.ink}"
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 46px
    hardShadow: "24px 24px 0 {colors.orange}, 24px 24px 0 4px {colors.ink}"
  iso-panel:
    background: "{colors.green}"
    border: "4px solid {colors.ink}"
  stacked-block:
    border: "4px solid {colors.ink}"
    hardShadow: "18px 18px 0 {colors.ink}"
  badge-rotated:
    background: "{colors.yellow}"
    border: "4px solid {colors.ink}"
    fontFamily: "Archivo Black, sans-serif"
    fontSize: 28px
    textTransform: uppercase
    transform: rotate(-4deg)
  stamp:
    background: "{colors.pink}"
    border: "4px solid {colors.cream}"
    width: 340px
    height: 340px
    transform: rotate(-6deg)
  stamp-inner:
    border: "4px solid {colors.cream}"
    borderRadius: 50%
  kicker-block:
    background: "{colors.ink}"
    color: "{colors.cream}"
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.14em
    textTransform: uppercase
    padding: 8px 16px
  bar-chart-bar:
    border: "3px solid {colors.ink}"
  bar-chart-axis:
    borderRight: "3px solid {colors.ink}"
    borderBottom: "3px solid {colors.ink}"
  decorative-circle:
    background: "{colors.yellow}"
    border: "4px solid {colors.ink}"
    borderRadius: 50%
  closing-slide:
    background: "{colors.green}"
    color: "{colors.cream}"
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Creative Mode is a **neo-brutalist editorial slide system** for 1920x1080 presentations. The foundational aesthetic choice is restraint of technique paired with aggression of expression: no rounded cards, no gradients, no shadows that suggest light sources — only flat color-blocking and hard offset drop-shadows (the "Risograph" or "screen-print" kind where the shadow is a sold same-color offset).

The canvas is warm cream (`{colors.cream}` — #EFE9D9) with near-black ink (`{colors.ink}` — #0F0F0F) for borders, text, and rules. Four accent colors fire at full saturation: forest green, hot pink, burnt orange, and sunshine yellow. These never blend — they collide on the slide and the collision is the design.

Headlines run **Archivo Black** (weight 400 due to the display face being intrinsically heavy) in strict uppercase with tight line-height (0.92). Font sizes are extreme: 220px for closing slides, 160px for titles. **JetBrains Mono** carries all metadata, labels, topbar text, and axis labels — reinforcing a "designed artifact" or "technical manual" register. **Space Grotesk** handles all body paragraphs.

Every slide follows an identical chrome frame: a JetBrains Mono topbar at 48px from top (left text + right pill), and a JetBrains Mono meta footer at 40px from bottom (label left, slide number right with ink dot divider). Content lives inside this frame with 96px side gutters.

**Key Characteristics:**
- Cream canvas (`{colors.cream}` — #EFE9D9) as the universal background; green (`{colors.green}` — #1F8A4C) used for the closing slide only.
- 4px solid ink borders on every structural element — cards, panels, table cells, chart axes.
- Hard offset box-shadows in place of blurred drops: `24px 24px 0 color, 24px 24px 0 4px ink` on featured blocks.
- Archivo Black display type in uppercase with 0.92 line-height for extreme tightness.
- Four accent colors used as flat fills; each slide uses two or three of the four, never all simultaneously.
- Topbar pill badge (JetBrains Mono, 2px ink border, 999px radius) as the only rounded element per slide.

## Colors

### Canvas and Ink
- **Cream** (`{colors.cream}` — #EFE9D9): The universal slide background. Warm, not white. Distinguishes the deck from sterile white-background slides.
- **Cream 2** (`{colors.cream-2}` — #E4DCC4): One step darker cream. Used exclusively as the comparison table's background fill, creating a subtle recessed surface inside the ink border.
- **Ink** (`{colors.ink}` — #0F0F0F): Near-black used for all borders, body text, rules, topbar chrome, and the closing stamp border. Not pure #000000 — slightly softened.
- **Ink 2** (`{colors.ink-2}` — #2A2A2A): Softer near-black for secondary body text, descriptions inside stat cells, chart footnotes.

### Accent Colors
- **Green** (`{colors.green}` — #1F8A4C): Forest green. The dominant accent. Works on stat cells, diagram panels, process steps, and as a full-slide background for maximum visual impact.
- **Green Dark** (`{colors.green-dark}` — #136636): Darker green variant — available for lever/depth decorative effects. Not used as a primary surface fill.
- **Pink** (`{colors.pink}` — #F06CA8): Hot pink. High energy. Works on toggle switch illustrations, section markers, stat cells, process steps, and stamp elements.
- **Pink Dark** (`{colors.pink-dark}` — #D14E8B): Darker pink for depth on decorative lever elements. Available for shadow-side accents.
- **Orange** (`{colors.orange}` — #E85A1F): Burnt orange. The hard drop-shadow color on featured blocks; also works as a stat cell fill, bar chart color, and table column background.
- **Yellow** (`{colors.yellow}` — #F5C518): Sunshine yellow. Works on decorative circles, process steps, rotated badges, and bar chart bars. A warm punctuation color.


## Typography

### Font Families
The system uses three typefaces, each in a strict register:
- **Archivo Black** — display headlines, step numbers, stat numbers, table labels, all uppercase presentation text. Intrinsically heavy, no additional font-weight needed.
- **JetBrains Mono** — all metadata: topbar labels, meta footer, kicker labels, chart axes, legend rows, layer tags, figure notes. Carries the "technical spec" voice.
- **Space Grotesk** — body copy only: body column text (slide 2), stat cell descriptors, diagram subtext, step descriptions, closing strap.

### Display Scale
The slide canvas is 1920x1080px, so font sizes are far larger than web norms.

| Token | Size | Use |
|---|---|---|
| `{typography.display-jumbo}` | 220px | Jumbo title or closing headline |
| `{typography.display-hero}` | 160px | Primary deck title or hero name |
| `{typography.display-xl}` | 140px | Section-opening display headline |
| `{typography.display-lg}` | 100px | Section headline alongside a panel |
| `{typography.display-md}` | 96px | Mid-weight section headline |
| `{typography.display-sm}` | 84px | Section headline for data-heavy layouts |
| `{typography.display-xs}` | 72px | Section headline for grid layouts |
| `{typography.step-num}` | 140px | Large ordinal numerals in stepped layouts |
| `{typography.stat-num}` | 96px | Large numerals in stat or data cells |
| `{typography.stamp-num}` | 64px | Stamp or seal numeral |
| `{typography.marker-label}` | 46px | Featured marker or callout block label |
| `{typography.step-title}` | 34px | Card or step title |
| `{typography.table-head}` | 28px | Table header or label row text |
| `{typography.badge-label}` | 28px | Rotated badge or annotation label |

### Monospace Scale
All JetBrains Mono text sits at 24px. Letter-spacing varies by use:
- Topbar labels: 0.08em
- Meta footer: 0.06em
- Kicker labels (inverted): 0.14em
- Chart axes: 0.08em (via `{typography.mono-chart}`)
- Legend rows: 0.06em
- Layer tags: 0.1em

### Body Scale
- `{typography.body-lg}` (28px): Body copy for wide column layouts or lede paragraphs.
- `{typography.body-md}` (24px): Body text in stat cells, diagram annotations, step descriptions, footnotes, and strap lines.

### Principles
Archivo Black has a line-height of 0.92 — headlines overlap their own cap-height, which is intentional. Uppercase lock is non-negotiable for the display face; lowercase Archivo Black breaks the editorial register. The monospace face uses generous letter-spacing (0.06–0.16em) to feel like a typewritten label. Never use letter-spacing on Archivo Black or Space Grotesk.

## Layout

### Canvas System
Every slide is exactly 1920×1080px in a fixed, non-scrolling viewport. The `deck-stage` custom element handles centering and scaling.

### Gutter System
- **Chrome gutter** (64px left/right): Used by topbar and slide-meta only.
- **Content gutter** (96px left/right): Used by all content — headlines, body, grids.
- Headlines occasionally push right to within 96px of the right edge, or are constrained by `right: 1000px` / `right: 900px` to coexist with a right-panel diagram.


### Chrome Frame (All Slides)
```
┌─ topbar @ top:48px, left:64px, right:64px ──────────────────────────────────┐
│  SECTION LABEL                                       [pill badge]            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CONTENT (96px left gutter, 96px right gutter)                            │
│                                                                              │
├─ slide-meta @ bottom:40px, left:64px, right:64px ───────────────────────────┤
│  DESCRIPTOR LABEL                                    01 • 08                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Depth and Elevation

The system uses **zero blurred shadows**. Depth is expressed through two techniques:

### Hard Offset Shadow
The signature treatment: a second solid shape offset by a fixed amount in both X and Y. Two values are used:
- **Large offset** (24px 24px): Featured blocks like the marker and poster switch — `box-shadow: 24px 24px 0 {colors.orange}, 24px 24px 0 4px {colors.ink}`. The first shadow is the colored offset; the second is the ink border around it.
- **Medium offset** (18px 18px): Stacked blocks in the diagram — `box-shadow: 18px 18px 0 {colors.ink}`. Pure ink shadow only.

### Color-Block Contrast
Depth perception comes from juxtaposing surfaces: cream on cream-2 (table), ink on cream (kicker block), green on cream (diagram panel). No shadow needed when contrast does the work.

### Flat Elements
Topbar, meta footer, chart axis lines, legend swatches: flat, no shadow, no border-radius.

## Shapes and Treatment

### Border Radius
- **0px (square)**: All structural elements — stat cells, step cards, table cells, chart bars, diagram panels, stacked blocks. No rounding.
- **50% (circle)**: Decorative circles within diagram (yellow circ), the topbar pill dot (slide meta separator dot).
- **999px (pill)**: Topbar badge pill only. The one exception to the system's overall squareness, and it reads as a label chip rather than a card.
- **Rotated elements**: The comparison badge rotates -4deg; the closing stamp rotates -6deg. These are the system's only non-orthogonal placements.

### Borders
- **4px solid `{colors.ink}`**: All structural borders — stat cells, step cards, diagram panels, table (outer), poster block, marker block, switch block, stamp.
- **3px solid `{colors.ink}`**: All internal structural lines — table rows, table columns, chart axis, bar chart bars.
- **2px solid `{colors.ink}`**: Topbar pill badge.
- **3px dashed `{colors.ink}`**: Dashed horizontal rule separating the process slide's topbar from its flow cards.

### Decorative Elements
- **Toggle switch**: Pink square with a lever shape (skewed div) and thick/dark underside, offset shadow in orange with ink border.
- **Stacked blocks**: Four overlapping absolute-positioned rectangles in pink, yellow, orange, cream-2 with 18px ink hard shadows.
- **Circle overlay**: Yellow circle centered in a green square — shape contrast acting as decorative figure.
- **Stamp**: Pink rotated square with a cream circular inner border — acts as a seal or approval mark.

## Do's and Don'ts

### Do
- Use 4px ink borders on every structural element. Thinner looks soft; thicker looks like a web component.
- Use hard offset shadows in exactly two sizes: 24px for featured hero blocks, 18px for diagram stacked blocks. Don't mix sizes.
- Stay uppercase on all Archivo Black usage. The font in sentence case reads as a different brand.
- Use the four accents in groups of two or three per slide. Every accent on one slide is noise.
- Reserve the green background for a single dominant slide. Its rarity is what gives it impact.
- Use JetBrains Mono for all labels, metadata, indices, figure notes, and axis text. Never use it for body or headlines.
- Keep line-height at 0.92 for all display text. Looser leading breaks the tight editorial register.
- Maintain 96px content gutter and 64px chrome gutter consistently across all slides.

### Don't
- Don't round card corners (except the topbar pill). Rounding signals "friendly SaaS"; sharp corners signal "editorial precision."
- Don't use gradients, drop shadows with blur, or glow effects. All depth must come from hard offset or color contrast.
- Don't use Archivo Black in sentence case. Never lowercase the display face.
- Don't apply letter-spacing to Archivo Black (except at -0.01em which is already encoded). Extra tracking breaks its density.
- Don't introduce a fifth accent color. The four-color palette is the brand constraint.
- Don't use pure white (#ffffff) as a background. Cream is the canvas; white reads as blank.
- Don't use Space Grotesk for labels or metadata. That role belongs to JetBrains Mono.
- Don't add multiple typefaces. The three-family stack is complete.
- Don't center-align body text. All body copy is left-aligned; centered text breaks the grid discipline.
- Don't soften the stamp or badge rotation. The -4deg and -6deg angles are deliberate imperfection signals.

## Responsive Behavior

This template is designed **exclusively for 1920x1080 presentation display**. It is not a web page and has no mobile breakpoints. The `deck-stage` web component handles viewport scaling via CSS transforms, so the 1920x1080 canvas scales proportionally on any screen size without layout changes.

### Touch / Presenter Behavior
- Slides advance via keyboard arrow keys or presentation clicker (handled by `deck-stage.js`).
- No hover states are defined or needed.
- No interactive form elements exist.

### Print / Export Behavior
- At 96dpi, the 1920x1080 canvas maps to a standard 20x11.25 inch frame.
- For PDF export, a 1920x1080 viewport capture or browser print-to-PDF at 100% scale is recommended.
- At 1pt = 1.333px, the effective print sizes of headlines range from 54pt (72px) to 165pt (220px) — correct for poster/title cards.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin font | Recommended Chinese pairing | Source |
|---|---|---|---|
| Display / Headline (Archivo Black uppercase 400) | Archivo Black | 思源宋体 Noto Serif SC 900 | Google Fonts |
| Body (Space Grotesk 400) | Space Grotesk | 思源宋体 Noto Serif SC 400 | Google Fonts |
| Mono / Label (JetBrains Mono uppercase) | JetBrains Mono | JetBrains Mono (Latin/digit only — keep mono chrome in Latin) | Google Fonts |

### Mixed-Content Strategy

Use **Strategy A — single-font-stack with fallback**: declare Noto Serif SC *after* the Latin face in the same `font-family` stack so Latin glyphs render in Archivo Black / Space Grotesk and CJK glyphs fall through to NSC automatically. JetBrains Mono chrome stays Latin/digit-only — topbar labels, slide-meta, axis ticks, and figure notes do not need a CJK fallback (and JetBrains Mono has no CJK glyphs by design).

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@300..700&family=JetBrains+Mono:wght@400..500&family=Noto+Serif+SC:wght@400;900&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: "Archivo Black", "Noto Serif SC", sans-serif;
  --font-body: "Space Grotesk", "Noto Serif SC", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
/* Display headlines use Noto Serif SC 900; body uses NSC 400. */
```

### Universal CJK Adjustments

- **Line-height**: bump CJK body line-height to ~1.55 (from 1.4) — Hanzi need more vertical breathing than Latin lowercase. For display NSC 900 at 100–220px, keep line-height tight at ~1.0 (NSC heavy weight at display size needs less leading than Archivo Black).
- **Letter-spacing**: zero out `letter-spacing` on Hanzi runs (negative tracking that flatters Archivo Black caps jams Hanzi strokes together). Keep tight tracking only on Latin spans.
- **Text-transform**: drop `text-transform: uppercase` on any display/label/mono when content is Hanzi — Chinese has no case; forcing uppercase does nothing for Hanzi but breaks the rendering of any mixed Latin acronyms inside.
- **Punctuation**: use Chinese full-width punctuation (，。：；「」) for Chinese sentences, half-width (`,.:;""`) for Latin. Never mix half-width punctuation into a Chinese sentence.
- **No period on headlines**: Chinese headline convention omits the terminal 。 — strip it from display strings.
- **Pangu spacing**: insert a thin space (or a regular space) between adjacent Hanzi and Latin/digit runs (e.g. `2026 年`, `AI 产品`). Improves readability of mixed runs.
- **One font per sentence**: don't switch CJK families mid-sentence. Pick a single weight of Noto Serif SC for a given text run, never two inside one phrase.

### Aesthetic Notes

Creative Mode's neo-brutalist register depends on Archivo Black's extreme density at 100–220px — there is no Hanzi face that matches this exact mass, so Noto Serif SC at weight 900 is the closest available substitute. NSC 900's modulated serif strokes will read as more literary than the punk-zine Archivo Black voice, but the four-color block palette, 4px ink borders, and hard 24px offset shadows do most of the brutalist work — the typography becomes one component of a louder system rather than the system itself. The "uppercase always" rule for Archivo Black is meaningless for Hanzi (no case), so drop both `text-transform: uppercase` and the -0.01em tracking when content switches to Chinese — NSC 900 stands on size and color alone. JetBrains Mono chrome (topbar pill, slide-meta, axis ticks, kicker block) intentionally stays Latin/digit-only: render `04 / 08` slide counters in mono, but render any Chinese descriptor label in NSC 400 inside the meta footer. The four accents (green / pink / orange / yellow), stat-cell color blocks, table treatment, and decorative geometry (stamp, badge, stacked blocks) are all content-agnostic.

### Known CJK Gap

**Heavy Latin display has no exact CJK equivalent.** Archivo Black's brutalist density at 220px is the system's signature — Noto Serif SC 900 is the heaviest commonly available Hanzi weight, but it reads as a literary serif rather than a poster-grotesk. Chinese decks built with Creative Mode will feel ~30% less "punk-zine" than the Latin original; compensate by leaning harder on the accent color blocks, the hard offset shadows, and the rotated badge / stamp elements. Avoid the alternative of `Smiley Sans Oblique` for display — its oblique cut conflicts with the system's strict orthogonal rectangle geometry. NSC has no italic axis, but the system doesn't use italic anywhere — no loss. The mono chrome's "technical spec" voice is best preserved by keeping all JetBrains Mono content in Latin/digit and reserving NSC for headline and body roles only.

## Iteration Guide

1. New slide layouts must respect the chrome frame: topbar at top:48px left:64px, slide-meta at bottom:40px left:64px.
2. Content begins at 96px from each side edge.
3. When adding a data section (chart, table, grid), pair a display headline above with JetBrains Mono labels inside.
4. Pick two or three accent fills per slide. Never mix all four on a single slide.
5. Hard shadows go on featured single elements only (marker, featured block). Grid cells do not get individual shadows.
6. New step/stat cards follow the existing color-sequence pattern: alternate cream with accents, end the sequence on green.
7. All borders are 4px solid ink. Internal sub-borders within a table or axis are 3px solid ink.
8. Rotated elements (badge, stamp) use single fixed angles (-4deg, -6deg). Do not introduce other angles.
9. Icons and illustrations are CSS-only geometric shapes (divs, borders, pseudo-elements). No external images or SVGs needed.

## Known Gaps

- The `deck-stage.js` script (slide advancement, keyboard nav) is an external dependency not documented here.
- Animation and transition between slides is not in scope for this template; all slides are static.
- The title slide poster contains a decorative toggle switch illustration built from nested divs; it has no functional state.
- Chart data (bar heights, values, labels) is hardcoded as inline styles and placeholder content — there is no data-binding layer.
- Table data is all placeholder; no dynamic population is supported.
- The `--rule` CSS variable (#0F0F0F, identical to `--ink`) is defined but not used explicitly — it is reserved for horizontal rule elements and can be considered an alias for ink.
- Font fallback for Archivo Black is `sans-serif` — the font must be loaded from Google Fonts for the design to render correctly.
