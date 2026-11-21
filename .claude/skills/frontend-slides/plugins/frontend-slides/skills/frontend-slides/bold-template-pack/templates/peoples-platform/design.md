---
version: alpha
name: People's Platform
description: "A WPA-poster-meets-political-campaign presentation system built on three typefaces and a five-color palette that reduces to three functional roles. Alfa Slab One — a compressed slab serif — does all the heavy lifting at extreme sizes in pure uppercase. Caveat Brush drops in as a handwritten human interrupt: lowercase, slightly rotated, emotionally warm. DM Mono carries all metadata at tight uppercase tracking. The palette is electric cobalt blue, amber orange, and hot red — with red functioning exclusively as a shadow/depth color, never as a surface fill. Every slide gets a paper grain overlay that makes the whole deck feel screen-printed. The aesthetic is loud, confident, and populist — the kind of visual language that belongs on a protest placard, a union newsletter, or a campaign bus."

colors:
  blue: "#2C2CDC"
  blue-deep: "#1B1BB0"
  orange: "#F2A03A"
  orange-deep: "#E89321"
  red: "#E83A2A"
  red-deep: "#B7281C"
  cream: "#F4E9D6"
  paper: "#F5F2EA"
  ink: "#0E0E14"

typography:
  display-jumbo:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 540px
    fontWeight: 400
    lineHeight: 0.82
    letterSpacing: -0.02em
    textTransform: uppercase
  display-hero:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 260px
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: 0.005em
    textTransform: uppercase
  display-title:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 240px
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: 0.005em
    textTransform: uppercase
  display-xl:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 180px
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: 0.005em
    textTransform: uppercase
  display-lg:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 140px
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: 0.005em
    textTransform: uppercase
  display-md:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 120px
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: 0.005em
    textTransform: uppercase
  display-sm:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 108px
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: 0.005em
    textTransform: uppercase
  stat-unit:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 130px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0
    textTransform: uppercase
  section-num:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 54px
    fontWeight: 400
    lineHeight: 1.0
    textTransform: uppercase
  card-title:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 54px
    fontWeight: 400
    lineHeight: 1.0
    textTransform: uppercase
  kpi-value:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 88px
    fontWeight: 400
    lineHeight: 0.9
    textTransform: uppercase
  quote-mark:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 300px
    fontWeight: 400
    lineHeight: 0.7
    textTransform: uppercase
  quote-body:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 78px
    fontWeight: 400
    lineHeight: 1.08
    textTransform: uppercase
  item-title:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 38px
    fontWeight: 400
    lineHeight: 1.0
    textTransform: uppercase
  item-title-sm:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.0
    textTransform: uppercase
  toc-entry:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.0
    textTransform: uppercase
  subtitle:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 72px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.01em
    textTransform: uppercase
  cta:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 48px
    fontWeight: 400
    letterSpacing: 0.02em
    textTransform: uppercase
  stamp:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 28px
    fontWeight: 400
    letterSpacing: 0.04em
    textTransform: uppercase
  url:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 46px
    fontWeight: 400
    letterSpacing: 0.02em
    textTransform: uppercase
  script-lg:
    fontFamily: "Caveat Brush, cursive"
    fontSize: 96px
    fontWeight: 400
    textTransform: lowercase
  script-md:
    fontFamily: "Caveat Brush, cursive"
    fontSize: 64px
    fontWeight: 400
    textTransform: lowercase
  body-lg:
    fontFamily: "Archivo Narrow, sans-serif"
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Archivo Narrow, sans-serif"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  body-sm:
    fontFamily: "Archivo Narrow, sans-serif"
    fontSize: 26px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-xs:
    fontFamily: "Archivo Narrow, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  label:
    fontFamily: "DM Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.18em
    textTransform: uppercase
  label-wide:
    fontFamily: "DM Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.22em
    textTransform: uppercase
  label-accent:
    fontFamily: "DM Mono, monospace"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0.16em
    textTransform: uppercase
  signoff:
    fontFamily: "DM Mono, monospace"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.20em
    textTransform: uppercase

spacing:
  slide-gutter: 90px
  content-gutter: 120px
  topbar-height: 90px
  section-border: 6px
  inner-border: 3px
  grid-gap-lg: 90px
  grid-gap-md: 30px
  frame-inset: 48px

canvas:
  width: 1920px
  height: 1080px

