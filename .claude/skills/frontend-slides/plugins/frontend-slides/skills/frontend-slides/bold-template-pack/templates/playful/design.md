---
version: alpha
name: Playful
description: "A warm, hand-crafted editorial system built on a peach-clay canvas with charcoal ink as the only \"color.\" Display type runs in Syne (weight 700–800, tight negative tracking); body type runs in Space Grotesk at weight 400–500. The aesthetic borrows from independent studio decks, risograph zines, and sketchbook spreads: organic blob frames, scribbled SVG doodles, slightly rotated cards, and double-stroke offset borders give every slide a hand-touched, unpolished warmth. The effect is creative-studio editorial, not corporate pitch — confident but human, structured but loose."

colors:
  bg: "#F0C8A0"
  bg-alt: "#E8B88E"
  light: "#F7DEC6"
  text: "#1A1A1A"

color-aliases:
  accent: text

typography:
  display-hero:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(4rem, 10vw, 9rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.03em
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(3rem, 8vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.02em
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.01em
  statement:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  title-sm:
    fontFamily: "Syne, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.2
  number-hero:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(4rem, 8vw, 7rem)"
    fontWeight: 800
    lineHeight: 1.0
  number-md:
    fontFamily: "Syne, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.0
  number-sm:
    fontFamily: "Syne, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.0
  body:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(1rem, 1.2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 500
    lineHeight: 1.6
  label-eyebrow:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.15em
    textTransform: uppercase
  caption:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.4
  tag:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2

spacing:
  pad-slide-lg: "4rem 5rem"
  pad-slide-md: "3rem 4rem"
  pad-card-lg: "2rem 3rem"
  pad-card-md: "1.5rem"
  gap-lg: "3rem"
  gap-md: "2rem"
  gap-sm: "1.5rem"

canvas:
  width: 100vw
  height: 100vh

components:
  rough-box:
    border: "3px solid {colors.text}"
    background: "{colors.bg}"
    padding: "1.5rem"
    offsetShadowOffset: "6px 6px"
    offsetShadowBorder: "2–3px solid {colors.text}"
    description: "Generic content card with a double-stroke effect — the inner box has a 3px solid border, and an absolutely-positioned ::before pseudo-element offsets a second 2–3px border down-and-right by 6–8px to simulate a hand-drawn double outline. No fill on the offset; the canvas shows through."
  filled-block:
    background: "{colors.text}"
    color: "{colors.bg}"
    padding: "1.5rem"
    description: "Inverted card: dark charcoal background with peach text. Used as the visual counterpoint to outlined cards in a collage of mixed treatments."
  blob-frame-organic:
    border: "3px solid {colors.text}"
    borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%"
    description: "Organic outlined blob, asymmetric border-radius. Decorative wrapper that holds a smaller solid filled-blob inside it."
  blob-frame-pebble:
    border: "3px solid {colors.text}"
    borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px"
    description: "Pebble-shaped frame with extreme alternating border-radius — two opposing corners pulled long, the other two pinched short. Reads as a hand-drawn lozenge."
  blob-fill:
    background: "{colors.text}"
    borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
    description: "Solid dark blob with asymmetric organic radius. Used inside an outlined blob-frame or floating on its own as decorative mass."
  scribble-svg:
    stroke: "{colors.text}"
    strokeWidth: 2
    fill: none
    strokeLinecap: round
    description: "Inline SVG path drawn as a single hand-drawn line — wavy stub, scribbled circle, star outline, squiggle, arrow. Always 2px stroke, rounded caps. Placed absolutely in corners and edges as decorative breath."
  doodle-circle:
    border: "3px solid {colors.text}"
    borderRadius: "50%"
    description: "Plain round outlined circle used as a decorative anchor in slide corners."
  doodle-rect:
    border: "3px solid {colors.text}"
    rotation: "5–10deg"
    description: "Plain outlined rectangle, slightly rotated, used as a decorative anchor in slide corners."
  card-rotated:
    transform: "rotate(-3deg to 3deg)"
    description: "Any card or block can carry a small ±3deg rotation. Rotations stagger so adjacent cards rotate in opposite directions — never all in the same direction, never more than 3deg."
  step-node-circle:
    width: 64px
    height: 64px
    border: "3px solid {colors.text}"
    borderRadius: "50%"
    background: "{colors.bg}"
    fontFamily: "Syne, sans-serif"
    fontSize: 1.5rem
    fontWeight: 800
    description: "Round outlined node containing a single numeric digit at display weight. Used as a timeline or process marker; alternates between outlined (bg fill) and filled (charcoal fill, bg text)."
  avatar-placeholder:
    width: 60px
    height: 60px
    background: "{colors.text}"
    borderRadius: "50%"
    description: "Solid dark circle used as a portrait stand-in inside a team or people card."
  tag-pill:
    background: "{colors.text}"
    color: "{colors.bg}"
    padding: "0.4rem 0.8rem"
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    description: "Small charcoal pill with peach text, anchored to the bottom-left of an image frame as a category label."
  bar-chart:
    barFillSolid: "{colors.text}"
    barFillOutlined: "3px solid {colors.text} + transparent"
    axisStroke: "3px solid {colors.text}"
    description: "Custom HTML bar chart. Bars are either solid charcoal (primary series) or outlined transparent (secondary series). Axes are 3px solid charcoal lines, no grid."
  vertical-text:
    fontFamily: "Syne, sans-serif"
    fontWeight: 700
    letterSpacing: 0.1em
    transform: "rotate(90deg)"
    description: "Display-weight text rotated 90deg, anchored to a slide edge as a magazine-style spine label."
  ghost-blob:
    background: "{colors.text}"
    borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%"
    opacity: 0.08
    description: "Oversized organic blob at very low opacity placed behind content as atmospheric wallpaper. Functions like a watermark cloud."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Playful is a **hand-crafted editorial system** anchored by a single warm canvas — a peach-clay `{colors.bg}` (#F0C8A0) — with charcoal `{colors.text}` (#1A1A1A) as the only meaningful "color." Everything reads as ink-on-clay-paper. There are no secondary brand colors, no gradients, no chromatic accents. The system commits fully to a one-color discipline and finds its expressiveness in shape, weight, rotation, and hand-drawn marks rather than in palette variety.

The typeface stack is **Syne for display, Space Grotesk for body**. Syne is the personality — a high-contrast display sans with quirky humanist proportions that reads as a contemporary independent studio voice, not a corporate sans. It is used at weights 700 and 800 with tight negative letter-spacing (-0.01em to -0.03em) for every headline, statement, statistic, and number. Space Grotesk is the workhorse — a steady, neutral geometric sans at weight 400–500 for body and 500–600 for labels. The pairing reads as "expressive editorial built on a reliable grid."

The color philosophy is **monochrome warmth**: a single ink color on a single warm surface, plus two tonal siblings of the canvas (`{colors.bg-alt}` slightly darker for image placeholders, `{colors.light}` slightly lighter for gentle layering). The peach is saturated enough to read as a deliberate aesthetic choice, not a neutral. The ink is slightly softened from pure black (#1A1A1A) to sit comfortably on the warm paper. The system's emotional register is "studio sketchbook" — confident but warm, structured but unpolished.

Depth is **double-stroke offset borders** and **hand-drawn marks**, not blurred shadows. The signature treatment: a 3px charcoal border on a card, plus a `::before` pseudo-element offset down-and-right by 6–8px carrying a second 2–3px border — the visual effect is a hand-drawn double outline that suggests imperfect tracing. Combined with small rotations (±0.5deg to ±3deg on cards) and scribbled SVG paths placed in slide corners, the system reads as crafted-by-hand rather than rendered-by-software.

**Density philosophy: medium-low.** Each slide is anchored by a single dominant element — a statement, a chart, a roster — surrounded by deliberate breathing room and one or two decorative scribbles. Crowding the canvas with simultaneous cards, doodles, and copy collapses the hand-touched feeling into clutter. The correct density is one substantive moment per slide with one or two SVG scribbles or organic blobs serving as visual punctuation in the negative space.

**Key Characteristics:**
- Peach-clay canvas (`{colors.bg}`) with charcoal ink (`{colors.text}`) as the only color. No secondary brand palette.
- Syne at weight 700–800 with negative letter-spacing for every display and numeric moment; Space Grotesk at 400–500 for body.
- Double-stroke offset borders on cards — a 3px outline plus a 6–8px offset ghost border via `::before`.
- Small ±0.5deg to ±3deg rotations on cards, blocks, and statistics for a hand-placed feel.
- Organic blob shapes with asymmetric border-radius act as decorative frames and fills.
- Inline 2px-stroke SVG scribbles (squiggles, stars, circles, arrows) live in slide corners as hand-drawn punctuation.
- No web shadows. Depth comes from double borders, rotation, and ink-density contrast.
- One dominant element per slide with generous negative space — never wall-to-wall content.

## Colors

### Palette
- **Background** (`{colors.bg}` — #F0C8A0): The peach-clay canvas. The default surface for every slide. Saturated enough to be the system's signature; warm enough that charcoal ink reads softly rather than starkly.
- **Background Alt** (`{colors.bg-alt}` — #E8B88E): A slightly darker tonal sibling of the canvas. Used as a fill for image placeholder regions and for subtle surface differentiation when one card needs to read as "behind" another without committing to a new color.
- **Light** (`{colors.light}` — #F7DEC6): A slightly lighter tonal sibling of the canvas. Available for gentle layering when a region needs to lift off the background by a single tonal step without introducing white.
- **Text/Ink** (`{colors.text}` — #1A1A1A): Charcoal ink — the single non-canvas color in the system. Softened from pure black so it sits as warm ink on warm paper. Used for all body text, all display text, all borders, all SVG strokes, all filled blocks, all dark fills.

The `accent` alias resolves to `{colors.text}` — the system has no separate accent color. The "accent" in Playful is contrast against the canvas, not a third hue.

### Defaults
- **Default surface background**: `{colors.bg}` — every slide opens on peach-clay.
- **Default headline color**: `{colors.text}` — always. Headlines are never tinted or recolored.
- **Default body text color**: `{colors.text}` — sometimes at opacity 0.7–0.9 for de-emphasis, but the underlying color remains charcoal.
- **Default border color**: `{colors.text}` — every outlined card, blob, doodle, and chart axis is charcoal.
- **Default text color on filled charcoal blocks**: `{colors.bg}` — peach text on dark surfaces is the only color inversion.
- **Default image-placeholder fill**: `{colors.bg-alt}` — slightly darker than the canvas so the placeholder reads as a distinct region without using white.
- **Default decorative-blob fill**: `{colors.text}` at full opacity (foreground) or at 0.08 opacity (atmospheric ghost-blob behind content).

The system has no concept of "primary vs secondary color." Every visual decision is a binary between canvas (peach) and ink (charcoal), modulated by opacity, scale, and shape.

## Typography

### Font Family
The system pairs two carefully chosen Google Fonts:

- **Syne** (display): A contemporary humanist display sans with quirky letterforms, narrow apertures, and slightly compressed proportions. Used at weight 700 and 800 for every display moment — headlines, statements, titles, numerals, vertical labels. Its character is what distinguishes Playful from a generic warm-toned deck: Syne reads as an independent studio voice, not a corporate header.
- **Space Grotesk** (body): A clean, slightly geometric sans-serif with a friendly humanist warmth. Used at weight 400–500 for body paragraphs, 500–600 for labels and captions. Provides a steady, legible counterweight to Syne's expressiveness.

There is no third face. Italic and underline are not used. Emphasis comes from weight (700 → 800), size, and the Syne-vs-Space-Grotesk contrast itself.

### Type Scale

| Token | Size (clamp) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display-hero}` | 4–9rem | Syne | 800 | Oversized cover or opening date/title |
| `{typography.display}` | 3–7rem | Syne | 800 | Closing or major declarative headline |
| `{typography.headline}` | 2.5–5rem | Syne | 700 | Primary section headline |
| `{typography.statement}` | 2.5–4.5rem | Syne | 700 | Long-form quoted statement or manifesto line |
| `{typography.title}` | 2–3.5rem | Syne | 700 | Region or section title |
| `{typography.number-hero}` | 4–7rem | Syne | 800 | Hero statistic numeral |
| `{typography.number-md}` | 2.5rem | Syne | 800 | Mid-scale ordinal or stat numeral |
| `{typography.number-sm}` | 2rem | Syne | 800 | Inline ordinal or step numeral |
| `{typography.title-sm}` | 1.3rem | Syne | 700 | Card title within a small block |
| `{typography.body-md}` | 1.2rem | Space Grotesk | 500 | Subtitle or emphasized body |
| `{typography.body}` | 1–1.1rem | Space Grotesk | 400 | Paragraph body |
| `{typography.label-eyebrow}` | 0.85rem | Space Grotesk | 600 | Section eyebrow above a headline, uppercase tracked |
| `{typography.caption}` | 0.85rem | Space Grotesk | 500 | Subtitle, fine print, footnote |
| `{typography.tag}` | 0.75rem | Space Grotesk | 600 | Pill tag text inside a charcoal label |

### Defaults
- **Default size for a primary section headline**: `{typography.headline}` (2.5–5rem clamp).
- **Default size for a cover or major opening moment**: `{typography.display-hero}` (4–9rem clamp).
- **Default size for paragraph body**: `{typography.body}` (1–1.1rem clamp).
- **Default size for a subtitle or emphasized lead body**: `{typography.body-md}` (1.2rem).
- **Default size for any inline caption, footnote, or fine print**: `{typography.caption}` (0.85rem).
- **Default size for a hero numerical figure**: `{typography.number-hero}` (4–7rem clamp).
- **Default size for a stat tile or ordinal numeral**: `{typography.number-md}` (2.5rem).
- **Default weight for any display element (headline, statement, title, numeral)**: 700 or 800 — never lower.
- **Default weight for any body element**: 400 or 500.

When unsure between `{typography.title}` and `{typography.headline}` for the primary text on a slide, reach for `{typography.headline}` — `{typography.title}` is for sub-regions within a slide.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every display element is set in Syne.** Headlines, statements, titles, numerals, vertical labels, decorative single-character marks — all Syne. Using Space Grotesk at large sizes is the wrong system signal.
- **Every Syne element uses negative letter-spacing**: -0.01em to -0.03em depending on size. Syne at default tracking reads as untreated; the negative tracking is what gives display type its tight, compressed personality.
- **Every body and label element is set in Space Grotesk.** Syne for body paragraphs reads as overwrought.
- **Eyebrow labels are uppercase with 0.15em letter-spacing.** A label without uppercase + tracked spacing reads as a body fragment, not a label.
- **Statistics and numerals are always weight 800.** Even mid-scale numerals (2rem) follow the display-weight convention. A weight-500 numeral reads as inventory, not a brag.
- **Numerals and statistics may carry a small rotation (±0.5deg to ±1deg)** when they sit as standalone stat-items rather than inside a chart or table. The rotation reinforces the hand-placed feeling.

### Typography Principles
The system's typographic rhythm comes from the **Syne-vs-Space-Grotesk contrast**, not from mixing weights within a face. A slide that uses only Syne at varying weights reads as monotonous; a slide that uses only Space Grotesk reads as understated to the point of corporate. The correct rhythm is Syne headline + Space Grotesk body, repeated with discipline.

Line-height: tight on display (0.85–1.1), generous on body (1.5–1.7). Never use tight line-height on body or generous line-height on display — both inversions break the rhythm.

Italic does not exist in this system. Underline does not exist. Emphasis is achieved by switching face (body → display) or weight (400 → 700), never by italicizing.

## Layout

### Canvas System
The system targets `100vw × 100vh` — full viewport. Every `.slide` is absolutely positioned to fill the viewport, and only the `.active` slide is visible (opacity 1, others at opacity 0). Slide navigation is JS-driven via arrow keys, space, click on next/prev buttons, and touch swipe. A 4px-tall charcoal progress bar runs along the bottom of the viewport, growing to indicate slide position. All sizes use `clamp()` so the layout fluidly scales without breakpoints down to a mobile reflow at 768px.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-slide-lg}` | 4rem 5rem | Cover, statement, and closing slides — generous outer padding |
| `{spacing.pad-slide-md}` | 3rem 4rem | Standard content slides — outer padding |
| `{spacing.pad-card-lg}` | 2rem 3rem | Large card or contact block interior padding |
| `{spacing.pad-card-md}` | 1.5rem | Standard card interior padding |
| `{spacing.gap-lg}` | 3rem | Large grid/flex gaps between major regions |
| `{spacing.gap-md}` | 2rem | Standard grid/flex gaps between cells |
| `{spacing.gap-sm}` | 1.5rem | Tight inline gaps |

### Chrome
A fixed 48px×48px navigation cluster sits at bottom-right (prev arrow, slide counter, next arrow — all outlined in 2px charcoal). A 4px-tall charcoal progress bar runs flush along the bottom edge of the viewport. Neither is part of the slide composition; they exist as the deck's persistent presenter chrome and should not be styled against.

The progress bar and nav buttons are the only persistent UI elements. Slides themselves carry no top bar, no footer chrome, no slide numbers within the canvas.

## Depth and Elevation

### Double-Stroke Offset Border (Primary Technique)
The signature depth treatment is a **double-stroke offset border**. A card carries a 3px solid charcoal border, and a `::before` pseudo-element absolutely positioned over the card carries a second 2–3px border offset 6–8px down-and-right. The offset border has no fill — the canvas shows through. The visual effect is a hand-drawn double outline that suggests imperfect tracing, like a pen pulled twice along an edge. This is the system's elevation device; it replaces what most systems would do with a `box-shadow`.

### Rotation (Secondary Technique)
Small rotations (±0.5deg to ±3deg) on cards, blocks, statistics, and decorative shapes provide a hand-placed feeling. Rotation directions alternate across adjacent elements — never two cards rotated the same direction next to each other — to suggest someone laid each piece down by hand rather than via a snapped grid.

### Atmospheric Ghost-Blob
A signature treatment: an oversized organic blob (`{components.ghost-blob}`) filled with charcoal at 0.08 opacity, placed absolutely in a slide corner as atmospheric wallpaper. The blob reads as a soft watermark cloud behind the content. Use sparingly — at most one ghost-blob per slide, anchored to a corner the primary content does not occupy.

### No Web Shadows
The system uses **no `box-shadow` blur values, no `drop-shadow`, no rgba shadows**. All apparent depth comes from the double-stroke offset border, rotation, and ink-density contrast. A blurred shadow on any element breaks the hand-crafted aesthetic — the marks should look drawn, not rendered.

## Shapes and Treatment

### Border Radius Scale
| Value | Use |
|---|---|
| 0px | Cards, blocks, tags, image frames, table cells |
| 50% | Round avatar placeholders, step-node circles, doodle circles |
| Asymmetric organic (e.g. `40% 60% 70% 30% / 40% 50% 60% 50%`) | Blob frames and blob fills only |
| Pebble-asymmetric (e.g. `255px 15px 225px 15px / 15px 225px 15px 255px`) | Pebble-shaped frames only |

The system avoids smooth medium radii (4px, 8px, 12px) — corners are either sharp, perfectly round, or organically blob-shaped. The middle ground reads as a generic web app, which is the wrong signal.

### Border Weights
- **3px solid `{colors.text}`** — the standard outlined-card and blob-frame border weight.
- **2–3px solid `{colors.text}`** — the offset ghost-border weight on the `::before` pseudo-element (slightly thinner than the primary).
- **3px solid `{colors.text}`** — the chart axis weight (X and Y axes on bar charts).
- **2px solid `{colors.text}`** — the nav-button border weight and the timeline-track horizontal line.
- **2px stroke** — the standard SVG scribble stroke weight with rounded line-caps.

### Decorative Element Types

**Rough-box card** — A rectangular content card with the signature double-stroke offset border. Background can be canvas peach (default), or solid charcoal (inverted card). Padding from the `{spacing.pad-card-*}` scale. Optional small rotation (±0.5–3deg).

**Organic blob frame** — A decorative outlined wrapper with asymmetric border-radius. Used as a portrait frame or decorative anchor; often holds a smaller solid blob-fill inside. Two characteristic shapes: the wavy organic blob (`{components.blob-frame-organic}`) and the pebble shape (`{components.blob-frame-pebble}`).

**Solid blob fill** — A charcoal organic shape with asymmetric border-radius. Used either inside an outlined blob-frame (creating a frame-and-mass pairing) or floating alone as a decorative mass.

**Scribble SVG** — Inline SVG path drawn as a single 2px-stroke charcoal line with round caps. The vocabulary: wavy stub, star outline, scribbled circle, squiggle waveform, arrow, concentric circles. Placed absolutely in slide corners or edges as decorative breath. Every slide gets at least one scribble; the most populated slides carry two or three.

**Doodle circle / doodle rect** — Plain outlined circle or rectangle, slightly rotated, placed absolutely in slide corners as a minimal decorative anchor. The simpler counterpart to the blob shapes — when a slide needs visual punctuation but a blob would feel too organic.

**Step-node circle** — A 64px round outlined node containing a single digit in Syne 800. Alternates between outlined (canvas fill, charcoal digit) and filled (charcoal fill, canvas digit) in sequence — odd steps filled, even steps outlined, or any consistent pattern.

**Tag pill** — A small charcoal rectangle with peach text at 0.75rem weight 600. Anchored to the bottom-left of an image frame as a category label. The only inverted text-on-charcoal element that is not a full card.

**Vertical spine label** — Syne 700 text at 1.5rem rotated 90deg, anchored to a slide's right edge with 0.1em letter-spacing. Reads as a magazine-spine wayfinder.

**Ghost-blob wallpaper** — Oversized organic blob at 0.08 opacity, placed absolutely in a slide corner as atmospheric wallpaper.

**Connector arrow doodle** — A small SVG sketched arrow (single 2px line with chevron head) used to suggest "next" or "see also" in the negative space of a slide.

## Do's and Don'ts

### Do
- Use Syne for every display moment (headline, statement, title, number, vertical label) and Space Grotesk for every body and label. The two-face contrast is the system's typographic rhythm.
- Apply negative letter-spacing (-0.01em to -0.03em) to every Syne element. Default tracking on Syne reads as untreated.
- Apply the double-stroke offset border to every primary content card — 3px main outline plus a 6–8px offset ghost border via `::before`. This is the system's signature elevation device.
- Place a scribbled SVG mark (squiggle, star, circle, arrow) in at least one corner of every slide as hand-drawn breath. The marks are punctuation, not content.
- Give cards, blocks, and statistics a small ±0.5–3deg rotation. Alternate rotation direction across adjacent elements so nothing reads as snapped to a grid.
- Use `{colors.text}` (charcoal) as the only ink color. Headlines, body, borders, scribbles, fills — all the same color.
- Reach for `{colors.bg-alt}` when a region needs to read as a distinct surface without introducing white or a new color.
- Let negative space breathe. One dominant element per slide plus one or two scribbles is the correct density.
- Pair an outlined blob frame with a smaller solid blob fill inside it when you need a portrait-like decorative anchor.
- Place an oversized ghost-blob (charcoal at 0.08 opacity) in a slide corner when the negative space feels empty but a scribble would be too small.

### Don't
- Don't introduce a third color. The system is peach-canvas + charcoal-ink only. No blues, no reds, no chart-segment palettes — chart bars are solid charcoal or outlined charcoal, never colored.
- Don't use blurred `box-shadow`. All depth comes from double borders and rotation. A blurred shadow breaks the hand-drawn aesthetic immediately.
- Don't apply medium border-radius values (4px, 8px, 12px). Corners are sharp, fully round, or organically blob-shaped — nothing between.
- Don't use Space Grotesk for headlines or display moments. Syne is the personality face; substituting Space Grotesk loses the studio voice.
- Don't use Syne for body paragraphs. It reads as overwrought at small sizes and at low weights.
- Don't rotate elements more than 3deg. Beyond ±3deg the hand-placed feeling tips into wonky and amateur.
- Don't rotate every element in the same direction. Alternate ±directions across adjacent elements; uniformity reads as a tilted canvas, not as hand-placement.
- Don't crowd a slide with simultaneous cards, statistics, and doodles. The system reads as expensive when sparse and broken when dense.
- Don't use italic or underline for emphasis. Switch face or weight instead.
- Don't put display-weight text at default tracking. Always tighten Syne with negative letter-spacing.

## Responsive Behavior

The system targets `100vw × 100vh` and uses `clamp()` throughout, so type and padding scale fluidly between viewport sizes without media queries. A single media query at `max-width: 768px` reflows multi-column grids to single-column, collapses the horizontal timeline track to vertical, and reduces slide padding to 2rem.

### Presenter Behavior
- Slides advance via `ArrowRight`, `Space`, or `Enter`.
- Slides reverse via `ArrowLeft`.
- The active slide carries the `.active` class; inactive slides are visibility-hidden at opacity 0.
- Slide transitions use a 0.6s opacity fade.
- A 4px-tall charcoal progress bar runs along the bottom of the viewport, growing as the deck advances.
- A bottom-right nav cluster shows prev/next buttons (48px outlined squares) and the current/total slide counter.
- Touch swipe horizontal on mobile advances/reverses.

### Print Behavior
No `@media print` rule is defined. The deck is web/viewport-first; printing will not render correctly without custom print styles.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face | Chinese face | Weight |
|---|---|---|---|
| Display / headline / numeral (Syne 700–800) | Syne | 站酷快乐体 ZCOOL KuaiLe | 400 (only weight available) |
| Body / label (Space Grotesk 400–600) | Space Grotesk | 悠哉字体 Yozai | 400 |

### Mixed-Content Strategy

Strategy A — extend each token's `fontFamily` to include the Chinese face after the Latin face. Syne tokens become `"Syne, ZCOOL KuaiLe, sans-serif"`; Space Grotesk tokens become `"Space Grotesk, Yozai, sans-serif"`. Latin glyphs render in the original face; CJK characters fall through automatically.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&family=ZCOOL+KuaiLe&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/cn-fontsource-yozai-regular/font.css" rel="stylesheet">
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

Playful is a hand-crafted editorial system built on Syne (quirky humanist display) plus Space Grotesk (warm geometric body) on a peach-clay canvas. The Chinese transfer is exceptionally strong because both Chinese faces selected here carry the same "warm, hand-touched, independent studio" register as the Latin pairing.

**站酷快乐体 ZCOOL KuaiLe** is a rounded, friendly Chinese display face with quirky humanist proportions — the closest CDN-available equivalent to Syne's expressive studio voice. At display weights (4–9rem), KuaiLe reads as a contemporary independent Chinese studio voice, not a corporate or formal one. It pairs naturally with the peach canvas and charcoal ink. **Drop the negative letter-spacing (-0.01em to -0.03em) for Chinese display** — KuaiLe is designed on a square em-box and tightening causes glyph collision. The face's intrinsic warmth replaces what negative tracking does for Syne.

**悠哉字体 Yozai** is a Chinese sans-serif designed for relaxed body reading — slightly rounded terminals, friendly humanist proportions, designed to match the warmth that Space Grotesk brings to Latin. Set every Chinese body paragraph and label in Yozai 400. The eyebrow label treatment (0.15em letter-spacing + uppercase in Latin) does not transfer to CJK; for Chinese eyebrows, use Yozai at the same 0.85rem size with letter-spacing 0 and no uppercase — small size alone reads as label.

The double-stroke offset border, the small ±3deg rotations, the organic blob shapes, the SVG scribbles, the ghost-blob wallpaper — all script-agnostic. The single-color discipline (peach + charcoal) and the hand-crafted aesthetic survive the script switch fully.

The system's typographic rhythm (Syne-vs-Space-Grotesk contrast) becomes (KuaiLe-vs-Yozai contrast) in pure Chinese — both pairs carry the same "expressive editorial built on a reliable grid" rhythm. Statistics and numerals are pure digits and transfer unchanged in Syne 800; only when a stat carries a Chinese unit suffix (`亿`, `万`) does the suffix glyph fall through to KuaiLe.

### Known CJK Gap

ZCOOL KuaiLe and Yozai are both single-weight faces (400). The system's reliance on weight contrast (Syne 700 vs 800 for sub-display hierarchy; Space Grotesk 400 vs 500 vs 600 for label hierarchy) collapses to size-only hierarchy in pure Chinese. This is not a meaningful loss — Playful's hierarchy is primarily size-driven anyway, and the missing weight steps don't change the visual rhythm enough to matter. The rotation, scribble, and double-border treatments carry the system's character regardless of weight availability.

## Iteration Guide

1. Any new card uses the rough-box pattern: 3px charcoal border, peach background (or charcoal if inverted), padding from `{spacing.pad-card-*}`, and a `::before` ghost-border offset 6–8px down-and-right at 2–3px weight.
2. Any new card carries a small rotation (±0.5–3deg). Alternate rotation direction with neighboring cards; never align all cards to the same angle.
3. Any new headline uses Syne at weight 700–800 with negative letter-spacing. If the headline is the primary slide moment, reach for `{typography.headline}` or `{typography.display}` — not `{typography.title}` (which is sub-region scale).
4. Any new body or label uses Space Grotesk at weight 400–600. Use `{typography.label-eyebrow}` (0.85rem, weight 600, uppercase, 0.15em tracking) for the small label above a headline.
5. Any new statistic or numeral uses Syne at weight 800 with negative letter-spacing. Even small numerals (2rem) follow the display-weight convention.
6. Any new slide gets at least one scribbled SVG mark in a corner — squiggle, star, circle, arrow. Stroke 2px with rounded line-caps in `{colors.text}`.
7. Any decorative shape uses asymmetric organic border-radius (blob) or sharp 0px (rectangle) or 50% (round). Avoid medium radii.
8. If the slide negative space feels heavy, add a ghost-blob (charcoal at 0.08 opacity, oversized organic shape) anchored to a corner the content does not occupy.
9. Charts (bar, donut, line) use only `{colors.text}` and `{colors.bg-alt}` as fills. Do not introduce chromatic chart palettes.
10. Cards may be either outlined (default — canvas fill, charcoal border, charcoal text) or inverted (charcoal fill, peach text). Inverted cards are the system's emphasis device; reserve them for the cell you want to anchor the slide's attention.

## Known Gaps

- The system loads two Google Fonts (Syne, Space Grotesk) over the network. If fonts fail to load, the fallback sans-serif will render but the system's voice will be lost. Self-hosting is recommended for production.
- The double-stroke offset border (`::before` with 6–8px offset) requires the parent card to have `position: relative` and the pseudo-element to be visually inside the card's bounding box plus the offset. Cards near a slide edge may have their offset border clipped.
- The mobile responsive breakpoint at 768px reflows grids but does not adjust the absolutely-positioned decorative SVGs and blobs — they remain at desktop coordinates and may overlap or fall off-screen on small viewports. Treat the responsive behavior as basic, not polished.
- The peach canvas (#F0C8A0) has a strong cultural register (earthy, warm, slightly rustic). It does not pair well with cool-toned brand palettes and is not interchangeable with a neutral cream or white — the warmth is foundational.
- Image placeholders (`{colors.bg-alt}` fills with a centered "IMG 01" label) are stubs only. Production decks need real images that respect the warm palette; cool-toned photos will fight the canvas.
- There is no defined dark-mode variant. The system is single-mode (warm peach canvas only).
- The hover states on nav buttons (background fills to charcoal, text inverts to peach) are interactive presenter-chrome behaviors and are not part of the deck's slide composition.
