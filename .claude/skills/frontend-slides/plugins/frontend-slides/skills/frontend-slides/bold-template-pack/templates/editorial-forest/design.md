---
version: alpha
name: Editorial Forest
description: A serif-led editorial presentation system in the register of a literary quarterly or art-book monograph. Display type runs in Source Serif 4 at weight 500 with optical-size axis engaged, scaling up to 220px for cover and stat moments. The palette pairs a deep forest green (#2e4a2a) with a dusty rose pink (#e89cb1) over an oat-cream paper ground (#efe7d4), with JetBrains Mono as the editorial chrome (labels, captions, axis ticks). The aesthetic is closer to a Penguin classic, Apartamento spread, or quiet annual report than a tech keynote — confident, paper-feeling, and committed to a small color vocabulary.

colors:
  green: "#2e4a2a"
  green-deep: "#243a21"
  green-lite: "#3a5a36"
  pink: "#e89cb1"
  pink-deep: "#d27e96"
  cream: "#efe7d4"
  cream-2: "#e6dcc4"
  ink: "#1a1a17"

typography:
  display-hero:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 220
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -0.02em
  display:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 140
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 96
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: -0.02em
  headline:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 84
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 80
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.02em
  title-card-lg:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 84
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  title-card:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 68
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: -0.01em
  title-card-sm:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 56
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  figure-caption-serif:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 56
    fontWeight: 500
    lineHeight: 1.05
  name:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 44
    fontWeight: 600
    lineHeight: 1.0
  meta-value:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 32
    fontWeight: 500
  body-lg:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 32
    fontWeight: 400
    lineHeight: 1.32
  body:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 30
    fontWeight: 400
    lineHeight: 1.38
  body-card:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 26
    fontWeight: 400
    lineHeight: 1.34
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 26
    fontWeight: 500
    letterSpacing: 0.18em
    textTransform: uppercase
  label-tight:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 26
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
  caption-mono:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 24
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
  axis-mono:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 26
    fontWeight: 500
    letterSpacing: 0.08em
  stat-figure:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 220
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -0.03em
  stat-figure-unit:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 110
    fontWeight: 500
    lineHeight: 0.92

spacing:
  slide-pad-default: "96px 120px"
  slide-pad-narrow: "100px 120px"
  slide-pad-wide: "100px 140px"
  slide-pad-statement: "130px 160px"
  grid-gap-cards: 28
  grid-gap-topics: 24
  grid-gap-kpi: 60
  rule-weight: "2px"
  rule-weight-card: "2.5px"
  radius-card: "6px"
  radius-card-step: "8px"
  radius-bar-top: "3px 3px 0 0"
  radius-mark-circle: "50%"

canvas:
  width: 1920px
  height: 1080px

components:
  topic-tile:
    description: "Bordered or filled rectangular region holding a mono ordinal, a serif title, optional body, and a mono foot. Background may be green / green-lite / pink / cream-2-with-green-border. Corner radius 6px."
    borderRadius: "{spacing.radius-card}"
    padding: "40px 40px 36px"
  step-tile:
    description: "Vertical card carrying a mono ordinal, a serif title, body paragraph, and a mono marker row separated by a top rule. Background fills: cream-with-green-border, solid green, or solid pink."
    borderRadius: "{spacing.radius-card-step}"
    padding: "40px 32px 32px"
    minHeight: "470px"
    border: "2.5px solid currentColor-region"
  monogram-circle:
    width: "130px"
    height: "130px"
    borderRadius: "{spacing.radius-mark-circle}"
    border: "2px solid {colors.pink}"
    fontFamily: "JetBrains Mono"
    fontSize: 28
    letterSpacing: 0.1em
    fontWeight: 500
    description: "Outlined round mark holding a short mono monogram. The system's signature identity stamp."
  topbar:
    placement: "top edge of slide"
    layout: "flex space-between, baseline-aligned"
    content: "{components.label} on the left, monogram-circle or counter on the right"
  footline:
    position: "absolute"
    placement: "bottom edge of slide, full-width between slide padding"
    layout: "flex space-between"
    typography: "{typography.caption-mono}"
  meta-dl:
    description: "Three-column definition list separated by a top rule (2px {colors.green}). Each entry has a mono dt label and a serif dd value."
    columns: 3
    gap: "36px"
    topBorder: "2px solid {colors.green}"
  bar:
    width: "56px"
    borderRadius: "{spacing.radius-bar-top}"
    description: "Vertical chart bar in pink, cream, or green. Value label printed above bar in mono."
  chart-axis:
    border: "2px solid currentColor"
    description: "Y-axis and x-axis use a single 2px rule on the inner edges of the plot region; no full axis box."
  rule-thin:
    description: "Hairline 2px rule, used as section separator above kpi rows, summary grids, meta dls. Color follows region (green on cream, pink on green)."
  legend-swatch:
    display: "inline-block"
    width: "26px"
    height: "26px"
    borderRadius: "2px"
    description: "Small filled square preceding a mono legend label. 2px corner radius is the smallest radius in the system."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Editorial Forest is a **serif-led editorial presentation system** in the tonal register of a Penguin classic, a quiet annual report, or an art-book spread. The system's foundational premise is a single, confident typographic voice — Source Serif 4 — used at extreme scale (up to 220px) for headlines and stat figures, with JetBrains Mono playing the supporting role of editorial chrome (labels, captions, axis ticks, page footlines).

The serif is run at **weight 500** for nearly every display moment — never the more familiar 400 or 700. The 500 weight is the system's most distinctive typographic choice: heavy enough to feel authored, light enough to keep the page calm. Optical-size axis is engaged (`opsz` 8..60), which means the same Source Serif 4 face renders with subtly different letterforms at 26px caption sizes versus 220px display sizes — the small sizes pick up extra contrast and finer details automatically. JetBrains Mono runs at 500 in uppercase with 0.14em–0.18em letter-spacing, used for every label, tag, caption, axis tick, and footer line. The system never mixes a third typeface.

The palette is a tight five-color editorial set built around three primary surfaces: a **deep forest green** (`{colors.green}` — #2e4a2a), a **dusty rose pink** (`{colors.pink}` — #e89cb1), and an **oat cream paper** (`{colors.cream}` — #efe7d4). Two near-duplicates round out the set: `{colors.green-deep}` for green-on-pink text contrast, `{colors.green-lite}` for tile fills that need a second green shade, `{colors.pink-deep}` for pink-on-pink borders, and `{colors.cream-2}` for tiles that sit on the main cream surface. Body text everywhere is `{colors.ink}` (#1a1a17) — a warm near-black — except when sat on a green or pink surface, where it switches to the surface's complementary color (cream or pink on green; green-deep or cream on pink).

Depth is **flat and paper-based**. There are no drop shadows, no glows, no gradients, no overlays. Elevation is communicated entirely through color-block contrast, 2px hairline rules, and the difference between a filled region and a bordered region. The 6px and 8px card radii are the only roundness in the system besides the monogram circle. The page feels printed, not glassy.

**Density philosophy: spacious and committed.** Each slide carries one strong subject — a headline, a quote, a chart, a stat row, a card grid — surrounded by deep negative space. The slide padding of 96–140px is generous; the top of the slide carries a mono topbar (label + monogram or counter), the bottom carries a mono footline, and the middle holds the main subject at scale. A slide that crams two competing content blocks reads as broken; a slide with one display headline + supporting cards + breathing room reads as authoritative. Reach for fewer elements at larger sizes rather than more elements at smaller sizes.

**Key Characteristics:**
- Three-color editorial palette: deep forest green, dusty rose pink, oat cream paper. Two surface tones per slide is typical; three is loud.
- Source Serif 4 at weight 500 for every headline, body, and display moment. Optical-size axis engaged for size-aware letterforms.
- JetBrains Mono at weight 500 uppercase with wide tracking (0.14em–0.18em) for every label, caption, axis tick, and footline.
- Display type scales to 220px for cover and stat-figure moments; 96px for primary headlines; 56–84px for card titles.
- 2px hairline rules separate stacked sections — never thicker, never colored beyond region context.
- Card radius is 6px for topic tiles and 8px for step tiles. The monogram circle is the only fully round shape.
- Every slide carries a topbar (label + monogram or counter) and most carry a footline (mono caption row). The chrome anchors the editorial feel.
- No shadows, no gradients, no glows. Elevation is color-block + rule.

## Colors

### Palette
- **Green** (`{colors.green}` — #2e4a2a): The deep forest primary. Used as a slide surface, a tile fill, a card border, a meta-dl rule color, and a primary text color on cream surfaces. The most distinctive surface in the system.
- **Green Deep** (`{colors.green-deep}` — #243a21): A darker green used almost exclusively as text color on pink surfaces, where pure green would lack contrast. Also used as text color on pink tiles.
- **Green Lite** (`{colors.green-lite}` — #3a5a36): A lighter green used as a tile fill when two greens need to sit beside each other (e.g., a primary green tile next to a secondary green-lite tile in the same grid). Carries pink text.
- **Pink** (`{colors.pink}` — #e89cb1): A dusty rose. Used as a slide surface, a tile fill, the on-green text color, a bar-chart series color, and the monogram circle border color. The system's primary accent.
- **Pink Deep** (`{colors.pink-deep}` — #d27e96): A slightly darker rose used only as a border color on pink-filled tiles where the same-color border needs to differentiate from the fill.
- **Cream** (`{colors.cream}` — #efe7d4): The oat paper surface. The default slide background on non-cover slides, the on-green body text color, and the cream bar-chart series color.
- **Cream 2** (`{colors.cream-2}` — #e6dcc4): A subtly darker cream used as a tile fill on the cream slide surface. Pairs with a 2px green border so the tile reads as distinct from the slide ground.
- **Ink** (`{colors.ink}` — #1a1a17): The body text color on cream surfaces. A warm near-black; never pure #000.

### Defaults
- **Default slide background**: `{colors.cream}` for content-heavy slides; `{colors.green}` for cover, statement-data, summary, and any moment that needs gravity.
- **Default headline color on `{colors.cream}` surface**: `{colors.green}`.
- **Default headline color on `{colors.green}` surface**: `{colors.cream}` for primary headlines, `{colors.pink}` for hero / cover-scale headlines.
- **Default headline color on `{colors.pink}` surface**: `{colors.green-deep}`.
- **Default body color on `{colors.cream}` surface**: `{colors.ink}`.
- **Default body color on `{colors.green}` surface**: `{colors.cream}`.
- **Default body color on `{colors.pink}` surface**: `{colors.green-deep}`.
- **Default label / caption color**: matches the region's accent (label is pink on green, green on cream, green-deep on pink).
- **Default tile fill on a cream slide**: choose from the rotation — solid green (with pink text), solid pink (with green-deep text), green-lite (with pink text), or cream-2 with a 2px green border (with green text). A single grid typically mixes 3 of these 4.
- **Default rule color**: green on cream, pink on green, green-deep on pink. The 2px hairline always picks up the region's accent.

The palette is intentionally tight. Introducing a fourth chromatic family (a yellow, a blue, an additional rose) breaks the editorial discipline. Stick to the green / pink / cream triad and let the contrast between filled and bordered tiles do the variation work.

## Typography

### Font Family
The system loads exactly two web fonts: **Source Serif 4** (with the full optical-size axis 8..60 and weights 300–800) and **JetBrains Mono** (weights 400, 500, 700). Source Serif 4 carries every editorial moment — headlines, body, captions in serif, names, figures. JetBrains Mono carries every piece of chrome — labels, taglines, axis ticks, footlines, ordinals on tiles.

The mono / serif pairing is the system's typographic identity. Mono never tries to be the headline; serif never tries to be the caption. The roles are inverted from a typical "sans for chrome, serif for body" stack — here it's "mono for chrome, serif for body and display."

Source Serif 4 is run at **weight 500** for nearly every moment. Weight 400 appears only for body paragraphs (where the lighter weight reads better at small scale). Weight 600 appears once, for the attribution name on the statement slide — its slightly heavier set distinguishes a proper name from surrounding mono labels. Weight 700 is not used.

### Display, Body, and Chrome Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display-hero}` | 220px | Source Serif 4 | 500 | Cover-scale or closing-scale headline |
| `{typography.display}` | 140px | Source Serif 4 | 500 | Pull-quote / big-idea statement |
| `{typography.headline-xl}` | 96px | Source Serif 4 | 500 | Primary section headline on cream |
| `{typography.headline}` | 84px | Source Serif 4 | 500 | Primary section headline on green |
| `{typography.headline-sm}` | 80px | Source Serif 4 | 500 | Stat-row introductory headline |
| `{typography.title-card-lg}` | 84px | Source Serif 4 | 500 | Title inside a hero topic tile (largest tile in a grid) |
| `{typography.title-card}` | 68px | Source Serif 4 | 500 | Title inside a step tile |
| `{typography.title-card-sm}` | 56px | Source Serif 4 | 500 | Title inside a standard topic tile |
| `{typography.figure-caption-serif}` | 56px | Source Serif 4 | 500 | Centered figure / image-placeholder caption |
| `{typography.stat-figure}` | 220px | Source Serif 4 | 500 | KPI numeral |
| `{typography.stat-figure-unit}` | 110px | Source Serif 4 | 500 | Unit suffix on a KPI numeral (e.g. "%") |
| `{typography.name}` | 44px | Source Serif 4 | 600 | Personal name in an attribution row |
| `{typography.meta-value}` | 32px | Source Serif 4 | 500 | Definition-list value in a meta row |
| `{typography.body-lg}` | 32px | Source Serif 4 | 400 | Primary body paragraph in a summary or stat description |
| `{typography.body}` | 30px | Source Serif 4 | 400 | Standard body paragraph |
| `{typography.body-card}` | 26px | Source Serif 4 | 400 | Body inside a card or tile |
| `{typography.label}` | 26px | JetBrains Mono | 500 / 0.18em | Eyebrow or section label in topbar |
| `{typography.label-tight}` | 26px | JetBrains Mono | 500 / 0.14em | Caption row, foot line, attribution row, tile ordinal |
| `{typography.caption-mono}` | 24px | JetBrains Mono | 500 / 0.12–0.16em | Tile foot, tile marker, kpi tag, meta-dl term |
| `{typography.axis-mono}` | 26px | JetBrains Mono | 500 / 0.08em | Chart axis ticks and labels |

### Defaults
- **Default size for a primary section headline**: `{typography.headline-xl}` (96px) on cream surfaces, `{typography.headline}` (84px) on green surfaces.
- **Default size for a cover-scale or closing-scale moment**: `{typography.display-hero}` (220px).
- **Default size for a quote / big-idea statement**: `{typography.display}` (140px).
- **Default size for a body paragraph**: `{typography.body}` (30px) in serif weight 400.
- **Default size for a body paragraph inside a card / tile**: `{typography.body-card}` (26px).
- **Default size for a meta dt label or tile ordinal**: `{typography.caption-mono}` (24px) in JetBrains Mono uppercase.
- **Default size for a topbar label / eyebrow**: `{typography.label}` (26px) in JetBrains Mono uppercase with 0.18em tracking.
- **Default weight for any serif moment**: 500. (400 is reserved for body paragraphs; 600 only for a proper name in attribution.)
- **Default weight for any mono moment**: 500.

When unsure, reach for `{typography.headline-xl}` (96px) for the slide's primary headline on cream, not the larger display sizes. The 140–220px tier is reserved for statement, stat-figure, and hero/closing moments — using it for routine headlines flattens the system's hierarchy.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every JetBrains Mono element is UPPERCASE with letter-spacing of at least 0.08em.** Mono in sentence case or without tracking reads as code, not editorial chrome. The wide tracking is what makes mono feel like a caption row in a magazine, not a terminal.
- **Every Source Serif 4 display element uses negative letter-spacing (-0.01em to -0.03em).** Tighter tracking pulls the large serif glyphs into a single mass and is essential for the 96–220px sizes. Display serif at default tracking reads loose and untreated.
- **Display headlines use line-height between 0.92 and 1.02.** Tight line-height is part of the system's display voice. Larger headlines run tighter (0.92 at 220px); smaller headlines (84–96px) run at 0.96–1.0.
- **Body paragraphs use serif weight 400, not 500.** The weight drop from headline to body is the system's reading rhythm. Body at 500 reads heavy.
- **Every slide carries a topbar (mono label + monogram or counter on the opposite edge).** The topbar is the system's universal chrome anchor.
- **Hairline rules between sections are always 2px solid.** Never 1px (reads as web app), never 3px+ (reads as poster).

### Typography Principles
The weight 500 + optical-size + tight tracking combination is the system's display voice — switching any of those three properties (e.g., serif weight 700, or default tracking, or no opsz) reads as a different design system. The serif/mono role split is strict: mono never appears at headline scale, serif never appears at axis-tick scale.

Italics are not used anywhere in the system. Underline is not used. Emphasis is communicated through size and color contrast, not type variants.

## Layout

### Canvas System
The system targets a fixed **1920×1080** canvas. Slides are `<section>` elements at exact width/height; rendering relies on `deck-stage.js` to scale the canvas to fit the viewport. The canvas is paper, not a viewport — designed for projector, printer, or PDF export.

### Slide Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.slide-pad-default}` | 96px 120px | Standard slide padding |
| `{spacing.slide-pad-narrow}` | 100px 120px | Data, framework, stats slides — slightly taller top padding |
| `{spacing.slide-pad-wide}` | 100px 140px | Cover, summary slides — extra side padding for hero headlines |
| `{spacing.slide-pad-statement}` | 130px 160px | Statement slide — most generous padding for the display-quote moment |

Pick the padding that matches the content gravity. Statement-class moments get the widest padding; everyday content slides use the default 96×120.

### Chrome Anatomy
Every slide carries (at minimum) a **topbar** at the top edge — a flex-row with a JetBrains Mono `{typography.label}` on one side and either a `{components.monogram-circle}` or a mono counter / location string on the other. Heavier slides (cover, data, summary) also carry a **footline** absolutely positioned at `bottom: 60–80px` with a mono caption row spanning the slide width between the padding.

The topbar is the system's spine. Without it, a slide reads as untreated.

### Card Radii
| Value | Use |
|---|---|
| 2px | Legend swatch only (smallest radius in the system) |
| 3px 3px 0 0 | Top corners of bar-chart bars |
| 6px | Topic tile (agenda-style grid) |
| 8px | Step tile (framework-style grid) |
| 50% | Monogram circle |

Cards are subtly rounded — never sharp-cornered, never heavily-rounded. The 6–8px radius gives the system its paper-not-plastic feel.

## Depth and Elevation

### Flat, No Shadows
There are **no shadows in this system**. Not on cards, not on tiles, not on text, not on the monogram circle. Elevation is communicated entirely through:

1. **Color-block contrast** — a green tile on a cream slide reads as elevated because the dark green block separates from the paper ground.
2. **2px hairline rules** — section separators (above kpi rows, summary grids, meta dls) sit on a 2px line in the region's accent color.
3. **Border vs fill** — a cream-2 tile with a 2px green border reads as a different elevation than a solid-fill tile beside it.

The absence of shadow is itself the elevation language. Adding `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` would shatter the editorial feel.

### Paper-Surface Rule
Every surface in the system reads as paper, not as a digital pane. The cream tones (`{colors.cream}`, `{colors.cream-2}`) carry that quality literally. The green and pink surfaces inherit it by association — used at full saturation, surrounded by cream chrome, never with shadow or glow, they read as printed ink on stock.

## Shapes and Treatment

### Border Weight and Style
- **2px solid** — the universal hairline. Section separator rules above kpi rows / summary grids / meta dls / chart axes; the border on cream-2 tiles; the border on the monogram circle.
- **2.5px solid** — step-tile borders. Slightly heavier so the tile reads as a separate object from a hairline rule.

Borders take the region's accent color (`{colors.green}` on cream, `{colors.pink}` on green, `{colors.green-deep}` or `{colors.pink-deep}` on pink).

### Decorative Element Types

**Monogram Circle** (`{components.monogram-circle}`) — A 130px outlined circle with a 2px pink border, holding a 2–3-character JetBrains Mono monogram at 28px. Lives in the top-right of cover and summary slides. The system's identity stamp.

**Topbar** (`{components.topbar}`) — A flex row spanning the top of every slide. A JetBrains Mono label on one side, a monogram or counter or location string on the other. The topbar establishes which surface family the slide belongs to (label color tells you).

**Footline** (`{components.footline}`) — An absolutely positioned flex row at `bottom: 60–80px` spanning the slide between padding. Two mono caption strings (e.g., a section name on the left, a page number on the right). Used on cover, data, summary, and any slide that wants to feel like a printed page.

**Topic Tile** (`{components.topic-tile}`) — A 6px-radius rectangular region holding a mono ordinal, a serif title, optional body, and a mono foot string. Background fills rotate through green, green-lite, pink, or cream-2-with-green-border. A grid of these tiles is the agenda / table-of-contents pattern.

**Step Tile** (`{components.step-tile}`) — An 8px-radius vertical card with 2.5px border, holding a mono ordinal, a serif title (68px), a body paragraph, and a mono marker row separated by a top rule. Background fills: cream-with-green-border, solid green, or solid pink. A row of 3–4 step tiles is the framework / process pattern.

**KPI Block** — A vertical stack: mono tag (24px) on top, oversized serif figure (220px) with optional 110px unit, then a serif description paragraph (30px). Sits inside a row separated above by a 2px pink rule on green surfaces.

**Bar (chart)** — A 56px-wide rectangle with top corners rounded at 3px, filled in pink, cream, or green. The value label is mono 24px, absolutely positioned 38px above the bar.

**Meta Definition List** (`{components.meta-dl}`) — A three-column dt/dd grid with a 2px top border. The dt is mono 24px uppercase tracked, the dd is serif 32px weight 500. Used as a credits / specs / details row at the bottom of a two-column slide.

**Legend Row** — A horizontal flex of mono uppercase items, each preceded by a 26×26px filled swatch with 2px corner radius. Used in chart and data contexts.

## Do's and Don'ts

### Do
- Run every display headline in Source Serif 4 at weight 500 with negative letter-spacing (-0.01em to -0.03em) and tight line-height (0.92–1.0). The combination is the system's voice.
- Run every label, caption, tag, axis tick, and footline in JetBrains Mono at weight 500 uppercase with 0.08em–0.18em letter-spacing.
- Place a topbar (mono label + monogram or counter) on every slide. The topbar is the system's spine.
- Pick a single dominant surface per slide (green, pink, or cream) and let it carry the whole canvas. Two surface colors per slide is the maximum.
- Pair tile fills in a grid: rotate through green + pink + green-lite + cream-2-with-green-border rather than reusing one fill across all tiles.
- Use 2px solid hairline rules to separate stacked sections (kpi rows, summary grids, meta dls). The hairline is the system's separator language.
- Scale display type aggressively when content allows — 140–220px for statement, hero, and closing moments. The system rewards bigness when there's room.
- Use generous slide padding (96–160px). Negative space is part of the editorial register; cramped padding reads as broken.
- Reserve the monogram circle for cover and summary moments. Using it on every slide dilutes its function as an identity stamp.

### Don't
- Don't add box-shadow to any element. The system is shadow-free; adding shadow shatters the paper feel.
- Don't introduce a third typeface. Only Source Serif 4 and JetBrains Mono. No Inter, no system stack.
- Don't run serif text in italic or underline. Emphasis is size and color, not type variant.
- Don't render JetBrains Mono in sentence case or without letter-spacing. Mono without uppercase + tracking reads as code, not chrome.
- Don't introduce a fourth chromatic family (yellow, blue, lavender). The green / pink / cream triad is the entire palette.
- Don't use heavy borders (4px+) or thin hairlines (1px). The system has 2px and 2.5px — pick one.
- Don't pile two competing content blocks on one slide. One subject per slide; expand or split.
- Don't use rgba transparency for surface colors. Each surface is solid ink-on-paper.
- Don't run serif body text at weight 500 — it reads heavy. Body is weight 400; display is weight 500.
- Don't omit the topbar. A slide without the mono label at the top loses its editorial spine.

## Responsive Behavior

This is a **fixed 1920×1080 presentation system** rendered through `deck-stage.js`. The canvas is not responsive in the web sense — there are no media queries, no breakpoints, no fluid sizing. Every measurement is in fixed pixels at 1920×1080.

### Scaling Behavior
The `deck-stage.js` script wraps each `<section>` and scales the 1920×1080 canvas uniformly to fit the browser viewport, letterboxing as needed. Type, padding, gaps, and rule weights are all in pixels and scale proportionally with the canvas. Borders that read as 2px at 1920px will read as 1px at 960px viewport width — this is acceptable inside the system's tolerance.

### Presenter Behavior
Navigation is delegated to whatever wrapper `deck-stage.js` provides — there is no inline keyboard handler. Treat each `<section>` as a slide; the runtime handles transitions.

### Print / Export
Because every measurement is fixed-pixel inside a 1920×1080 canvas, the system exports cleanly to PDF at the same aspect ratio (16:9). Source Serif 4 with the optical-size axis renders well at print resolution because the small-sized variants pick up the print-appropriate letterform detail automatically.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Chinese Face | Weight | Why |
|---|---|---|---|
| Display headline (220 / 140 / 96 / 84px) | 霞鹜文楷 LXGW WenKai (Noto Serif SC fallback) | 400 | Literary, handwritten-ish brushwork; matches the Penguin-classic register of Source Serif 4 |
| Body paragraph (26 / 30 / 32px) | 思源宋体 Noto Serif SC | 400 | Reads as the printed body voice of a literary quarterly |
| Stat figure (220px) | 思源宋体 Noto Serif SC | 700 | Mincho weight 700 gives the numeric mass that Source Serif 4 weight 500 provides in Latin |
| Mono label / caption / footline (24–26px) | 思源等宽 Noto Sans Mono CJK SC | 500 | JetBrains Mono has no CJK glyphs; Noto Sans Mono CJK SC preserves the typewriter-chrome quality |

### Mixed-Content Strategy

Use **Strategy C** — keep Source Serif 4 as the Latin face and fall back to LXGW WenKai (for headlines / display) or Noto Serif SC (for body / stats) for CJK glyphs. This is the right call for Editorial Forest because the Source Serif 4 optical-size axis is a signature of the system; replacing it wholesale with a Mincho would flatten the Penguin-classic register that defines the deck. The font-family stack puts the Latin face first, then the CJK fallback, then the generic serif:

```css
font-family: 'Source Serif 4', 'Source Serif Pro', 'LXGW WenKai TC', 'Noto Serif SC', Georgia, serif;
```

Browsers per-glyph fall back: Latin characters render in Source Serif 4 at weight 500 with opsz engaged, Chinese characters render in LXGW WenKai (display) or Noto Serif SC (body). The baseline mismatch at display sizes (96–220px) is the main thing to watch — LXGW WenKai sits slightly higher than Source Serif 4 in optical baseline, so a mixed-script line like "Designed in 北京" may show a 1–2px vertical wobble. Acceptable for slide content; for printed export, prefer all-CJK or all-Latin lines.

### Loading

Add to the existing Google Fonts `<link>` (or as a second link tag):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

LXGW WenKai TC is the version served on Google Fonts (the Simplified-Chinese build `LXGW+WenKai+SC` is not yet on the Google CDN — TC ships both traditional and simplified glyphs and works for both).

### Universal CJK Adjustments

These adjustments apply to **every CJK block** in this system, regardless of size or role:

- **Loosen line-height by 0.05–0.08.** CJK glyphs are full-width squares with more visual weight than Latin letterforms; line-heights tuned for Latin (0.92–1.0 on display, 1.32–1.38 on body) read as cramped in Chinese. Bump display to 1.0–1.1 and body to 1.5–1.6.
- **Remove negative letter-spacing on CJK headlines.** Source Serif 4 display uses -0.01em to -0.03em tracking, which collides Chinese glyphs into each other. For CJK runs, set `letter-spacing: 0` — or a tiny positive `0.02em` if the headline feels visually packed.
- **Never `text-transform: uppercase` on CJK text.** Chinese has no case; the CSS property does nothing on Han glyphs but will silently break any mixed-script line where the Latin portion was meant to be capitalized.
- **Use Chinese full-width punctuation** (`，。：；！？「」『』（）`) inside Chinese sentences, not the Latin equivalents (`,.:;!?""''()`). Mixing punctuation systems within one sentence reads as a typesetting error.
- **No period (。) at the end of CJK headlines.** Chinese headlines follow the same rule as Latin — title-style lines drop terminal punctuation. Body paragraphs keep their 。
- **Apply Pangu spacing (盘古之白) at the boundary between CJK and Latin runs.** A space (or 0.25em margin) belongs between a Chinese character and an adjacent Latin word or digit, e.g. `2026 年 5 月` not `2026年5月`. Either type the spaces manually or use a `pangu.js`-style auto-spacer.
- **One font per sentence.** Don't switch between LXGW WenKai and Noto Serif SC inside the same sentence — pick the face that matches the size tier (display = LXGW WenKai, body = Noto Serif SC) and commit to it for the whole run.

### Aesthetic Notes for This System

Editorial Forest's whole voice is "Penguin classic / quiet annual report" — a serif at weight 500 with the optical-size axis doing the size-aware letterform work. The Chinese equivalent of that register is **LXGW WenKai for display moments** (it has the same hand-set, slightly informal warmth as Source Serif 4 at 500) and **Noto Serif SC at 400 for body** (the calm Mincho voice that reads like a literary journal). Avoid Noto Sans SC for body — the sans face flips the system into "tech report" rather than "monograph spread."

The system's mono / serif role split (JetBrains Mono for chrome, Source Serif 4 for everything else) maps cleanly onto Chinese. Use Noto Sans Mono CJK SC for the topbar label, footline strings, tile ordinals, and axis ticks — keep them uppercase-equivalent (i.e., 0.14em–0.18em letter-spacing on Latin labels, and for Chinese, the Mono CJK face at 500 weight provides the same chrome quality). Do not run Chinese labels in LXGW WenKai or Noto Serif SC; the editorial chrome would lose its typewriter feel.

### Known CJK Gap

LXGW WenKai's brushwork warmth is its strength at large display sizes, but at body scale (26–32px) the same brushwork reads slightly noisy. The system bumps body to Noto Serif SC (a cleaner Mincho) to avoid this, but the visual handoff between a 96px LXGW WenKai headline and a 30px Noto Serif SC paragraph below it is the system's biggest CJK seam — the two faces have different stroke contrast profiles. If the seam reads loud, use Noto Serif SC for both display and body (sacrifices warmth for consistency), or use LXGW WenKai for both (sacrifices body legibility for consistency). The default split is the right trade-off for most decks, but worth a manual check on cover and statement slides.

## Iteration Guide

1. Any new headline is Source Serif 4 weight 500 with negative letter-spacing. Pick the size from the display ladder (220 / 140 / 96 / 84 / 80 / 68 / 56) — do not invent a new size.
2. Any new label, caption, or tag is JetBrains Mono weight 500 uppercase with 0.08em–0.18em letter-spacing. Pick the size from the mono ladder (26 / 24).
3. Any new slide carries a topbar at the top. The mono label color follows the surface (pink-on-green, green-on-cream, green-deep-on-pink).
4. Any new card uses 6px (topic tile) or 8px (step tile) radius. The monogram circle is the only fully round shape; do not introduce a fourth radius.
5. Any new section separator is a 2px hairline rule in the region's accent color. No 1px rules, no 3px rules.
6. Any new fill color must come from the existing palette (`{colors.green}`, `{colors.green-lite}`, `{colors.pink}`, `{colors.cream}`, `{colors.cream-2}`). Do not introduce a yellow, blue, or third pink.
7. Any new body paragraph is serif weight 400 at 26–32px. Do not run body at weight 500.
8. Any new KPI figure is `{typography.stat-figure}` (220px). Smaller KPI sizes are not in the system — if the layout can't accommodate 220px, restructure the slide.
9. Any new chart uses the bar treatment (pink / cream / green fills, mono axes, 2px axis rules) on a green surface. The data composition is part of the system identity.
10. When in doubt, reach for fewer elements at larger sizes. The system's editorial register collapses when crowded.

## Known Gaps

- The system depends on `deck-stage.js` for canvas scaling and slide navigation. The script is not described in this design.md — treat it as a runtime dependency.
- Source Serif 4 and JetBrains Mono are loaded from Google Fonts via `<link>`. Offline rendering will fall back to Georgia serif and Menlo mono respectively, which will preserve the rough character but lose the optical-size axis and the JetBrains Mono identity. Self-hosting recommended for offline / print reliability.
- The Source Serif 4 optical-size axis (`opsz` 8..60) is critical to the system's quality — using a non-opsz fallback face flattens the size-aware letterform contrast.
- The bar chart uses hand-set bar heights (`%` of a fixed 520px plot region). There is no data-binding — extending the chart requires manually computing heights.
- The monogram circle, footline strings, and tile counters carry hardcoded text in the source. Replacing them with a deck's actual identity is required per-deck.
- The system has no `@media print` rule and no responsive breakpoints — it is fixed 1920×1080 and relies on `deck-stage.js` for any viewport adaptation.
- The green-on-pink and pink-on-green text contrast ratios are sufficient at the display sizes used (84px+) but would fail WCAG AA at body-text sizes. Do not put 26px body text in pink-on-green or green-on-pink — keep small text in cream-on-green or ink-on-cream.