components:
  inset-frame:
    border: "6px solid {colors.cream}"
    position: absolute
    inset: 48px
  topbar:
    position: absolute
    top: 0
    left: 0
    right: 0
    height: 90px
    background: "{colors.blue}"
    color: "{colors.cream}"
    padding: 0 90px
    fontFamily: "DM Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.18em
    borderBottom: "6px solid {colors.cream}"
  section-divider:
    borderBottom: "6px solid {colors.ink}"
    height: 6px
  toc-row:
    display: grid
    gridTemplateColumns: "90px 1fr 100px"
    gap: 24px
    padding: "20px 0"
    borderBottom: "3px solid {colors.ink}"
  toc-num:
    fontFamily: "Alfa Slab One, serif"
    fontSize: 54px
    color: "{colors.orange}"
    textShadow: "3px 3px 0 {colors.red}"
  pillar-col:
    padding: "60px 50px"
    borderRight: "6px solid {colors.ink}"
    background: "{colors.paper}"
  pillar-col-alt:
    background: "{colors.blue}"
    color: "{colors.cream}"
  pillar-tag:
    fontFamily: "DM Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.18em
    borderTop: "3px solid {colors.ink}"
    paddingTop: 18px
    marginTop: 14px
    alignSelf: flex-start
  kpi-card:
    border: "5px solid {colors.ink}"
    padding: "28px 30px"
    background: "{colors.paper}"
  kpi-card-alt:
    background: "{colors.blue}"
    color: "{colors.cream}"
  timeline-dot:
    width: 60px
    height: 60px
    borderRadius: 50%
    background: "{colors.orange}"
    border: "6px solid {colors.ink}"
    boxShadow: "6px 6px 0 {colors.red}"
  timeline-dot-alt:
    background: "{colors.blue}"
  timeline-track:
    height: 14px
    background: "{colors.ink}"
  compare-side-left:
    background: "{colors.paper}"
    borderRight: "6px solid {colors.ink}"
    padding: "60px 70px"
  compare-side-right:
    background: "{colors.blue}"
    color: "{colors.cream}"
    padding: "60px 70px"
  compare-label:
    fontFamily: "DM Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.22em
    paddingBottom: 14px
    borderBottom: "4px solid {colors.ink}"
    alignSelf: flex-start
  diamond-bullet:
    width: 24px
    height: 24px
    background: "{colors.red}"
    borderRadius: 4px
    transform: rotate(45deg)
  diamond-bullet-alt:
    background: "{colors.orange}"
  avatar:
    width: 120px
    height: 120px
    borderRadius: 50%
    background: "{colors.blue}"
    border: "6px solid {colors.blue}"
    boxShadow: "6px 6px 0 {colors.red}"
  quote-stamp:
    background: "{colors.blue}"
    color: "{colors.orange}"
    padding: "18px 32px"
    transform: rotate(-3deg)
    border: "5px solid {colors.cream}"
    fontFamily: "Alfa Slab One, serif"
    fontSize: 28px
    letterSpacing: 0.04em
    boxShadow: "6px 6px 0 {colors.red}"
    textTransform: uppercase
  circular-stamp:
    width: 200px
    height: 200px
    borderRadius: 50%
    background: "{colors.cream}"
    color: "{colors.blue}"
    border: "6px solid {colors.orange}"
    transform: rotate(-9deg)
    boxShadow: "8px 8px 0 {colors.red}"
  meta-pill:
    border: "3px solid {colors.cream}"
    padding: "8px 20px"
    borderRadius: 999px
  ribbon:
    position: absolute
    bottom: 0
    left: 0
    right: 0
    height: 60px
    background: "{colors.orange}"
    color: "{colors.blue}"
    borderTop: "6px solid {colors.ink}"
    fontFamily: "DM Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.22em
    fontWeight: 600
  lede-block:
    fontFamily: "Archivo Narrow, sans-serif"
    fontWeight: 500
    fontSize: 28px
    lineHeight: 1.35
    borderLeft: "4px solid {colors.ink}"
    paddingLeft: 50px
  lede-block-top:
    borderTop: "6px solid {colors.ink}"
    paddingTop: 24px
  underline-rule:
    height: 14px
    background: "{colors.ink}"
    width: "30%"
    marginTop: 60px
  kicker:
    fontFamily: "DM Mono, monospace"
    letterSpacing: 0.22em
    fontSize: 26px
    color: "{colors.red}"
    marginBottom: 48px
  grain-overlay:
    position: absolute
    inset: 0
    pointerEvents: none
    backgroundImage: "radial-gradient(rgba(0,0,0,.06) 1px, transparent 1px), radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)"
    backgroundSize: "3px 3px, 5px 5px"
    backgroundPosition: "0 0, 1px 2px"
    mixBlendMode: multiply
    opacity: 0.5
  orange-dot:
    width: 10px
    height: 10px
    borderRadius: 50%
    background: "{colors.orange}"
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

