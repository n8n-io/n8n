---
version: alpha
name: Coral
description: "A bold magazine-poster system that runs on three surface registers — coral fire, ink black, and warm cream — animated by Bebas Neue display caps and a constant 45° diagonal hatch pattern. Inter handles body copy; Bebas Neue handles every headline, stat, title, and meta-figure at heavy letter-spacing. The cultural reference is mid-century travel posters, Saul Bass film titles, and modern editorial sport magazines: solid color planes meeting at hard edges, oversized condensed caps as architectural elements, and a single coral hue used both as accent and as full-slide environment."

colors:
  coral: "#E85D5D"
  coral-dark: "#D44A4A"
  cream: "#F5F0E8"
  cream-dark: "#E8E0D4"
  black: "#1A1A1A"
  gray: "#6B6B6B"
  light-gray: "#B0B0B0"
  white: "#FFFFFF"

color-aliases:
  bg: cream
  ink: black

typography:
  hero-title:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "min(120px, 9vw, 13vh)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: 4px
  jumbo-feature:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(80px, 15vw, 200px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 12px
  display-statement:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(42px, 7vw, 100px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
  section-headline:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(40px, 6vw, 80px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
  column-title:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(36px, 5vw, 72px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
  stat-numeral:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(48px, 7vw, 96px)"
    fontWeight: 400
    lineHeight: 1
  card-stat:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(36px, 4vw, 56px)"
    fontWeight: 400
    lineHeight: 1
  sidebar-value:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(28px, 3vw, 48px)"
    fontWeight: 400
    lineHeight: 1
  card-title:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(24px, 2.5vw, 36px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 1px
  bar-title:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(28px, 4vw, 56px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
  meta-figure:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "min(44px, 3.5vw, 5.5vh)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
  meta-date:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "min(38px, 3vw, 4.8vh)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 2px
  background-numeral:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(100px, 15vw, 200px)"
    fontWeight: 400
    lineHeight: 1
    description: "Decorative oversized numeral placed inside a coral region at rgba(0,0,0,0.12) — wallpaper opacity. Sits behind the actual column title at full opacity."
  giant-mark:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(140px, 20vw, 280px)"
    fontWeight: 400
    lineHeight: 1
    description: "Oversized quote mark or single character placed inside a coral region at opacity 0.35 — half-decorative, half-content."
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(15px, 1.4vw, 20px)"
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(13px, 1.1vw, 16px)"
    fontWeight: 400
    lineHeight: 1.6
  body-light:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(20px, 2.5vw, 36px)"
    fontWeight: 300
    lineHeight: 1.5
    description: "Lighter-weight Inter for pull quotes — weight 300 to contrast against the Bebas Neue dominant voice."
  item-text:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(14px, 1.2vw, 18px)"
    fontWeight: 400
    lineHeight: 1.6
  card-text:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(13px, 1.1vw, 16px)"
    fontWeight: 400
    lineHeight: 1.6
  bar-meta:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 2px
    textTransform: uppercase
  section-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 4px
    textTransform: uppercase
  item-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 3px
    textTransform: uppercase
  meta-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 3px
    textTransform: uppercase
  sidebar-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 1px
  quote-attribution:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 3px
    textTransform: uppercase
  quote-role:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 1px

spacing:
  pad-y: "clamp(40px, 6vh, 80px)"
  pad-x: "clamp(40px, 8vw, 100px)"
  pad-y-tight: "clamp(28px, 4.5vh, 60px)"
  pad-col: "clamp(32px, 4vw, 60px)"
  gap-grid: "32px"
  gap-md: "40px"
  card-pad: "clamp(24px, 3vh, 40px)"
  bar-pad: "clamp(24px, 4vh, 40px)"

canvas:
  width: 100vw
  height: 100vh

components:
  diagonal-hatch:
    background: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.06) 20px, rgba(0,0,0,0.06) 40px)"
    description: "Signature 45° diagonal hatch pattern in 6%-opacity black. Applied as a pseudo-element overlay on coral regions to provide texture without changing the surface color. Variant: -45° hatch on coral quote-left, with 30/60px stride. Variant: 90° vertical hatch in 10%-opacity black on coral gradient regions, with 60/62px stride. The hatch is a per-region atmospheric treatment, not a slide-level overlay."
  accent-line:
    width: "80px"
    height: "4px"
    background: "{colors.coral}"
    description: "Solid 80×4 coral rectangle used as a sub-headline accent rule. Closing or section-divider variant uses 60×4."
  quote-accent:
    width: "60px"
    height: "4px"
    background: "{colors.coral}"
    description: "60×4 coral rectangle placed above a quote attribution as a terminal accent."
  title-rule:
    width: "100%"
    height: "3px"
    background: "{colors.black}"
    opacity: 0.15
    description: "Full-width 3px ink rule at 15% opacity used as a subtle horizontal divider beneath the hero title on the cover composition."
  card:
    background: "{colors.white}"
    padding: "{spacing.card-pad}"
    borderTop: "5px solid {colors.coral}"
    description: "Column card — white surface with a 5px solid coral top border as the only border on the element. No shadow, no radius."
  sidebar-item:
    background: "{colors.white}"
    padding: "20px 24px"
    borderLeft: "4px solid {colors.coral}"
    description: "Compact data tile — white surface with a 4px solid coral left border. Holds a Bebas value and an Inter label."
  card-icon:
    width: "48px"
    height: "48px"
    background: "{colors.coral}"
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "24px"
    color: "{colors.white}"
    description: "48px solid coral square (no radius) containing a 1-character Bebas Neue glyph in white. Used as a card mark."
  timeline-line:
    height: "4px"
    background: "{colors.black}"
    description: "Horizontal 4px solid ink line spanning the timeline width. A ::after pseudo overlays a repeating linear-gradient (20px ink + 10px transparent) to create a dashed effect. The dashed pattern is rendered through the gradient, not the border-style."
  t-point-dot:
    width: "20px"
    height: "20px"
    borderRadius: "50%"
    background: "{colors.coral}"
    border: "4px solid {colors.cream}"
    description: "Timeline node — 20px coral circle with a 4px cream halo, sitting on the timeline-line."
  nav-dot:
    width: "10px"
    height: "10px"
    borderRadius: "50%"
    background: "rgba(255, 255, 255, 0.3)"
    border: "2px solid rgba(255, 255, 255, 0.5)"
    description: "Small 10px nav indicator. White-translucent default on dark/coral surfaces; ink-translucent .dark variant on cream surfaces. Active state fills with coral."
  nav-arrow:
    width: "44px"
    height: "44px"
    borderRadius: "50%"
    background: "rgba(255, 255, 255, 0.1)"
    border: "2px solid rgba(255, 255, 255, 0.3)"
    description: "44px circular nav button with translucent fill and 2px translucent border. .dark variant for cream surfaces. Hover state fills with coral."
  zigzag-layer:
    description: "SVG zigzag pattern overlay used decoratively on the cover's coral top-section. Renders as a thin black zigzag line at low opacity behind the title."
  pattern-overlay:
    description: "Decorative repeating-pattern overlay applied to feature regions — typically 90° vertical hatch in ink at 10% opacity on coral gradient backgrounds. Separate from the 45° diagonal-hatch which is the system's primary texture."
  bar-fill:
    description: "Chart.js horizontal bar fills use solid coral (#E85D5D) as the primary series color, with a darker coral (#D44A4A) for comparison or secondary series."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Coral is a **bold magazine-poster system** built on three surface registers — coral fire, ink black, and warm cream — that meet at hard edges. The defining structural premise is **solid color planes**: a single slide will split into a coral half + a cream half + an ink top-section, with each region a flat solid color holding its own self-contained composition. There are no gradient transitions between regions; the meeting point of two colors is the layout. This is the populist counterpart to a more refined editorial system — closer to a sports magazine cover than a literary catalogue.

The typeface stack is a **two-face hierarchy**. **Bebas Neue** — a tall narrow condensed sans display face — carries every headline, every stat, every column title, every meta figure, every section name. Bebas runs at its single available weight (400) and is treated as architectural — heavy letter-spacing (2–12px), oversized scale (up to 200px on jumbo features), and always set in its native uppercase. **Inter** — a contemporary humanist sans — carries every body paragraph, every label, every micro-text, every attribution. Inter spans weights 300 to 700: 300 for pull-quote bodies, 400 for paragraph body, 600 for meta labels, 700 for section eyebrows. The Bebas/Inter pair creates the system's voice: Bebas declares, Inter explains.

The palette is **three surfaces + ink + neutrals**. The coral `{colors.coral}` is both *the* accent (a 4px left border on a sidebar tile, a 5px top border on a card, a 48px solid icon square) and an entire slide environment (a full coral panel, the cover's top-section, a coral gradient feature region). The cream `{colors.cream}` is the warm canvas — the magazine paper. Ink `{colors.black}` is the strongest surface, used as full-slide background on quote and statement layouts. White appears only as card fills against coral or cream regions. Two grays (`{colors.gray}`, `{colors.light-gray}`) carry body and meta text.

Depth is **flat with hard color edges**. There are no drop shadows, no rounded surfaces, no soft elevations. Hierarchy comes from:
- **Solid color region splits** — coral / ink / cream regions meeting at hard edges.
- **Accent borders** — 4px coral left, 5px coral top, 3px ink top, 4px ink horizontal.
- **45° diagonal hatch** — a signature 6%-opacity black diagonal repeating pattern overlaid on coral regions, providing texture.
- **Oversized decorative typography** — background numerals at 12% opacity, giant quote marks at 35% opacity, sitting behind or beside primary content.

**Density philosophy: medium-high, structured by region.** Coral slides are structured rather than dense — each color region holds a self-contained composition (a single column title with one body block, a single stat tile with one label, a single timeline line with five dots). The aesthetic relies on regions feeling fully populated within their boundary, not on the slide overall being crowded. A correctly composed slide pairs 2–3 substantive regions, each fully expressed. A slide that feels broken is one where a coral region holds only a sparse fragment, or where a cream region attempts to carry too many competing elements. Decorative oversized numerals at 12% opacity behind a region's primary title are the standard "fill the region" move when content alone doesn't fully occupy the plane.

**Key Characteristics:**
- Three-surface system: `{colors.coral}` (fire), `{colors.black}` (ink), `{colors.cream}` (paper) — used as solid regions meeting at hard edges.
- Bebas Neue uppercase condensed display for every headline/stat/title; Inter sans for every body/label/attribution.
- 45° diagonal hatch in 6%-opacity black on coral regions as the signature atmospheric texture.
- Coral as both accent (4–5px borders, 48px icon squares, 4-point timeline dots) and environment (full-region surfaces).
- Decorative oversized numerals at 12% opacity behind column titles inside coral regions.
- Oversized quote marks at 35% opacity inside coral regions as half-decorative content.
- No rounded corners on rectangles; circular shapes only for nav dots, nav arrows, and timeline nodes.
- Heavy letter-spacing on every Bebas element: 1–4px on most, 12px on the largest feature treatment.
- Hard-edge color splits (vertical, horizontal, or 40/60 ratios) define slide composition.

## Colors

### Three-Surface System
- **Coral** (`{colors.coral}` — #E85D5D): The signature color — a warm orange-red, vivid but not neon. Used both as accent (4px sidebar-item left border, 5px card top border, 48px card-icon fill, 80×4 accent line, 60×4 quote accent, timeline-point dot, chart primary series, hover-state fills, section eyebrows, stat-numerals on cream surfaces) and as a full-region surface (cover top-section, two-column left panel, full-width feature region, quote left panel). Defines the system.
- **Coral Dark** (`{colors.coral-dark}` — #D44A4A): A darker coral variant. Used as the start stop in linear-gradient feature regions (135° from coral-dark to coral), and as the chart secondary/comparison series color.
- **Cream** (`{colors.cream}` — #F5F0E8): The warm canvas. Used as default slide background, as the cover's bottom-section, as info-bar surfaces, as body text color on ink-black surfaces, and as the timeline-point dot halo.
- **Cream Dark** (`{colors.cream-dark}` — #E8E0D4): A slightly deeper cream. Available in the palette for subtle region differentiation but sparingly used.
- **Black** (`{colors.black}` — #1A1A1A): Near-black ink. Used as headline color on cream surfaces, as the full-background ink register for quote and certain feature slides, as timeline-line color, as title-rule color, as decorative background-numeral color (at 12% opacity inside coral regions), and as giant-mark color (at 35% opacity inside coral regions).
- **Gray** (`{colors.gray}` — #6B6B6B): Mid neutral. Used for body paragraph text on cream surfaces, for meta labels, for sidebar labels, for card body copy, for quote roles.
- **Light Gray** (`{colors.light-gray}` — #B0B0B0): Pale neutral. Defined in the palette but used sparingly — available for tertiary text where gray is too strong.
- **White** (`{colors.white}` — #FFFFFF): True white. Used as card fills (sidebar-item, card, column-card), as item-text color on ink surfaces, as nav-dot/nav-arrow translucent fills.

### Defaults
- **Default slide surface**: `{colors.cream}`. (Cover and feature slides use mixed-surface compositions; statement, quote, and three-column slides default to cream or ink.)
- **Default headline color on cream surfaces**: `{colors.black}` — Bebas Neue headlines are ink, not coral.
- **Default headline color on coral surfaces**: `{colors.black}` — ink-on-fire. Bebas on coral is always ink, never white.
- **Default headline color on ink surfaces**: `{colors.cream}`.
- **Default body text color on cream surfaces**: `{colors.gray}`.
- **Default body text color on ink surfaces**: `{colors.cream}`.
- **Default body text color on coral surfaces**: `{colors.black}` — ink, not white.
- **Default eyebrow / section-label color**: `{colors.coral}` on cream and ink surfaces; `{colors.black}` on coral surfaces.
- **Default accent border color**: `{colors.coral}` — 4px left (sidebar tiles), 5px top (cards), 48px solid (icon squares).
- **Default decorative numeral color inside a coral region**: `rgba(0, 0, 0, 0.12)` (ink at 12% opacity).
- **Default giant-mark color inside a coral region**: `rgba(0, 0, 0, 0.35)` (ink at 35% opacity).
- **Default chart primary series color**: `{colors.coral}`.
- **Default chart comparison series color**: `{colors.coral-dark}`.

The three surfaces are intermixed by composition: a slide may be split coral/cream, coral/ink, ink/cream, or held to a single surface. There is no semantic mapping between surfaces; each is chosen for compositional balance and contrast.

## Typography

### Font Family
The system runs on a **two-face hierarchy**: `Bebas Neue` (display, single weight 400) carries every headline, stat numeral, column title, meta figure, bar title, card stat, sidebar value, and decorative numeral; `Inter` (sans, weights 300 / 400 / 600 / 700) carries every body paragraph, label, eyebrow, meta-label, attribution, role, and chart legend. There is no third face.

Bebas Neue is a tall narrow condensed sans display face — its narrow letterforms allow large sizes without overwhelming the slide width, and its single available weight (400) is treated as the system's only weight. Bebas is always set in its native uppercase. The display character of the system comes from heavy letter-spacing (1–4px on standard headlines, 12px on the largest jumbo feature treatment) and oversized scale (up to 200–280px on jumbo / giant-mark moments).

Inter carries the supporting voice with weight contrast: 300 for pull-quote bodies (a lighter register against Bebas's dominance), 400 for body paragraphs, 600 for meta labels, 700 for section eyebrows. Italic and underline are not used.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.giant-mark}` | clamp(140px, 20vw, 280px) | Bebas Neue | 400 | Oversized decorative quote mark or feature character inside a coral region |
| `{typography.jumbo-feature}` | clamp(80px, 15vw, 200px) | Bebas Neue | 400 | Single dominant word filling a feature region |
| `{typography.background-numeral}` | clamp(100px, 15vw, 200px) | Bebas Neue | 400 | Decorative wallpaper numeral inside a coral region at 12% opacity |
| `{typography.hero-title}` | min(120px, 9vw, 13vh) | Bebas Neue | 400 | Largest cover title — 3-line title cap-and-line-broken |
| `{typography.display-statement}` | clamp(42px, 7vw, 100px) | Bebas Neue | 400 | Big declarative statement on a cream surface |
| `{typography.stat-numeral}` | clamp(48px, 7vw, 96px) | Bebas Neue | 400 | Hero stat figure |
| `{typography.section-headline}` | clamp(40px, 6vw, 80px) | Bebas Neue | 400 | Primary section headline |
| `{typography.column-title}` | clamp(36px, 5vw, 72px) | Bebas Neue | 400 | Column or panel title inside a region |
| `{typography.card-stat}` | clamp(36px, 4vw, 56px) | Bebas Neue | 400 | Per-card stat figure |
| `{typography.bar-title}` | clamp(28px, 4vw, 56px) | Bebas Neue | 400 | Info-bar title |
| `{typography.sidebar-value}` | clamp(28px, 3vw, 48px) | Bebas Neue | 400 | Sidebar tile value |
| `{typography.card-title}` | clamp(24px, 2.5vw, 36px) | Bebas Neue | 400 | Card or column-card title |
| `{typography.meta-figure}` | min(44px, 3.5vw, 5.5vh) | Bebas Neue | 400 | Cover meta value (location, date, brand) |
| `{typography.meta-date}` | min(38px, 3vw, 4.8vh) | Bebas Neue | 400 | Cover date variant |
| `{typography.body-light}` | clamp(20px, 2.5vw, 36px) | Inter | 300 | Pull-quote body (lighter weight against Bebas dominance) |
| `{typography.body}` | clamp(15px, 1.4vw, 20px) | Inter | 400 | Standard paragraph body |
| `{typography.item-text}` | clamp(14px, 1.2vw, 18px) | Inter | 400 | Item body on ink surfaces |
| `{typography.card-text}` | clamp(13px, 1.1vw, 16px) | Inter | 400 | Card body copy |
| `{typography.body-sm}` | clamp(13px, 1.1vw, 16px) | Inter | 400 | Compact body |
| `{typography.section-label}` | 12px | Inter | 700 | Section eyebrow above a headline, 4px letter-spacing |
| `{typography.item-label}` | 11px | Inter | 700 | Item eyebrow in a list, 3px letter-spacing |
| `{typography.meta-label}` | 11px | Inter | 600 | Cover meta label, 3px letter-spacing |
| `{typography.quote-attribution}` | 14px | Inter | 600 | Author name below a pull quote, 3px letter-spacing |
| `{typography.bar-meta}` | 12px | Inter | 400 | Info-bar meta-text, 2px letter-spacing |
| `{typography.sidebar-label}` | 12px | Inter | 400 | Sidebar tile label, 1px letter-spacing |
| `{typography.quote-role}` | 12px | Inter | 400 | Author role below quote attribution, 1px letter-spacing |

### Defaults
- **Default size for the primary section headline**: `{typography.section-headline}` (clamp 40–80px).
- **Default size for a cover/hero title**: `{typography.hero-title}` (min(120px, 9vw, 13vh)).
- **Default size for a feature dominant word**: `{typography.jumbo-feature}` (clamp 80–200px) with 12px letter-spacing.
- **Default size for paragraph body**: `{typography.body}` (clamp 15–20px).
- **Default size for any uppercase eyebrow / label**: `{typography.section-label}` (12px) at weight 700 with 4px letter-spacing; or `{typography.item-label}` (11px) at weight 700 with 3px letter-spacing for in-list contexts.
- **Default weight for any Bebas Neue element**: 400 (the only available weight).
- **Default weight for body**: 400; for pull quotes, 300.
- **Default weight for labels**: 600 or 700.
- **Default size for a hero stat figure**: `{typography.stat-numeral}` (clamp 48–96px).
- **Default size for an in-card stat figure**: `{typography.card-stat}` (clamp 36–56px).

When unsure, reach for `{typography.section-headline}` for the slide's primary text moment.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Bebas Neue element is set in its native uppercase.** Bebas Neue in sentence case does not exist — the typeface itself doesn't support it. This is the system's most foundational typographic rule.
- **Every Bebas Neue element carries letter-spacing of at least 1px.** Standard headlines at 2px, hero-title at 4px, jumbo-feature at 12px. Untracked Bebas reads as untreated.
- **Every Inter label, eyebrow, and meta-text is uppercase with 1–4px letter-spacing.** Section labels at 4px, item labels at 3px, bar-meta at 2px, sidebar-labels at 1px. Inter caps without tracking break the editorial register.
- **Every Bebas headline is rendered in `{colors.black}`, `{colors.cream}`, or `{colors.coral}`** based on surface contrast — never gray. Color choice: ink on cream/coral, cream on ink, coral on cream when emphasis is needed.
- **Every section eyebrow is rendered in `{colors.coral}`** when sitting on cream or ink, or in `{colors.black}` when sitting on coral. Coral-on-coral does not exist.
- **Every decorative oversized numeral inside a coral region is rendered at `rgba(0, 0, 0, 0.12)`** — the wallpaper-numeral signature. Sits behind primary content at full opacity.
- **Every giant decorative mark (quote, single character) inside a coral region is rendered at `rgba(0, 0, 0, 0.35)`** — half-decorative, half-content.
- **Pull-quote bodies use Inter weight 300, not Bebas.** This is the system's primary "voice break" — when content needs to feel personal rather than declarative, Inter Light takes over.

### Typography Principles
The Bebas-uppercase-tracked + Inter-mixed-weight combination is the system's voice. Switching either face — using a different display sans for headlines, or using Bebas for body — breaks the system entirely. Italic does not appear. Underline does not appear. The only emphasis mechanism is weight (Bebas dominance), case (uppercase always on Bebas + labels), color (coral on cream surfaces), and surface inversion (placing the element in a different region).

Line-height is uniformly tight at the top of the scale: Bebas elements at 0.9–1.0; Inter body at 1.6–1.7. The display compression + open body is what gives the system its magazine-poster rhythm.

## Layout

### Canvas System
The canvas is `100vw × 100vh` — full viewport with hidden overflow. Each `.slide` is absolutely positioned to fill the viewport; one slide carries `.active` (opacity 1, visibility visible) at a time. Transitions are 0.6s opacity + visibility fades.

The system has **no universal chrome bar**. Each slide is its own self-contained composition with its own padding, region structure, and color treatment. Navigation is per-page (nav arrows + nav dots + slide counter) and floats over the active surface with `.dark` variants for cream surfaces.

### Padding and Gap Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-y}` | clamp(40px, 6vh, 80px) | Standard vertical slide padding |
| `{spacing.pad-x}` | clamp(40px, 8vw, 100px) | Standard horizontal slide padding |
| `{spacing.pad-y-tight}` | clamp(28px, 4.5vh, 60px) | Compact vertical padding (cover bottom-section) |
| `{spacing.pad-col}` | clamp(32px, 4vw, 60px) | Column padding inside a region |
| `{spacing.gap-grid}` | 32px | Column-grid gap |
| `{spacing.gap-md}` | 40px | Chart container internal gap |
| `{spacing.card-pad}` | clamp(24px, 3vh, 40px) | Card internal padding |
| `{spacing.bar-pad}` | clamp(24px, 4vh, 40px) | Info-bar internal padding |

### Region Composition
Coral's primary layout move is **multi-surface composition**. Slides split into regions of solid color, with the boundary between regions defining the layout. Standard splits include:
- `grid-template-rows: 32% 68%` — top accent strip + main body (cover composition).
- `grid-template-rows: 1fr auto` — large feature region + bottom info-bar.
- `grid-template-columns: 1fr 1fr` — equal vertical split (often coral left + ink right).
- `grid-template-columns: 40% 60%` — narrow accent column + wider content column (quote layout).
- Single-surface slides — cream or ink as the whole canvas (statement, three-column, timeline layouts).

The boundary between regions is always a **hard color edge** — no soft transitions, no gradients across the boundary, no rounded corners at the junction. The meeting of two solid colors is the layout structure.

## Depth and Elevation

### Flat With Hard Color Edges
Coral has no drop shadows, no soft elevations, no rounded surfaces. Every element sits on a single plane.

Depth signals are entirely structural:
- **Hard color region boundaries** — the primary structural signal.
- **Accent borders** — 5px coral top on cards, 4px coral left on sidebar tiles, 4px ink horizontal timeline-line, 3px ink at 15% opacity title-rule.
- **45° diagonal hatch** — 6%-opacity black diagonal repeating-linear-gradient overlay on coral regions creates texture without depth.
- **Decorative wallpaper typography** — oversized numerals at 12% opacity and giant marks at 35% opacity sit behind primary content as wallpaper, creating a layered effect without z-index trickery.

Introducing a box-shadow, an elevated card, or a soft gradient breaks the populist-poster aesthetic that defines the system.

### Atmospheric Hatch Variants
The 45° diagonal hatch is the system's primary atmospheric treatment, but several stride/angle variants appear:
- **45° at 20/40px stride** in 6%-opacity black — the standard coral region overlay.
- **-45° at 30/60px stride** in 6%-opacity black — coral quote-left panel variant.
- **90° vertical at 60/62px stride** in 10%-opacity black — coral gradient feature-region overlay.

All hatches are subtle (6–10% opacity black). They provide texture without competing with content.

## Shapes and Treatment

### Border Radius
| Value | Use |
|---|---|
| 50% (circle) | Circular elements only: `nav-dot` (10px), `nav-arrow` (44px), `t-point-dot` (20px timeline node) |
| 0 | Everything else: every region, every card, every sidebar tile, every icon square, every chart, every accent line, every accent border |

The system uses **only two radius values**: 50% (true circle) or 0 (sharp rectangle). Soft-rounded corners do not exist. Cards, icon squares, info-bars, and feature regions are all strict rectangles.

### Border Weights
- **5px solid `{colors.coral}` (top)** — used on card top borders (column-card pattern).
- **4px solid `{colors.coral}` (left)** — used on sidebar-item left borders.
- **4px solid `{colors.black}` (horizontal)** — used on timeline-line.
- **4px solid `{colors.cream}` (ring)** — used as the halo around 20px coral timeline-point dots.
- **3px solid `{colors.black}` at 15% opacity** — used on title-rule beneath the cover hero title.
- **2px solid translucent** — used on nav-dot and nav-arrow borders (rgba(255,255,255,0.3–0.5) on dark surfaces; rgba(26,26,26,0.2–0.4) on cream surfaces).

All borders are either coral, black, cream, or translucent. There is no border-radius on bordered rectangles.

### Decorative Element Types

**45° diagonal hatch** — A `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.06) 20px, rgba(0,0,0,0.06) 40px)` applied as a `::before` pseudo-element overlay on coral regions. The signature atmospheric texture. Variants: -45°, 90° vertical, different stride widths.

**Background numeral** — An oversized Bebas Neue numeral (clamp 100–200px) at `rgba(0, 0, 0, 0.12)` placed inside a coral region. Sits behind the region's primary column-title at full opacity, creating a layered "ordinal wallpaper" effect.

**Giant mark** — An oversized Bebas Neue character (clamp 140–280px) at `rgba(0, 0, 0, 0.35)` placed inside a coral region. Used as a half-decorative half-content element, typically a quotation mark on the coral left panel of a quote layout.

**Card (column-card)** — A white-fill rectangle with a 5px coral top border as its only border. Contains a 48px solid coral icon square at top, a Bebas card-title, an Inter card-text body, and a coral card-stat figure at the bottom. The 5px top border is the only chrome — no other border, no shadow, no radius.

**Sidebar item** — A white-fill rectangle with a 4px coral left border as its only border. Contains a Bebas sidebar-value and an Inter sidebar-label. The 4px left border is the only chrome.

**Icon square** — A 48px solid coral rectangle (no radius) containing a 1-character Bebas glyph in white. Used as a card mark.

**Info bar** — A flex row spanning a region's full width, holding a Bebas bar-title left and an uppercase Inter bar-meta right. Cream background; used as a footer band beneath a feature region.

**Timeline** — A 4px solid ink horizontal line spanning the timeline width, with a `::after` repeating-linear-gradient overlay (20px ink + 10px transparent) creating a dashed effect. Timeline points are 20px coral circles with 4px cream halos, distributed evenly along the line.

**Accent line** — An 80×4 solid coral rectangle used as a sub-headline accent rule, or 60×4 for closing/quote contexts. Always coral, always solid, no radius.

**Title rule** — A full-width 3px solid ink line at 15% opacity, used as a subtle horizontal divider beneath the cover hero title.

**Zigzag layer** — An SVG zigzag pattern rendered as a thin ink line at low opacity, overlaid decoratively on the cover's coral top-section.

**Pattern overlay** — A separate repeating-pattern overlay (typically 90° vertical hatch in 10%-opacity ink) applied to coral gradient feature regions. Distinct from the standard 45° diagonal hatch.

## Do's and Don'ts

### Do
- Compose slides as multi-surface region splits — coral, ink, and cream meeting at hard color edges. The region boundary is the layout structure.
- Set every Bebas Neue element in its native uppercase with at least 1px letter-spacing — 2px for standard headlines, 4px for hero titles, 12px for jumbo feature treatments.
- Render every section eyebrow in `{colors.coral}` uppercase Inter weight 700 with 3–4px letter-spacing on cream and ink surfaces.
- Apply the 45° diagonal hatch (6% opacity black, 20/40px stride) as a `::before` overlay on coral regions for atmospheric texture.
- Use the 5px coral top border on cards and the 4px coral left border on sidebar tiles as the only chrome on those elements — no other border, no shadow, no radius.
- Place oversized decorative Bebas numerals at 12% opacity behind column titles inside coral regions when a region needs more visual weight than the title alone provides.
- Use Inter weight 300 (light) for pull-quote bodies on ink-surface quote layouts — the lighter weight contrasts against Bebas dominance.
- Render Bebas headlines on coral surfaces in `{colors.black}` (ink-on-fire). White headlines on coral do not exist in this system.
- Use the coral chart series + coral-dark comparison series convention for any chart data.
- Use the 48px solid coral icon square (no radius, single white Bebas glyph) as the standard card mark.

### Don't
- Don't render Bebas Neue in sentence case. The typeface is uppercase only — that is the entire identity.
- Don't render Bebas without letter-spacing. Untracked Bebas reads as untreated, even at large sizes.
- Don't introduce a fourth surface color. The three surfaces (coral / ink / cream) are the system — adding a yellow or blue region breaks the magazine-poster identity.
- Don't render headlines in `{colors.gray}`. Headlines are ink, cream, or coral; gray is reserved for body and meta text only.
- Don't add drop shadows, elevated cards, or rounded surfaces. The system is flat — depth comes from color region splits and accent borders.
- Don't round any rectangular element. Cards, sidebar tiles, info bars, icon squares, accent lines — all sharp rectangles.
- Don't pair Bebas with a different sans body face. The Bebas + Inter pairing is fixed.
- Don't render Inter labels in sentence case. Small Inter text is always uppercase with 1–4px tracking.
- Don't soften region boundaries with gradients (except in the rare 135° coral-dark → coral feature gradient). Region edges are hard color meetings.
- Don't fill a coral region with sparse content. Coral wants weight — either fully populate the region's composition or use a decorative oversized numeral / giant mark as wallpaper.

## Responsive Behavior

Coral is a viewport-fluid 1920×1080 presentation system using `clamp()`, `min()`, and viewport-relative units throughout. There are no explicit responsive breakpoints in the source — every dimension scales between minimum and maximum bounds.

### Scaling Behavior
- Hero title scales via `min(120px, 9vw, 13vh)` — capped by both width and height so the 3-line title cannot overflow a short laptop screen.
- Jumbo feature scales from 80px at minimum viewport to 200px at maximum.
- Body text scales from 15px to 20px.
- Padding scales via `clamp` per-region.
- Borders, icon squares (48px), nav dots (10px), nav arrows (44px), and timeline dots (20px) are fixed and do not scale.

### Presenter Behavior
- Slides advance via `ArrowRight` or `Space`.
- Slides reverse via `ArrowLeft`.
- Nav-dots float at right edge; nav-arrows at bottom-left; slide counter at bottom-right. All three carry `.dark` variants for cream surfaces (ink-translucent fills) and standard variants for coral/ink surfaces (white-translucent fills).
- Active nav-dot fills with `{colors.coral}` regardless of surface.

### Charts
Charts are rendered with Chart.js (loaded via CDN). Primary series uses `{colors.coral}`; comparison series uses `{colors.coral-dark}`. Chart styling is configured inline in the JS; restyling requires editing JS, not CSS.

### Print / Export
Not explicitly handled. Each slide is a 100vw × 100vh block; export workflows should snapshot each slide at 1920×1080. The 45° hatch overlays should render correctly in PDF capture.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin font | Recommended Chinese pairing | Source |
|---|---|---|---|
| Display / Headline (Bebas Neue uppercase 400) | Bebas Neue | 站酷小薇体 ZCOOL XiaoWei | Google Fonts |
| Body / Label (Inter 300–700) | Inter | 悠哉字体 Yozai | cn-fontsource CDN |

### Mixed-Content Strategy

Use **Strategy A — single-font-stack with fallback**: declare ZCOOL XiaoWei *after* Bebas Neue and Yozai *after* Inter in the same `font-family` stack so Latin glyphs render in Bebas / Inter and CJK glyphs fall through to the Chinese face automatically. One CSS rule per role, no manual class switching.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300..700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/cn-fontsource-yozai-regular/font.css" rel="stylesheet">
```

```css
:root {
  --font-display: "Bebas Neue", "ZCOOL XiaoWei", sans-serif;
  --font-body: "Inter", "Yozai", sans-serif;
}
```

### Universal CJK Adjustments

- **Line-height**: bump CJK body line-height to ~1.8 (from 1.7) — Hanzi need more vertical breathing than Latin lowercase, and Coral's body already favors generous leading.
- **Letter-spacing**: zero out `letter-spacing` on Hanzi runs (the 1–12px Bebas tracking and 1–4px Inter tracking shatter Hanzi cadence). Keep heavy tracking only on Latin spans.
- **Text-transform**: drop `text-transform: uppercase` on any label/eyebrow/meta when content is Hanzi — Chinese has no case; forcing uppercase does nothing for Hanzi but breaks the rendering of any mixed Latin acronyms inside.
- **Punctuation**: use Chinese full-width punctuation (，。：；「」) for Chinese sentences, half-width (`,.:;""`) for Latin. Never mix half-width punctuation into a Chinese sentence.
- **No period on headlines**: Chinese headline convention omits the terminal 。 — strip it from display strings.
- **Pangu spacing**: insert a thin space (or a regular space) between adjacent Hanzi and Latin/digit runs (e.g. `2026 年`, `AI 产品`). Improves readability of mixed runs.
- **One font per sentence**: don't switch CJK families mid-sentence. Pick ZCOOL XiaoWei *or* Yozai for a given text run based on its role, never both inside one phrase.

### Aesthetic Notes

ZCOOL XiaoWei carries the magazine-poster voice that Bebas Neue provides for Latin — its tall narrow Hanzi forms have a similar architectural-display register, and at the 80–200px sizes Coral uses for jumbo features, ZCOOL XiaoWei holds shape without crumbling the way a system Hanzi face would. Critically, Bebas Neue's "uppercase only with heavy tracking" rule is meaningless for Hanzi (no case, no tracking), so the system's most foundational typographic rule simply doesn't apply to CJK — drop the tracking, drop the uppercase, and let ZCOOL XiaoWei stand on size alone. Yozai pairs with Inter for body and labels: its rounded humanist forms match Inter's warmth and stay legible inside coral / cream / ink surfaces. The three-surface region splits, 45° diagonal hatch, decorative oversized numerals (which can stay Latin — 01, 02, 03 work perfectly as wallpaper behind a Chinese column title), and 5px coral top borders are all content-agnostic and work identically in any language.

### Known CJK Gap

ZCOOL XiaoWei is a single-weight display face with limited glyph coverage compared to Noto family — exotic or technical Hanzi (rare surnames, classical characters, simplified-only variants outside GB2312) may fall back to system font. For Traditional Chinese decks, swap Yozai for `LXGW WenKai TC` (Google Fonts) which has fuller TC coverage. Bebas Neue's narrow condensed proportion has no exact Chinese equivalent — ZCOOL XiaoWei is medium-condensed at best, so Chinese hero titles will occupy ~20% more horizontal space than Latin equivalents. Adjust line-breaks (typically a 2-line Chinese title fills the same area as a 3-line English hero-title) and consider increasing the hero-title `min()` cap when a Chinese title runs long.

## Iteration Guide

1. Every new slide is a composition of one to three surface regions (coral, ink, cream) meeting at hard edges. Choose the surface split based on content emphasis.
2. Every new headline uses Bebas Neue uppercase with at least 1–2px letter-spacing. Don't sentence-case; don't untracked.
3. Every new section eyebrow uses Inter weight 700 uppercase 4px-tracked in `{colors.coral}` on cream/ink, or `{colors.black}` on coral.
4. Every new card uses the 5px coral top border + white fill + no shadow + no radius pattern.
5. Every new sidebar tile uses the 4px coral left border + white fill + no radius pattern.
6. Every new coral region carries a 45° diagonal hatch overlay at 6% opacity for texture.
7. New coral regions that feel underweight get a decorative oversized Bebas numeral at 12% opacity as wallpaper behind the primary title.
8. New chart series use coral + coral-dark; don't introduce additional series colors.
9. New quote layouts pair a coral left panel (with a giant mark at 35% opacity) with an ink or cream right panel (carrying the quote body in Inter weight 300).
10. The system has three surfaces and one accent (coral). Don't introduce a fourth surface color or a second accent.

## Known Gaps

- The Chart.js library is loaded via CDN; chart styling is configured inline in JS rather than reading from CSS variables — restyling requires editing JS.
- The 45° diagonal hatch stride values (20px/40px standard; 30px/60px variant; 60px/62px vertical) are hardcoded per usage; there is no parameterized hatch component.
- Decorative oversized numerals are placed as inline content with hardcoded values; there is no generative ordinal system.
- The cover composition's SVG zigzag-layer is an inline SVG embedded in the source — adjusting the zigzag pattern requires editing SVG markup.
- The timeline-line's dashed effect is rendered via a `::after` repeating-linear-gradient overlay rather than `border-style: dashed` — this gives precise control over dash dimensions but is unusual.
- The cover composition uses `min(120px, 9vw, 13vh)` triple-cap sizing to prevent the 3-line title from overflowing on short laptops; new cover variants should follow the same multi-axis cap pattern.
- The pull-quote layout uses Inter weight 300; Inter weight 300 is loaded explicitly but not used elsewhere — this is the system's only Inter Light deployment.
- The `cream-dark` and `light-gray` palette tokens are defined but used sparingly across the source; they are available for new compositions that need additional neutral shades.
- The nav-dot and nav-arrow `.dark` variant must be manually applied on cream-surface slides to maintain visibility — there is no automatic surface detection.
- Linear-gradient feature regions (135° coral-dark → coral) are the system's only intentional gradient; all other surfaces are flat colors. Using gradients elsewhere breaks the flat-surface aesthetic.
