---
version: alpha
name: Cartesian
description: A quiet, museum-catalog editorial system built on Playfair Display serif headlines, Inter sans body, and a five-tone warm-stone palette. The aesthetic is "consulting deck meets architectural monograph" — minimal geometric line decorations (thin circles, dashed arcs, vertical and horizontal hairlines) drift behind content, suggesting drafting paper and compass work. Every divider is a single 1px line in a muted taupe; nothing is bold, nothing is loud. The cultural reference is Massimo Vignelli's editorial work, the Cooper Hewitt catalog, and pencil-and-tracing-paper urban planning documents.

colors:
  bg-primary: "#EDE8E0"
  bg-secondary: "#E2DBD1"
  text-primary: "#1A1A1A"
  text-secondary: "#5A5A5A"
  accent: "#8A8178"
  line: "#B8B0A4"
  white-overlay: "rgba(255, 255, 255, 0.3)"

typography:
  display:
    fontFamily: "Playfair Display, serif"
    fontSize: "clamp(3rem, 6vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.1
  h1:
    fontFamily: "Playfair Display, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.1
  h2:
    fontFamily: "Playfair Display, serif"
    fontSize: "clamp(1.8rem, 3.5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
  h3:
    fontFamily: "Playfair Display, serif"
    fontSize: "clamp(1.2rem, 2vw, 1.6rem)"
    fontWeight: 400
    lineHeight: 1.1
  stat-figure:
    fontFamily: "Playfair Display, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
  agenda-numeral:
    fontFamily: "Playfair Display, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
  team-initial:
    fontFamily: "Playfair Display, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
  quote-mark:
    fontFamily: "Playfair Display, serif"
    fontSize: "5rem"
    fontWeight: 400
    lineHeight: 1
  card-headline:
    fontFamily: "Playfair Display, serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.1
  timeline-headline:
    fontFamily: "Playfair Display, serif"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.6
  subtitle:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(1rem, 1.5vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.5
  attribution:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 2px
    textTransform: uppercase
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 3px
    textTransform: uppercase
  micro:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
    textTransform: uppercase

spacing:
  pad-y: "4vh"
  pad-x: "4vw"
  gap-xl: "6vw"
  gap-lg: "5vw"
  gap-md: "3vw"
  gap-sm: "2vh"
  card-pad: "4vh 2vw"

canvas:
  width: 100vw
  height: 100vh

components:
  card:
    border: "1px solid {colors.line}"
    padding: "{spacing.card-pad}"
    background: "{colors.white-overlay}"
    description: "Tracing-paper card — 1px taupe outline with semi-transparent white fill that lets the canvas tone bleed through. No radius, no shadow."
  card-icon:
    width: 40px
    height: 40px
    border: "1px solid {colors.line}"
    borderRadius: "50%"
    color: "{colors.accent}"
    fontSize: "1rem"
    description: "Small ringed circle (40px) containing a 1–3 character Roman numeral or letter in accent taupe."
  agenda-row:
    padding: "2vh 0"
    borderBottom: "1px solid {colors.line}"
    description: "List row separated only by a 1px taupe hairline. Numeral at left, label at right."
  timeline-rule:
    height: "1px"
    background: "{colors.line}"
    description: "Single horizontal 1px taupe line connecting timeline items. No nodes, no markers — just the line."
  vertical-line:
    width: "1px"
    height: "100%"
    background: "{colors.line}"
    opacity: 0.3
    description: "Optional decorative vertical hairline anchored at left edge (default 8vw from edge) at low opacity. Provides drafting-paper grid feel."
  horizontal-accent:
    width: "20vw"
    height: "1px"
    background: "{colors.text-primary}"
    description: "Single short ink-black 1px horizontal line used as a strong accent rule. Black, not taupe."
  geo-circle:
    border: "1px solid {colors.line}"
    borderRadius: "50%"
    opacity: 0.5
    description: "Thin solid taupe ring at low opacity, used as decorative geometry behind content."
  geo-arc:
    border: "1px dashed {colors.line}"
    borderRadius: "50%"
    opacity: 0.3
    description: "Thin dashed taupe ring at very low opacity, paired with geo-circle to suggest compass construction."
  geo-decoration:
    border: "1px solid {colors.line}"
    borderRadius: "50%"
    description: "Large decorative ring (30–50vw diameter) anchored to a corner or center. Always pairs with a ::before pseudo-element rendering a smaller dashed ring inside it, suggesting concentric drafting."
  geo-ring:
    width: "50vw"
    height: "50vw"
    border: "1px solid {colors.line}"
    borderRadius: "50%"
    opacity: 0.3
    description: "The largest geometric decoration variant — a 50vw centered ring with an inner ::before dashed ring at 70% diameter."
  image-placeholder:
    background: "{colors.bg-secondary}"
    border: "1px solid {colors.line}"
    description: "Solid taupe-tinted block with two crossed 1px diagonal hairlines via ::before/::after at +30° and -30°, suggesting an X over a blank frame. Holds a small uppercase label centered."
  team-photo:
    width: "12vw"
    height: "12vw"
    borderRadius: "50%"
    border: "1px solid {colors.line}"
    background: "{colors.bg-secondary}"
    description: "Circular portrait frame (12vw) in slightly darker stone, ringed in taupe, holding a single Playfair initial in accent taupe at center."
  nav-arrow:
    width: 40px
    height: 40px
    border: "1px solid {colors.line}"
    background: "transparent"
    description: "Square 40px button with 1px taupe border holding an arrow glyph. Hover state inverts to ink fill with cream text."
  nav-dot:
    width: 8px
    height: 8px
    borderRadius: "50%"
    background: "{colors.line}"
    description: "Small taupe dot at right edge as navigation indicator. Active state shifts to ink and scales 1.3."
  chart-stroke-primary: "{colors.text-primary}"
  chart-stroke-comparison: "{colors.line}"
  chart-comparison-dash: "5, 5"
  chart-grid-color: "{colors.bg-secondary}"
  chart-axis-tick-color: "{colors.accent}"
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Cartesian is a **quiet museum-catalog editorial system**. Its defining premise is **restraint through 1px lines**. Every structural element — list separators, agenda rules, timeline connectors, card borders, table dividers — is a single 1px line in a muted taupe `{colors.line}`. There are no thick borders, no fills, no shadows, no rounded surfaces. Hierarchy is built through type contrast and negative space; depth does not exist in the conventional sense.

The typeface stack is a literary-monograph pairing. **Playfair Display** — a high-contrast didone-influenced serif — carries every headline, every stat numeral, every card title, every team initial, every quote mark. Playfair runs at weight 400 (regular) almost exclusively — there is no use of bold or 700-weight Playfair in the system. The thin-stroke didone aesthetic depends on letting the letterforms breathe at modest weights. **Inter** — a clean modern grotesque — carries every body paragraph, every subtitle, every label, every attribution. Inter runs at 400 for body and 500 for labels. The pairing creates the system's editorial voice: serif statements + clean sans supporting structure.

The palette is **five warm stones plus ink**. The canvas is `{colors.bg-primary}` — a warm sandstone off-cream. A slightly deeper stone `{colors.bg-secondary}` provides subtle region differentiation (image placeholders, team photo frames). Ink `{colors.text-primary}` is the headline color; medium gray `{colors.text-secondary}` is body. A warmer taupe `{colors.accent}` carries labels, attribution, and small numerals. The lightest taupe `{colors.line}` is the universal 1px line color. There are no accent colors in the populist sense — no red, no orange, no blue. The palette is stone, stone, stone, ink, ink. The only "color" in the system is type contrast.

Depth is **entirely absent in the conventional sense**. There are no shadows, no elevated cards, no rounded surfaces, no gradients. Atmosphere is created by **geometric line decorations**: thin solid and dashed circles in `{colors.line}` at 20–50% opacity drift behind content as if drawn on tracing paper with a compass. These do not create hierarchy — they create mood. The decorative geometry signals "drafted, considered, precise."

**Density philosophy: sparse and breathing.** Cartesian reads as elegant when sparse and broken when crowded. A correctly composed slide pairs one Playfair headline with one body paragraph, or one chart with one short caption, framed by generous negative space. Most slide composition uses centered or asymmetric two-column layouts with `5–6vw` gutters and significant vertical breathing room. The decorative compass arcs reinforce the sparseness — they are most effective when there is room around them. A slide that feels broken in this system is one packed edge-to-edge with content; the correct density is "one clear idea, well-framed, on stone paper."

**Key Characteristics:**
- Warm sandstone canvas `{colors.bg-primary}` with single 1px taupe `{colors.line}` dividers as the universal structural element.
- Playfair Display serif at weight 400 for every headline/numeral/quote-mark; Inter sans for every body/label/attribution.
- Five-tone monochrome palette: two stones, two grays, one ink. No vivid accent colors anywhere.
- Decorative geometric rings (thin solid + dashed circles, 20–50% opacity) drift behind content as compass-drafted atmosphere.
- Every label, attribution, and micro-text is uppercase Inter with 2–3px letter-spacing.
- All borders are 1px hairlines; no element has a thicker border, a shadow, or a rounded fill.
- Right-edge vertical nav-dot column, bottom-left square nav-arrow buttons, bottom-right mono slide counter.
- Image placeholders carry a signature pair of crossed 1px diagonals (an X) over a stone-tinted block.

## Colors

### Stone & Ink Palette
- **Background Primary** (`{colors.bg-primary}` — #EDE8E0): The canvas. Warm sandstone off-cream — closer to "manila folder" than "white paper." This is the default slide background.
- **Background Secondary** (`{colors.bg-secondary}` — #E2DBD1): A slightly deeper stone, used for image placeholders, team-photo frames, and any region that needs subtle separation from the canvas without a colored fill or a border.
- **Text Primary** (`{colors.text-primary}` — #1A1A1A): Near-black ink. Used for headlines, stat numerals, and the special `{components.horizontal-accent}` rule. The strongest contrast color in the system.
- **Text Secondary** (`{colors.text-secondary}` — #5A5A5A): Medium warm gray. Used for all body paragraph text. Softer than ink — readable but recedes.
- **Accent** (`{colors.accent}` — #8A8178): Warm taupe. Used for labels, attributions, agenda numerals, slide counter, card-icon text, team-member role text. The system's "small text" color.
- **Line** (`{colors.line}` — #B8B0A4): Pale taupe. The universal 1px line color: card borders, agenda rules, timeline connectors, team-photo rings, nav-arrow borders, geo-decoration rings.

### Defaults
- **Default surface background**: `{colors.bg-primary}`.
- **Default headline color**: `{colors.text-primary}` — always ink, never colored, never accent-taupe. Playfair headlines are uniformly ink.
- **Default body text color**: `{colors.text-secondary}` (medium warm gray).
- **Default label / attribution / micro-text color**: `{colors.accent}` (warm taupe).
- **Default border color**: `{colors.line}` — every 1px structural border. Never use ink-black for borders except the rare `horizontal-accent` rule.
- **Default secondary surface fill**: `{colors.bg-secondary}`.
- **Default chart primary series color**: `{colors.text-primary}` (ink).
- **Default chart comparison/secondary series color**: `{colors.line}` with 5px dashed stroke.
- **Default chart grid color**: `{colors.bg-secondary}`.
- **Default chart axis tick color**: `{colors.accent}`.

Cartesian has **no accent color in the populist sense.** A red callout, a blue bar, a green stat — none of these exist. When emphasis is needed, increase type size, switch from sans to serif, or add a single 1px `horizontal-accent` rule in ink. Color is not the emphasis mechanism in this system; restraint is.

## Typography

### Font Family
The system runs on a **two-face conversation**: `Playfair Display` (serif, weights 400/600/700, italic available) carries every headline, stat numeral, quote mark, card title, and team initial; `Inter` (sans, weights 300/400/500/600) carries every body, subtitle, label, attribution, and micro-text. There is no third face.

Playfair Display is used almost exclusively at **weight 400 (regular)**. The system deliberately avoids bold Playfair — the didone aesthetic relies on thin-stroke modulation that disappears at heavier weights. Italic Playfair is available (loaded) but not exercised in the default template; reserve it for inline emphasis inside body copy.

Inter runs at weight 400 for body, weight 500 for labels and micro-text, weight 600 for the rare emphasized inline element. The contrast between Playfair's high-modulation serif and Inter's even sans is the system's primary typographic rhythm.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | clamp(3rem, 6vw, 5.5rem) | Playfair Display | 400 | Cover or large opening title |
| `{typography.h1}` | clamp(2.5rem, 5vw, 4.5rem) | Playfair Display | 400 | Section-opening or large closing headline |
| `{typography.h2}` | clamp(1.8rem, 3.5vw, 3rem) | Playfair Display | 400 | Primary slide headline |
| `{typography.h3}` | clamp(1.2rem, 2vw, 1.6rem) | Playfair Display | 400 | Sub-headline within a region |
| `{typography.card-headline}` | 1.3rem | Playfair Display | 400 | Card or pillar-block title |
| `{typography.timeline-headline}` | 1.2rem | Playfair Display | 400 | Timeline-step or phase headline |
| `{typography.stat-figure}` | 2rem | Playfair Display | 400 | Numerical stat figure (typically inline in a stats cluster) |
| `{typography.team-initial}` | 2rem | Playfair Display | 400 | Initial letter centered inside a team-photo circle |
| `{typography.agenda-numeral}` | 1.5rem | Playfair Display | 400 | Ordinal numeral preceding an agenda row |
| `{typography.quote-mark}` | 5rem | Playfair Display | 400 | Opening quotation glyph for a pull-quote |
| `{typography.subtitle}` | clamp(1rem, 1.5vw, 1.3rem) | Inter | 400 | Subtitle paragraph below a display headline |
| `{typography.body}` | clamp(0.9rem, 1.2vw, 1.1rem) | Inter | 400 | Standard paragraph body |
| `{typography.body-sm}` | 0.9rem | Inter | 400 | Compact body inside cards or timeline items |
| `{typography.attribution}` | 0.85rem | Inter | 400 | Attribution line below a quote, with 2px tracking + uppercase |
| `{typography.label}` | 0.75rem | Inter | 500 | Section label / eyebrow above a headline, with 3px tracking + uppercase |
| `{typography.micro}` | 0.7rem | Inter | 400 | Image label, slide counter, smallest chrome text |

### Defaults
- **Default size for the primary slide headline**: `{typography.h2}` (clamp 1.8–3rem).
- **Default size for a cover or large opening headline**: `{typography.h1}` (clamp 2.5–4.5rem); for the most expansive cover, `{typography.display}` (clamp 3–5.5rem).
- **Default size for paragraph body**: `{typography.body}` (clamp 0.9–1.1rem).
- **Default size for any inline label or eyebrow**: `{typography.label}` (0.75rem) — always 3px tracking + uppercase.
- **Default weight for any Playfair headline**: 400. Don't reach for 600 or 700.
- **Default weight for body**: 400.
- **Default weight for labels/micro**: 500.
- **Default size for a stat numeral inside a stats cluster**: `{typography.stat-figure}` (2rem). Cartesian does not have a hero-stat-numeral pattern (no 5–7rem display stat); stats are presented as inline ranks at modest scale.

When unsure, reach for `{typography.h2}` for the slide's primary text moment, not `{typography.h3}` (which is a sub-headline within a region).

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Playfair headline, stat, quote, card title, and initial is set at weight 400.** Bold Playfair does not exist in this system. The thin-stroke didone aesthetic is the identity.
- **Every Playfair element is set in sentence case (or true title case for proper nouns).** Uppercase Playfair is not used.
- **Every Inter label, attribution, and micro-text element is uppercase with 2–3px letter-spacing.** Labels at 3px tracking; attributions and micro at 2px. Without the tracking, Inter caps read as untreated.
- **Every Playfair element is rendered in `{colors.text-primary}` (ink).** Headlines are never accent-taupe and never gray. The exception is decorative initial letters inside a circular `card-icon` or `team-photo`, where the letterform is rendered in `{colors.accent}`.
- **Every 1px structural border uses `{colors.line}`.** Other border colors do not exist except for the rare `horizontal-accent` rule in ink.
- **Every card, image-placeholder, team-photo, and nav-arrow border is 1px solid.** Thicker borders do not exist in this system.
- **Charts use ink-black for the primary series and dashed taupe (5px, 5px) for the comparison series.** This pair is the only chart-color rule.

### Typography Principles
The Playfair-400 + Inter-400 combination is the system's voice. Switching either family or jumping Playfair to weight 700 reads as a different design system. Italic emphasis is permitted via inline `<em>` inside body copy (Inter italic) — italic Playfair is loaded but reserved for rare uses. Underline is not used.

Line-height stays open: headlines at 1.1, body at 1.6. The wide body line-height is part of the breathing-room aesthetic.

## Layout

### Canvas System
The canvas is `100vw × 100vh` — full viewport with hidden overflow. Each `.slide` is absolutely positioned to fill the viewport; one slide carries `.active` (opacity 1, visibility visible) at a time. Transitions are 0.6s opacity + visibility fades.

### Padding and Gap Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-y}` | 4vh | Default vertical slide padding |
| `{spacing.pad-x}` | 4vw | Default horizontal slide padding |
| `{spacing.gap-xl}` | 6vw | Major two-column gutter (most spacious) |
| `{spacing.gap-lg}` | 5vw | Standard two-column or grid gutter |
| `{spacing.gap-md}` | 3vw | Card-grid gutter |
| `{spacing.gap-sm}` | 2vh | Agenda row vertical padding, attribution spacing |
| `{spacing.card-pad}` | 4vh 2vw | Internal padding for content cards |

Headlines typically carry a 2–3vh margin-bottom from labels above and a 2vh margin-bottom from body below. Section headers above 3-card or 4-team grids carry a 6vh margin-bottom from the grid (significant breathing room).

### Decorative Geometry Layer
Cartesian's signature is its **drafting-paper geometric decoration**. Every slide may layer one or more of:
- A large ringed `geo-decoration` anchored to a corner (typically 30–50vw diameter) with an inner dashed ring at ~80% diameter (the `::before` pseudo).
- A `vertical-line` at ~8vw from the left edge running floor-to-ceiling at 30% opacity.
- A `horizontal-accent` (a single short black 1px line) anchored at 15vh from the bottom-left.
- A centered `geo-ring` (50vw circle) on closing or contemplative slides.

These elements have **no informational role** — they create atmosphere. Slides without any geometric decoration are valid; over-decoration (more than two geo elements per slide) breaks the restraint.

### Chrome
The system's chrome is minimal:
- Right-edge vertical column of small `nav-dot` indicators (8px circles in taupe).
- Bottom-left pair of square `nav-arrow` buttons (40×40, 1px taupe border, transparent fill).
- Bottom-right `slide-counter` text in Inter at 0.75rem with 2px tracking in `{colors.accent}`.

There is no top chrome bar, no persistent header, no footer rule.

## Depth and Elevation

### Flat Plane (Only Technique)
Cartesian has no shadows, no elevated cards, no rounded surfaces, no gradients. Every element sits on a single plane.

Hierarchy is constructed from:
- **Type contrast** — Playfair serif vs Inter sans; size scale from 5rem down to 0.7rem.
- **1px hairline dividers** — agenda rows, timeline rule, card outlines, image-placeholder outlines, stats top-border, team-photo rings, nav-arrow borders.
- **Color tone** — ink vs gray vs taupe.
- **Negative space** — generous padding around every element.
- **Geometric atmosphere** — compass-drafted rings behind content suggest depth without creating it.

Introducing a `box-shadow`, an elevated card, or a soft gradient breaks the restraint that defines the system.

## Shapes and Treatment

### Border Radius
| Value | Use |
|---|---|
| 50% (circle) | Every circular element: `card-icon` (40px), `team-photo` (12vw), `nav-dot` (8px), `geo-circle`, `geo-arc`, `geo-decoration`, `geo-ring` |
| 0 | Everything else: cards, image-placeholders, nav-arrows, agenda rows, timeline, stat-blocks, chart container |

The system uses **only two radius values**: 50% (true circle) or 0 (sharp rectangle). Soft-rounded corners do not exist.

### Border Weights
- **1px solid `{colors.line}`** — the universal structural border. Used on every card, image-placeholder, team-photo ring, nav-arrow, agenda row bottom, timeline rule, stats top, geo-circle, geo-decoration.
- **1px dashed `{colors.line}`** — used on `geo-arc` and the inner `::before` ring inside `geo-decoration` / `geo-ring`. Dashed signals "construction line / arc."
- **1px solid `{colors.text-primary}`** — used only on the rare `horizontal-accent` decorative rule. The system's only ink-black line.
- **Chart bar/line stroke widths** — Chart.js series at 1px (bar borders), 2px (line series). Comparison series at 2px dashed (5px dash, 5px gap).

All structural borders are `{colors.line}`. Thicker borders, colored borders, and dashed structural borders (other than geo-arcs) do not exist.

### Decorative Element Types

**Geometric ring (geo-circle / geo-decoration / geo-ring)** — Thin 1px taupe circles in various sizes (10vw, 30vw, 50vw) at 20–50% opacity. Typically paired with an inner dashed `::before` ring at 70–80% of the outer diameter, suggesting compass construction with both a primary and an offset arc. Anchored to corners or centers; sits behind content with `z-index: 0` and `pointer-events: none`.

**Vertical line** — A single 1px taupe column anchored at ~8vw from the left slide edge, running floor-to-ceiling at 30% opacity. Suggests a drafting-paper alignment guide. Optional per slide.

**Horizontal accent** — A single 20vw × 1px black line anchored 15vh from the bottom-left of a slide. The system's only ink-black line — used as a strong terminal accent rule on cover or closing layouts. Use sparingly.

**Image placeholder** — A solid `{colors.bg-secondary}` block with two 150% diagonal 1px taupe lines crossed at +30° and -30° via `::before` / `::after`, forming an X. Centers a small uppercase Inter label ("Visual Reference" or similar). The X pattern is the signature image-not-yet-wired treatment.

**Team-photo frame** — A 12vw circular block in `{colors.bg-secondary}` with a 1px taupe ring, holding a single Playfair-400 initial at 2rem in `{colors.accent}` centered. Used as portrait placeholder.

**Card** — A 1px taupe-bordered block with a semi-transparent white interior fill (`{colors.white-overlay}`) that lets the canvas tone bleed through subtly. The faint white fill is what differentiates a card from a bare region; remove the fill and the card disappears.

**Agenda row** — A flex row containing a Playfair `{typography.agenda-numeral}` in `{colors.accent}` at left, then a label at right, with 2vh padding and a 1px taupe bottom border. Stacked rows form an agenda list.

**Timeline** — A 1px taupe top-border across a flex row of evenly-distributed timeline items; each item carries a small Inter `year` label in taupe, a Playfair `{typography.timeline-headline}`, and an Inter body paragraph. The hairline is the only timeline structure — there are no nodes, no markers, no dots.

**Stats cluster** — A flex row of stat items separated by `gap-md`, framed by a 1px taupe top border, holding inline `{typography.stat-figure}` Playfair numerals with small uppercase Inter labels in taupe below.

**Quote mark** — A 5rem Playfair quote glyph at 50% opacity in taupe, positioned above a Playfair `{typography.h2}` headline + a small uppercase taupe attribution below.

**Chart** — Chart.js bar or line chart with ink-black primary series and dashed taupe comparison series. Grid lines in `{colors.bg-secondary}`. Axis ticks in `{colors.accent}`. Always rendered without fill on the primary series (or with a 5% ink-tinted fill on line charts).

## Do's and Don'ts

### Do
- Use a single 1px line in `{colors.line}` for every structural separator — agenda rule, timeline connector, card border, stats top, team-photo ring. The 1px hairline is Cartesian's identity.
- Set every Playfair headline, stat, quote mark, and card title at weight 400. Don't reach for bold; the thin-stroke didone aesthetic depends on it.
- Render every headline in `{colors.text-primary}` (ink). Playfair never appears in taupe or color.
- Render every label, attribution, agenda numeral, and micro-text in `{colors.accent}` (taupe) with uppercase + 2–3px letter-spacing.
- Layer decorative geometric rings (solid + dashed) at 20–50% opacity behind content for atmosphere. One or two geo elements per slide; never more.
- Pair Playfair Display (serif headlines) with Inter (sans body). The two-face pairing is fixed.
- Use the crossed-diagonal X pattern inside image placeholders. It is the system's signature placeholder treatment.
- Let slides breathe — sparse layouts with generous negative space are the correct density.
- Use `{colors.bg-secondary}` as the fill for image placeholders and team-photo frames — a subtle stone, not white, not gray.
- Use a single `horizontal-accent` (20vw × 1px ink line) sparingly as a strong terminal rule on cover or closing compositions.

### Don't
- Don't introduce a populist accent color. No red, no orange, no blue, no green. The palette is stone-on-stone with ink for headlines.
- Don't render Playfair headlines in `{colors.accent}` (taupe). Headlines are ink; taupe is reserved for small text.
- Don't bold any Playfair element. Weight 400 is the standing rule; bold breaks the didone aesthetic.
- Don't add shadows, elevated cards, or gradient fills. Cartesian is flat; depth comes from geometry and type, not z-axis.
- Don't use rounded corners on cards or rectangles. The only round shapes are true circles (radius 50%).
- Don't use thick borders (2px+). Every structural border is 1px.
- Don't crowd the slide. Sparse breathing layouts read as elegant; packed layouts read as broken.
- Don't pair Playfair with a different sans companion. The Inter pairing is fixed.
- Don't render labels or micro-text in sentence case. Small Inter text is always uppercase + 2–3px tracking.
- Don't add more than two geo decorations per slide — restraint is the rule; over-decoration reads as cluttered.

## Responsive Behavior

Cartesian is a viewport-fluid 1920×1080 presentation system using `vw` / `vh` units and `clamp()` throughout. There is a single `@media (max-aspect-ratio: 4/3)` breakpoint that collapses two-column grids to single-column, hides the timeline rule (which would lose meaning when stacked), and stacks team and card grids vertically. The system is otherwise responsive without breakpoints.

### Scaling Behavior
- Display headlines scale from 2.5rem at minimum viewport to 5.5rem at maximum via `clamp()`.
- Body text scales from 0.9rem to 1.1rem.
- Padding uses `vh` / `vw` units that scale linearly with viewport.
- The 1px borders, 8px nav dots, and 40px nav arrows are fixed and do not scale.

### Presenter Behavior
- Slides advance via `ArrowRight` or `Space`.
- Slides reverse via `ArrowLeft`.
- Nav dots at right edge can be clicked to jump to specific slides.
- Nav arrows at bottom-left are clickable; hover state inverts background to ink and text to cream.
- Slide counter at bottom-right shows current / total with 2-digit zero-padding.

### Charts
Charts are rendered with Chart.js (loaded via CDN). The two chart types in the source are bar and line; both follow the ink-primary / dashed-taupe-comparison convention. Custom font settings inject Inter into Chart.js label rendering.

### Print / Export
Not explicitly handled. Each slide is a 100vw × 100vh block; export workflows should snapshot each slide at 1920×1080.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin font | Recommended Chinese pairing | Source |
|---|---|---|---|
| Display / Headline (Playfair Display 400) | Playfair Display | 思源宋体 Noto Serif SC 700 | Google Fonts |
| Body / Label (Inter 400–500) | Inter | 思源宋体 Noto Serif SC 400 | Google Fonts |

### Mixed-Content Strategy

Use **Strategy A — single-font-stack with fallback**: declare Noto Serif SC *after* the Latin font in the same `font-family` stack so Latin glyphs render in Playfair / Inter and CJK glyphs fall through to Noto Serif SC automatically. One CSS rule per role, no manual class switching.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Inter:wght@300..600&family=Noto+Serif+SC:wght@400;700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: "Playfair Display", "Noto Serif SC", serif;
  --font-body: "Inter", "Noto Serif SC", sans-serif;
}
/* Headlines use Noto Serif SC 700; body uses Noto Serif SC 400. */
```

### Universal CJK Adjustments

- **Line-height**: bump CJK body line-height to ~1.75 (from 1.6) — Hanzi need more vertical breathing than Latin lowercase, and Cartesian already favors generous leading.
- **Letter-spacing**: zero out `letter-spacing` on Hanzi runs. Keep the 2–3px tracking only on uppercase Latin labels.
- **Text-transform**: drop `text-transform: uppercase` on any label/attribution/micro when content is Hanzi — Chinese has no case; forcing uppercase does nothing for Hanzi but breaks the rendering of any mixed Latin acronyms inside.
- **Punctuation**: use Chinese full-width punctuation (，。：；「」) for Chinese sentences, half-width (`,.:;""`) for Latin. Never mix half-width punctuation into a Chinese sentence.
- **No period on headlines**: Chinese headline convention omits the terminal 。 — strip it from display strings.
- **Pangu spacing**: insert a thin space (or a regular space) between adjacent Hanzi and Latin/digit runs (e.g. `2026 年`, `AI 产品`). Improves readability of mixed runs.
- **One font per sentence**: don't switch CJK families mid-sentence. Pick a single weight of Noto Serif SC for a given text run, never two inside one phrase.

### Aesthetic Notes

Noto Serif SC (思源宋体) is the only mainstream Hanzi serif with the same restrained editorial register Cartesian needs — its modulated horizontal-thin / vertical-thick strokes echo Playfair's didone aesthetic, and its uniformly even cadence matches Cartesian's "museum-catalog" voice. Using NSC at weight 700 for headlines preserves the visual mass of the Latin display while NSC 400 carries body with the same quiet warmth Inter provides. The five-stone palette absorbs Hanzi cleanly because every glyph stays in ink or taupe — no candy fills to negotiate. The decorative compass-arc geometry layer is content-agnostic and works identically in any language. Avoid bolding Hanzi (the Chinese-typography equivalent of Cartesian's "no bold Playfair" rule); rely on size and the 1px line dividers for hierarchy.

### Known CJK Gap

Noto Serif SC is the only Hanzi serif loaded — there is no italic axis (Chinese type historically has no italic), so the rare italic Playfair `<em>` moment loses its emphasis when the body falls through to NSC. Substitute a single-character span colored in `{colors.accent}` (taupe), or wrap the emphasized phrase in faint brackets 「」, to recover emphasis. NSC's 700 weight is the heaviest available — the system's restraint-through-400-weight rule naturally extends to Chinese, so this is rarely a gap in practice.

## Iteration Guide

1. Every new structural separator uses a 1px solid `{colors.line}` border. No exceptions.
2. Every new headline uses Playfair Display at weight 400 in `{colors.text-primary}`. Don't bold; don't color.
3. Every new small text element (label, attribution, micro) uses Inter uppercase with 2–3px letter-spacing in `{colors.accent}`.
4. Every new body paragraph uses Inter weight 400 in `{colors.text-secondary}`, with line-height 1.6.
5. Every new card uses 1px taupe border + semi-transparent white overlay fill. No shadow, no radius.
6. New circular elements (icons, photos, decorative rings) use border-radius 50% with 1px taupe ring.
7. New geometric decorations stay subtle: 1 or 2 per slide, at 20–50% opacity, behind content (z-index 0, pointer-events none).
8. New chart series follow the ink-primary / dashed-taupe-comparison convention. Don't introduce colored chart series.
9. New layouts respect the breathing-room density rule — sparse beats dense in Cartesian.
10. The `horizontal-accent` 20vw ink line is the system's only "ink rule" — use it sparingly as a terminal accent, never as a routine divider.

## Known Gaps

- The Chart.js library is loaded via CDN; new chart types beyond bar and line require manual configuration matching the ink-primary / dashed-taupe-comparison aesthetic.
- The decorative `geo-decoration` and `geo-ring` `::before` inner-ring pattern is hardcoded in CSS; size variants beyond what the source exercises require new style rules.
- The team-photo placeholder shows a single Playfair initial in taupe; real portrait insertion requires replacing the initial with an `<img>` and adjusting the circular crop.
- The chart axis label colors and grid colors are hardcoded inline in the Chart.js options blocks (rather than reading from CSS variables) — restyling requires editing JS, not CSS.
- The image-placeholder X pattern (crossed +30°/-30° diagonals) is rendered via `::before` / `::after` with fixed 150% widths; resizing the placeholder beyond the source dimensions may require recomputing the rotation angle to maintain edge-touch.
- Italic Playfair is loaded but not exercised in any default rule; it is available for inline `<em>` emphasis in body copy but the system itself does not author any italic text.
- The `vertical-line` and `horizontal-accent` decorative elements have hardcoded position values (8vw from left, 15vh from bottom); using them off-default-position requires per-instance style overrides.
- The slide-counter `currentSlide` / `totalSlides` IDs are referenced in the JS but the system has no internal slide-name registry; new slides simply increment by their DOM order.