People's Platform is a **WPA-poster-meets-political-campaign slide system** — the visual language of conviction, the graphic register of public address. The canvas is warm paper (`{colors.paper}` — #F5F2EA), a hair warmer than white, and every slide gets a grain texture applied via a CSS pseudo-element that makes the whole deck feel screen-printed rather than rendered.

The typeface stack is a three-way class system. **Alfa Slab One** owns the stage at extreme sizes — compressed, slab-heavy, all caps, intrinsically authoritative. It is the voice that shouts. **Caveat Brush** is the human interrupt — handwritten, lowercase, slightly rotated, emotionally present. It is the voice that whispers. **DM Mono** is the bureaucratic record-keeper — monospace, wide-tracked uppercase, 24px, always — the voice that accounts for things. Archivo Narrow is the workhorse body face: never used at display sizes, always condensed, weight 500 for readability.

The palette has five named colors but three functional roles. **Blue** (`{colors.blue}` — #2C2CDC) is the primary structural color: backgrounds for high-emphasis surfaces, borders for content dividers, text color on non-blue backgrounds. **Orange** (`{colors.orange}` — #F2A03A) is the energy color: stat figures, column numerals, accent text within blue surfaces. **Red** (`{colors.red}` — #E83A2A) is the depth color — it never appears as a surface fill, only as the first layer of a stacked text-shadow or box-shadow. Blue-deep and red-deep are the outer shadow layers in the double-stacked shadow system.

The signature depth technique is the **stacked offset text-shadow**: orange text casts a red shadow at 6–12px, which casts a red-deep shadow at 12–24px. This creates a three-layer quasi-3D letterpress effect that is the system's most recognisable trait. Box-shadows on interactive elements mirror the same treatment: `6px 6px 0 {colors.red}`.

**Key Characteristics:**
- Paper canvas (`{colors.paper}` — #F5F2EA) with grain overlay via CSS pseudo-element on every slide.
- Stacked double text-shadow: `Npx Npx 0 {colors.red}, 2Npx 2Npx 0 {colors.red-deep}`. Shadow size scales with font size.
- Alfa Slab One for all display and structural type — uppercase, line-height 0.82–1.04, letter-spacing 0.005em.
- Red (`{colors.red}`) functions exclusively as a shadow color — never a surface background.
- Heavy 6px ink borders for all major structural divisions (topbars, section headers, column separators, inset frames).
- DM Mono labels at exactly 24px with 0.18–0.22em tracking across all slides.
- Caveat Brush appears at 64–96px, always lowercase, always rotated 2–5 degrees — a deliberate roughness signal.
- Orange bottom ribbon: a horizontal marquee strip anchored to the bottom of data-heavy slides.
- Inset decorative frame (6px solid cream at `inset: 48px`) used on blue-background slides.

## Colors

### Primary Palette
- **Blue** (`{colors.blue}` — #2C2CDC): Electric cobalt. The dominant surface color for high-emphasis slides and structural elements. Used as full-slide background, column fills, topbar backgrounds, text on cream/paper surfaces, avatar fills, and compare-panel dark side.
- **Blue Deep** (`{colors.blue-deep}` — #1B1BB0): A darker blue. Used exclusively as the outermost layer of stacked text-shadows. Never a surface fill.
- **Orange** (`{colors.orange}` — #F2A03A): Warm amber. The energy accent. Used for oversized stat numerals, column ordinals, CTA button fill, ribbon background, accent text within blue surfaces, and text-shadow inner layer on stamp elements.
- **Orange Deep** (`{colors.orange-deep}` — #E89321): Darker amber. Reserved for the deepest shadow layer on orange elements. Not used as a surface fill.
- **Red** (`{colors.red}` — #E83A2A): Hot red. The depth color. Used exclusively in text-shadows and box-shadows — the first offset layer on most display text and buttons. Never appears as a background or primary text color.
- **Red Deep** (`{colors.red-deep}` — #B7281C): Dark red. The outermost layer of the double text-shadow on the largest display elements. Never a surface fill.

### Surface Palette
- **Cream** (`{colors.cream}` — #F4E9D6): Warm cream. Used as text/border color on blue surfaces (inverted mode), as the inset frame border, and as the full background on cream-tone slides.
- **Paper** (`{colors.paper}` — #F5F2EA): Off-white with a warm cast. The default slide background — slightly warmer and less stark than #fff. Most content slides use this.
- **Ink** (`{colors.ink}` — #0E0E14): Near-black with a barely-perceptible blue undertone. Used for all structural borders, body text, column dividers, timeline tracks, and KPI card borders.

### Color Roles Summary
- **Blue surfaces** = high-emphasis, conclusive, authoritative moments
- **Paper/cream surfaces** = content-first, readable, subordinate moments
- **Orange** = the number, the energy, the thing that matters most on a given slide
- **Red** = never a color you see directly — only a shadow you feel

## Typography

### Font Families
Three typefaces; each occupies a completely non-overlapping register:

**Alfa Slab One** is the primary voice. A compressed, heavy slab serif with strong verticals and blocky serifs. Used at weight 400 (the only weight available, which is intrinsically bold) in strict uppercase for every display moment from 28px stamps to 540px stat figures. Its compressed letterform means even massive sizes don't feel wide — they feel tall and column-like. The slight positive letter-spacing (0.005em) keeps glyphs from touching at large sizes.

**Caveat Brush** is the human voice. A rough handwritten script face used only at large sizes (64–96px), always lowercase, always with a small rotation (-2 to -5 degrees). It appears at moments of warmth, transition, or informality — a script annotation in an otherwise rigidly structured deck. It is never used for body copy or labels.

**DM Mono** is the accounting voice. Monospace, 24px, wide letter-spacing (0.18–0.22em), uppercase. It appears on topbars, footers, kicker labels, metadata rows, source citations, and ribbon text. It is always a supporting element — the technical spec printed at the bottom of a poster, not the headline.

**Archivo Narrow** is the body voice. A condensed sans used for all running body copy: pillar descriptions, list item paragraphs, compare list items, stat annotations. Weight 500 for most body text; 400 for smaller captions. Never used at display sizes.

### Display Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display-jumbo}` | 540px | Alfa Slab One | 400 | Full-bleed oversized stat numeral |
| `{typography.display-hero}` | 260px | Alfa Slab One | 400 | Dominant closing or opening headline |
| `{typography.display-title}` | 240px | Alfa Slab One | 400 | Primary deck title |
| `{typography.display-xl}` | 180px | Alfa Slab One | 400 | Large column ordinal numeral |
| `{typography.display-lg}` | 140px | Alfa Slab One | 400 | Section headline, primary |
| `{typography.display-md}` | 120px | Alfa Slab One | 400 | Section headline, secondary |
| `{typography.display-sm}` | 108px | Alfa Slab One | 400 | Body-adjacent manifesto headline |
| `{typography.stat-unit}` | 130px | Alfa Slab One | 400 | Superscript unit symbol alongside stat |
| `{typography.quote-mark}` | 300px | Alfa Slab One | 400 | Decorative oversized quotation mark |
| `{typography.quote-body}` | 78px | Alfa Slab One | 400 | Pull quote body text |
| `{typography.kpi-value}` | 88px | Alfa Slab One | 400 | KPI or metric card value |
| `{typography.subtitle}` | 72px | Alfa Slab One | 400 | Subtitle or secondary title alongside a primary headline |
| `{typography.card-title}` | 54px | Alfa Slab One | 400 | Card or column heading |
| `{typography.section-num}` | 54px | Alfa Slab One | 400 | Section or item ordinal numeral |
| `{typography.cta}` | 48px | Alfa Slab One | 400 | CTA button label |
| `{typography.url}` | 46px | Alfa Slab One | 400 | URL or contact address |
| `{typography.item-title}` | 38px | Alfa Slab One | 400 | List item or node heading |
| `{typography.toc-entry}` | 36px | Alfa Slab One | 400 | Table of contents entry title |
| `{typography.item-title-sm}` | 30px | Alfa Slab One | 400 | Dense list item heading |
| `{typography.stamp}` | 28px | Alfa Slab One | 400 | Stamp or badge label |

### Script Scale

| Token | Size | Use |
|---|---|---|
| `{typography.script-lg}` | 96px | Prominent handwritten accent — transition word, emotional opener |
| `{typography.script-md}` | 64px | Smaller handwritten annotation — subtitle callout, sub-label |

Both script tokens are always lowercase and always applied with a rotation between -2deg and -5deg. Never use Caveat Brush without rotation.

### Body and Label Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.body-lg}` | 30px | Archivo Narrow | 500 | Stat annotation, primary body paragraph |
| `{typography.body-md}` | 28px | Archivo Narrow | 500 | Column body, lede paragraph, compare list |
| `{typography.body-sm}` | 26px | Archivo Narrow | 500 | Supporting body paragraphs |
| `{typography.body-xs}` | 24px | Archivo Narrow | 400 | Dense list items, captions |
| `{typography.label}` | 24px | DM Mono | 400 | Standard metadata label (0.18em tracking) |
| `{typography.label-wide}` | 24px | DM Mono | 400 | Footline and ribbon text (0.22em tracking) |
| `{typography.label-accent}` | 32px | DM Mono | 600 | Highlighted metadata (e.g. section count) |
| `{typography.signoff}` | 26px | DM Mono | 400 | Footer sign-off block (0.20em tracking) |

### Typography Principles
Alfa Slab One is always uppercase — never use it in sentence case or lowercase. Line-height at display sizes is tight: 0.82–0.88 for large headlines, 1.04 only for multi-line body-adjacent text where line collision would occur. The 0.005em letter-spacing is nearly invisible but prevents glyph collision at 100px+ sizes.

The stacked text-shadow is the inline styling rule for display text: orange display type always casts `{colors.red}` as its first shadow. At sizes above 200px, add a second `{colors.red-deep}` layer at double the offset. At sizes below 100px, a single 3px–6px offset in `{colors.red}` is sufficient.

DM Mono labels are always 24px regardless of context. The tracking varies by placement: 0.18em for topbar/footer, 0.22em for ribbon and footline, 0.16em for side labels in split panels. Never reduce tracking on DM Mono — at 24px without tracking, it reads as utilitarian rather than editorial.

Archivo Narrow is always weight 400 or 500. Never use it at display sizes. It is a supporting voice, not a headline voice.

## Layout

### Canvas System
Every slide is 1920×1080px. The `deck-stage` custom element handles scaling. All content is absolutely positioned or uses CSS grid — no scrolling.

### Gutter System
- **Slide gutter** (90px left/right): The standard edge padding for most content sections.
- **Content gutter** (120px left/right): Used for body content within slides that already have a structural header — provides extra breathing room for reading text.
- **Topbar height** (90px): The fixed-height blue topbar band that sits at the absolute top of a slide.
- **Frame inset** (48px): The distance from the slide edge to the decorative inset frame border used on blue-background slides.

### Universal Chrome
The system does not enforce a universal topbar on every slide. Two chrome patterns exist:

**Topbar pattern** — A full-width 90px blue bar anchored to the top (`position:absolute; top:0; left:0; right:0`). Contains DM Mono 24px label text at 0.18em tracking. Carries a 6px solid cream bottom border. Used on high-emphasis blue-background slides.

**Section-divider pattern** — A 6px solid ink horizontal rule between a header block and the content area below. The header block uses 90px left/right padding; the content below uses 90px padding. No topbar — the rule is the dividing element.

Both patterns can coexist on a single slide or be used independently.

## Depth and Elevation

### Stacked Text-Shadow (Primary Technique)
The system's signature. Display text casts layered offset shadows in the same direction (bottom-right), creating a quasi-3D letterpress effect. Three tiers by element size:

| Tier | Offset layer 1 | Offset layer 2 | Use |
|---|---|---|---|
| Small | `3px 3px 0 {colors.red}` | — | Items below 72px |
| Medium | `5px–6px 5px–6px 0 {colors.red}` | — | 72px–140px display |
| Large | `10px 10px 0 {colors.red}, 20px 20px 0 {colors.red-deep}` | | 140px–260px display |
| Jumbo | `12px 12px 0 {colors.red}, 24px 24px 0 {colors.red-deep}` | | 260px+ stat figures |

The orange display text is the "face" layer; red is the "body"; red-deep is the "foot." The illusion is of a letterform with physical thickness.

### Box-Shadow (Secondary Technique)
Interactive and decorative elements (stamps, avatars, CTA buttons, KPI cards) use the same offset logic in box-shadow form: `6px 6px 0 {colors.red}` or `8px 8px 0 {colors.red}`. This unifies the depth system: all elements in the deck cast shadows in the same direction at the same apparent light angle.

### Grain Texture (Atmospheric Depth)
Every slide carries a `.grain::before` pseudo-element: two overlapping radial-gradient dot grids at 3px and 5px pitch, with `mix-blend-mode: multiply` and 50% opacity. This simulates screen-print halftone texture, giving the flat digital surfaces a physical, printed quality. It is not elevation but atmosphere — the entire deck reads as produced rather than rendered.

### Flat Elements
DM Mono labels, ink section rules, body text, and grid lines are completely flat. No shadows on structural dividers.

## Shapes and Treatment

### Border Radius Scale
| Value | Use |
|---|---|
| 999px (pill) | Meta label pills in topbar/header areas |
| 50% (circle) | Avatar elements, timeline milestone dots, circular stamp |
| 4px | Diamond bullet pseudo-elements (rotated 45deg to form a diamond) |
| 0px | All structural elements: columns, cards, topbars, frames, ribbons, KPI cards, stamps |

The system is almost entirely square. The only soft shapes are the pill (for metadata chips), the circle (for avatars, dots, the closing stamp), and the diamond bullet. The squareness of structural elements reinforces the printed/constructed aesthetic.

### Border Weights
- **6px solid `{colors.ink}`** — Primary structural borders: section dividers, column separators, topbar bottom edges, inset frames, KPI card borders, CTA button border.
- **6px solid `{colors.cream}`** — Inverted structural borders on blue surfaces: inset frame, topbar divider in cream-on-blue mode.
- **5px solid** — Secondary structural borders: quote stamp, compare list item treatment.
- **4px solid** — Tertiary dividers: side labels in compare panels, lede left-border.
- **3px solid `{colors.ink}`** — Fine structural lines: TOC row separators, column tags, stat source dividers, inner timeline lines.

### Decorative Elements

**Inset frame** — A 6px solid cream border at `inset: 48px` creates a second inner rectangle on blue-background slides. It reinforces the poster/placard aesthetic — the design within a design.

**Orange ribbon** — A 60px bottom-anchored strip in `{colors.orange}` with 6px ink top border and repeating DM Mono text at 0.22em tracking. Functions as a marquee footer on data slides.

**Diamond bullet** — List item marker using a `::before` pseudo-element: 24px × 24px, `background: {colors.red}`, `border-radius: 4px`, `transform: rotate(45deg)`. On blue-background lists, uses `{colors.orange}` instead. The shape sits 48px left of the text (positioned absolutely).

**Circular stamp** — A 200px circle (`{components.circular-stamp}`) rotated -9deg with 6px orange border and an 8px red box-shadow. Functions as a seal — the physical-world approval mark on a bureaucratic document.

**Rotated rectangular stamp** — A rectangular block rotated -3deg with 5px cream border and 6px red box-shadow. Contains Alfa Slab One 28px text at 0.04em tracking. Lighter rotation than the circular stamp — feels like an address label placed at a slight angle.

**Script annotation** — Caveat Brush 64–96px, lowercase, rotated 2–5 degrees. Always appears adjacent to an Alfa Slab One headline it qualifies or interrupts — never alone.

**Column ordinal** — 180px Alfa Slab One orange numeral with a 5px red text-shadow, followed by a 3px ink top-border DM Mono tag label below it. This pairing (large orange numeral + small mono tag) is the system's standard way of labelling columns or sections.

**Underline rule** — A 14px tall solid ink rectangle, width 30% of its container, used as a full-stop after a manifesto headline. It is heavier than a hairline rule — closer to a redaction bar.

**Grain overlay** — The `.grain` class adds `::before` pseudo-element texture to every slide. It cannot be removed from a slide in this system — it is structural to the aesthetic.

## Do's and Don'ts

### Do
- Apply the grain overlay (`.grain::before`) to every slide. It is not decorative — it is the surface that everything else is printed on.
- Use the stacked text-shadow on all orange and cream display text. Shadowless Alfa Slab One reads flat and loses the letterpress character.
- Scale shadow offset proportionally to font size: small offset for small type, jumbo offset for jumbo type.
- Keep red exclusively as a shadow color. The moment red appears as a text color or background fill, the depth system collapses.
- Use Caveat Brush only at large sizes (64px+), always lowercase, always slightly rotated. Never for body text.
- Keep DM Mono labels at exactly 24px with at least 0.16em letter-spacing. The monospace face at body size with normal tracking reads as code, not editorial.
- Use the 6px border weight for major structural divisions. Thinner reads as SaaS; thicker looks like a design mistake.
- When a slide uses a blue background, use the inset frame — it distinguishes blue-background slides as "framed" rather than merely filled.
- Apply `{colors.orange}` as the numerals, values, and accent text on blue surfaces. Blue-on-orange or cream-on-blue are the only other permitted text combinations on dark surfaces.

### Don't
- Don't use red as a background or primary text color. It is a shadow material, not a surface material.
- Don't use Caveat Brush at body sizes or without rotation. Flat, small handwriting reads as untidy, not intentional.
- Don't apply Alfa Slab One in mixed case. The uppercase lock is essential to the slab's authority.
- Don't soften the border weights. 1px or 2px borders on structural elements break the printed-matter aesthetic.
- Don't round card or container corners. The inset frame and KPI cards are strictly square.
- Don't use Archivo Narrow for headlines. It is a body and lede face only — it lacks the visual weight for display use.
- Don't use blue-deep or red-deep as surface colors. They are shadow-only values — their role is depth, not fill.
- Don't omit the diamond bullet rotation on list items. A 45deg-rotated square is a diamond; an upright square is a box — the shape signals hand-crafted, not generic.
- Don't vary the DM Mono font size. 24px is the single fixed size for all monospace label text — increasing it for emphasis breaks the system; use `{typography.label-accent}` (32px, weight 600) as the sole exception.

## Responsive Behavior

This template is designed exclusively for 1920×1080 presentation display. The `deck-stage` custom element handles viewport scaling via CSS transforms — the 1920×1080 canvas scales proportionally to any screen size without layout changes.

Slides advance via keyboard or presentation clicker through `deck-stage.js`. No hover states, no interactive form elements, no responsive breakpoints.

For print and PDF export: at 96dpi, the 1920×1080 canvas maps to a 20×11.25 inch frame. The grain overlay uses `mix-blend-mode: multiply` — in PDF export, blend modes may flatten; test print output and consider disabling the grain for printed formats.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face | Chinese face | Weight |
|---|---|---|---|
| Display / title / quote (Alfa Slab One UPPERCASE) | Alfa Slab One | Noto Serif SC (思源宋体) | 900 |
| Script interrupt (Caveat Brush lowercase rotated) | Caveat Brush | — (no good equivalent; see Aesthetic Notes) | — |
| Body (Archivo Narrow 500) | Archivo Narrow | Noto Sans SC (思源黑体) | 500 |
| Label / mono (DM Mono UPPERCASE tracked) | DM Mono | Noto Sans SC | 400 (do not force monospace on CJK) |

### Mixed-Content Strategy

Strategy A — extend each token's `fontFamily` to include the Chinese face after the Latin face. Alfa Slab tokens become `"Alfa Slab One, Noto Serif SC, serif"`; Archivo Narrow tokens become `"Archivo Narrow, Noto Sans SC, sans-serif"`; DM Mono tokens become `"DM Mono, Noto Sans SC, monospace"`. Latin glyphs render in their original face; CJK falls through to the SC fallback automatically.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Caveat+Brush&family=Archivo+Narrow:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&family=Noto+Serif+SC:wght@400;500;700;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">
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

People's Platform is a WPA-poster system built on three load-bearing typefaces, and **none of the three has a clean Chinese transfer**.

**Alfa Slab One** is a compressed slab serif at extreme sizes (up to 540px) in uppercase. There is no Chinese slab serif of equivalent weight and authority available on CDN. **Noto Serif SC at weight 900** is the closest match — it carries the slab-like heaviness and the structural authority — but it reads as more "literary monument" than "protest placard." Accept this register shift: Chinese versions of this system feel closer to a heritage-era public-notice board (think 大字报 or museum signage) than to a 1930s WPA poster. The stacked red text-shadow still applies and still carries the system's letterpress depth signature.

**Caveat Brush** is the "human interrupt" voice — lowercase, rotated, emotionally warm. **This does not transfer to Chinese.** Chinese brush calligraphy (Ma Shan Zheng / 马善政) carries cultural and traditional weight — it reads as ceremonial, formal, even bureaucratic, NOT the casual personal voice of Latin Caveat. **Recommended approach: leave the brush moment out entirely on pure-CJK slides.** A second option: use a short Latin word in Caveat Brush as the interrupt even within Chinese content (e.g., a script `yes!` annotation beside a Chinese headline) — this preserves the casual interrupt energy and signals "voice break" without invoking Chinese calligraphic tradition.

**DM Mono** uppercase tracked labels do not transfer to CJK. Set Chinese metadata in **Noto Sans SC 400** with letter-spacing reset to 0 and no uppercase. Pure-Latin tags (URLs, dates, edition numbers) keep DM Mono.

**Archivo Narrow** is condensed at weight 500. **Noto Sans SC has no condensed variant.** Use Noto Sans SC 500 at the original Archivo size and accept that Chinese body type sits slightly wider than Latin body type. The single-color paper canvas and the grain overlay absorb the width difference.

The stacked text-shadow (orange → red → red-deep) is the system's most recognizable trait. **It transfers perfectly to Chinese.** Apply it to every Chinese display headline in orange and the letterpress depth survives the script switch. The blue-and-orange-and-red palette is also fully script-agnostic.

The diamond bullet marker, the rotated rubber stamp, the inset cream frame, the 6px ink borders — all work unchanged in Chinese.

### Known CJK Gap

**Caveat Brush has no acceptable Chinese equivalent.** The "human interrupt" voice is structurally absent in a pure-CJK People's Platform deck. The two workarounds (drop the interrupt entirely; use Latin-in-Chinese for the script moments) are both visible aesthetic compromises — the populist-poster system loses one of its three voices when forced into pure Chinese. Mixed-content decks (English-led with Chinese accents, or vice versa) are the strongest fit for this template.

## Iteration Guide

1. The stacked shadow is a hard invariant — any new display element in orange or cream must carry it. Determine the offset by dividing the font size by approximately 20 to get the first shadow distance, double it for the second.
2. Any new slide with a blue background gets an inset frame (6px cream, `inset: 48px`) and, if it has a header bar, that bar uses the topbar pattern with a 6px cream bottom border.
3. New columns or side-by-side panels follow the 6px ink separator convention. Asymmetric layouts (e.g. 60/40 split) are fine as long as the separator border remains 6px.
4. New KPI or data cards use the `{components.kpi-card}` pattern: 5px ink border, paper background, optional alt variant in blue. The number inside uses Alfa Slab One with the standard text-shadow.
5. New list items always use the diamond bullet (24px × 24px, 4px radius, rotate 45deg). Use red for ink-background items, orange for blue-background items.
6. If a new decorative stamp or badge is needed, use Alfa Slab One with `letter-spacing: 0.04em`, a box-shadow of `6px 6px 0 {colors.red}`, and a slight rotation (–3 to –9deg). Circular stamps get 50% border-radius; rectangular ones stay square.
7. The grain overlay is a CSS pseudo-element on the `section` element — it must be present on every new slide via the `.grain` class.
8. Script (Caveat Brush) text is an interrupt, not a default. Use it once per slide maximum, and only at 64px+.

## Known Gaps

- `deck-stage.js` is an external script dependency not documented here. Slide navigation and scaling are handled by it entirely.
- The orange ribbon on data slides is implemented with static repeated text — there is no JavaScript marquee animation. At 1920px width, the text wraps naturally; for longer strings, manually duplicate the text.
- The grain overlay uses `mix-blend-mode: multiply`. This requires a semi-transparent background or a parent with a visible fill to produce the texture effect — on pure white or pure black surfaces the effect may be invisible.
- Speaker notes are embedded as a `<script type="application/json">` block in the template — this data is presentational, not part of the design system, and is not captured in these tokens.
- Archivo Narrow is loaded as a web font. It has broad system fallback (`system-ui, sans-serif`) but the condensed width of the system font stack fallback will differ significantly from Archivo Narrow and may break layouts at tight grid configurations.
- The `text-wrap: pretty` property on quote text is a modern CSS feature with limited browser support — it may not apply in older export environments.
