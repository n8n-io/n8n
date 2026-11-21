---
version: alpha
name: Daisy Days
description: A cheerful, childlike presentation system built around the chunky display face Fredoka One and the rounded humanist sans Quicksand. The palette is a sunny garden — cream canvas, turquoise, soft pink, butter yellow, mint, lavender, peach, sky blue, and a single coral accent — with charcoal-brown 2D outlines wrapping every shape. Hard offset shadows in dark charcoal, generous border-radius, and hand-drawn SVG decorations (daisies, stars, suns, clouds, rainbows) anchor the aesthetic somewhere between a children's storybook spread and a sticker-sheet kawaii zine.

colors:
  cream: "#F5F0E6"
  turquoise: "#7ECDC0"
  soft-pink: "#F7C8D4"
  butter: "#FDE68A"
  mint: "#A8E6CF"
  lavender: "#D4A5E8"
  peach: "#FFCBA4"
  sky: "#A8D8F0"
  coral: "#F8635F"
  text-dark: "#2D2D2D"
  text-muted: "#6B6B6B"
  white: "#FFFFFF"

borders:
  primary: "3px solid {colors.text-dark}"
  thin: "2px solid {colors.text-dark}"

shadows:
  default: "6px 6px 0 {colors.text-dark}"
  small: "4px 4px 0 {colors.text-dark}"
  text-headline: "3px 3px 0 {colors.text-dark}"
  text-headline-soft: "3px 3px 0 rgba(0,0,0,0.2)"

typography:
  display:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "clamp(3.2rem, 7vw, 6.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
  headline:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
  title:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "clamp(1.8rem, 3.5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: 0.02em
  subtitle:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "clamp(1.3rem, 2vw, 1.8rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.02em
  label-display:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "clamp(1rem, 1.5vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.02em
  quote:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "clamp(1.3rem, 2.5vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: "'Quicksand', sans-serif"
    fontSize: "clamp(0.95rem, 1.3vw, 1.15rem)"
    fontWeight: 500
    lineHeight: 1.6
  body-strong:
    fontFamily: "'Quicksand', sans-serif"
    fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)"
    fontWeight: 600
    lineHeight: 1.5
  meta:
    fontFamily: "'Quicksand', sans-serif"
    fontSize: "clamp(0.8rem, 1.1vw, 0.95rem)"
    fontWeight: 600
    lineHeight: 1.45
  badge:
    fontFamily: "'Fredoka One', cursive"
    fontSize: "0.85rem"
    fontWeight: 400
    letterSpacing: 0.02em

spacing:
  pad-slide: "40px 60px"
  pad-card-lg: "48px 56px"
  pad-card-md: "32px 40px"
  pad-card-sm: "16px 24px"
  gap-grid-lg: "28px"
  gap-grid-md: "24px"
  gap-grid-sm: "14px"
  radius: "20px"
  radius-lg: "28px"
  radius-pill: "50px"
  radius-round: "50%"

canvas:
  width: 100vw
  height: 100vh

components:
  card:
    background: "{colors.white}"
    border: "3px solid {colors.text-dark}"
    borderRadius: "{spacing.radius}"
    boxShadow: "{shadows.default}"
  card-lg:
    background: "{colors.white}"
    border: "3px solid {colors.text-dark}"
    borderRadius: "{spacing.radius-lg}"
    boxShadow: "{shadows.default}"
  badge-pill:
    display: "inline-block"
    padding: "8px 20px"
    borderRadius: "{spacing.radius-pill}"
    border: "3px solid {colors.text-dark}"
    fontFamily: "'Fredoka One', cursive"
    fontSize: "0.85rem"
    background: "{colors.butter}"
  framed-header:
    description: "A two-part stacked card: a colored header strip (any accent surface) with rounded top corners and no bottom border, sitting flush above a white body with rounded bottom corners. The pair reads as a single unit with a tonal cap."
    headerBackground: "any accent surface"
    headerBorderRadius: "{spacing.radius-lg} {spacing.radius-lg} 0 0"
    bodyBackground: "{colors.white}"
    bodyBorderRadius: "0 0 {spacing.radius-lg} {spacing.radius-lg}"
    border: "3px solid {colors.text-dark}"
    boxShadow: "{shadows.default}"
  circle-dot:
    width: "48px"
    height: "48px"
    borderRadius: "{spacing.radius-round}"
    border: "3px solid {colors.text-dark}"
    fontFamily: "'Fredoka One', cursive"
    color: "{colors.white}"
    description: "Outlined colored disc holding a numeral or single letter. Used as timeline node, step marker, or list bullet anchor."
  circle-icon:
    width: "44px"
    height: "44px"
    borderRadius: "{spacing.radius-round}"
    border: "3px solid {colors.text-dark}"
    fontFamily: "'Fredoka One', cursive"
    background: "any accent surface"
    description: "Smaller cousin of circle-dot used as a card icon at the top of an info card."
  step-circle-lg:
    width: "90px"
    height: "90px"
    borderRadius: "{spacing.radius-round}"
    border: "3px solid {colors.text-dark}"
    fontFamily: "'Fredoka One', cursive"
    color: "{colors.white}"
    boxShadow: "{shadows.small}"
    description: "Oversized outlined disc used as a process step marker. Carries a hard offset shadow."
  avatar-circle:
    width: "100px"
    height: "100px"
    borderRadius: "{spacing.radius-round}"
    border: "3px solid {colors.text-dark}"
    background: "{colors.white}"
    boxShadow: "{shadows.small}"
    overflow: "hidden"
  bullet-dot:
    width: "20px"
    height: "20px"
    borderRadius: "{spacing.radius-round}"
    border: "2px solid {colors.text-dark}"
    background: "{colors.butter}"
    description: "Small outlined disc used as a ::before bullet for body list items, anchored 4px from the top of the line."
  list-dash:
    description: "A simple muted-text dash character used as a ::before bullet for compact in-card lists (day-card body)."
  legend-swatch:
    width: "18px"
    height: "18px"
    border: "2px solid {colors.text-dark}"
    borderRadius: "4px"
  decoration:
    position: "absolute"
    pointerEvents: "none"
    zIndex: 1
    description: "Hand-drawn SVG sticker (daisy, star, sun, cloud, rainbow) placed at slide corners and edges as atmospheric ornament. Often crops past the slide edge."
  nav-dots:
    position: "fixed"
    placement: "right edge, vertically centered"
    dotSize: "12px"
    dotBorder: "2px solid {colors.text-dark}"
    activeBackground: "{colors.butter}"
    activeTransform: "scale(1.2)"
  slide-counter:
    position: "fixed"
    placement: "bottom center"
    background: "{colors.white}"
    border: "3px solid {colors.text-dark}"
    borderRadius: "{spacing.radius-pill}"
    padding: "6px 20px"
    fontFamily: "'Fredoka One', cursive"
    boxShadow: "{shadows.small}"
  chart-container:
    background: "{colors.white}"
    border: "3px solid {colors.text-dark}"
    borderRadius: "{spacing.radius-lg}"
    boxShadow: "{shadows.default}"
    padding: "{spacing.pad-card-md}"
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Daisy Days is a **cheerful childlike presentation system** rooted in a single typographic pairing: the chubby rounded display face **Fredoka One** for every headline, and the friendly humanist sans **Quicksand** for every line of body and meta text. The visual language descends from picture-book illustration and sticker-sheet kawaii: every shape carries a charcoal 2D outline, every elevated element casts a solid offset shadow, and every surface is a pastel from a sunny garden palette.

The color philosophy is **multi-pastel with a single warm pop**. The background canvas alternates between a soft cream (`{colors.cream}`) and the saturated pastels (`{colors.turquoise}`, `{colors.soft-pink}`, `{colors.butter}`, `{colors.mint}`, `{colors.lavender}`, `{colors.peach}`, `{colors.sky}`). The lone high-saturation accent is `{colors.coral}` — used sparingly on small marker dots and headline strokes, never as a full surface. Headlines on top of a colored surface get a 3px charcoal text-shadow, which gives display text the same outlined appearance as the shapes around it; headlines on cream stay flat. Body text never leaves `{colors.text-dark}` or `{colors.text-muted}`.

Depth is **2D and graphic**, not photographic. Every elevated element gets a `{shadows.default}` or `{shadows.small}` — a solid charcoal block offset to the bottom-right, with zero blur. The combination of thick charcoal outline plus hard offset shadow gives the system its sticker-on-paper feel. There are no gradients, no glow, no glass effects.

The signature treatment is the **hand-drawn SVG decoration layer**. Every region carries 3–7 absolutely-positioned ornaments — yellow-centered daisies, multi-color stars, smiling suns, fluffy clouds, arched rainbows — that cluster at the corners and edges, often cropping past the slide boundary at `top:-30px / right:-20px`. These decorations sit on a `z-index:1` layer behind the content (`z-index:2`) and carry the same 2px-ish charcoal stroke as the rest of the system, unifying ornament with structure.

**Density philosophy: full but not crowded.** This system reads as authoritative when every slide carries one focused content region (a card, a frame, a grid) at the center plus a generous wreath of corner ornaments at the edges. An empty corner with no decoration reads as broken — the ornaments are part of the structural composition, not optional garnish. Conversely, dense overlapping content panels read as anxious; the system wants one main subject, framed and surrounded, not three competing ones. Aim for one bordered/shadowed container per slide, with the corner decorations doing the work of filling the rest of the canvas.

**Key Characteristics:**
- Cream (`{colors.cream}`) default canvas with rotating pastel surfaces — every slide may pick a different surface color.
- Fredoka One for all headline / display / quote text; Quicksand 500/600 for all body and meta text.
- Every shape and card carries a 3px solid charcoal outline (`{colors.text-dark}`) plus a hard offset shadow (`{shadows.default}` or `{shadows.small}`).
- Generous border-radius: 20px on standard cards, 28px on featured cards, pill (`{spacing.radius-pill}`) on badges, full circle on dots and avatars.
- Hand-drawn SVG ornaments (daisies, stars, suns, clouds, rainbows) cluster at corners and crop past slide edges as atmospheric layer.
- Headlines on colored surfaces always carry a 3px solid charcoal text-shadow; headlines on cream sit flat.
- Bullets are colored outlined dots (`{components.bullet-dot}`), not glyphs. Lists feel hand-set.
- One main content container per slide, surrounded by 3–7 ornaments. Empty corners are wrong.

## Colors

### Palette
- **Cream** (`{colors.cream}` — #F5F0E6): The default canvas. A warm off-white that reads as paper-stock rather than digital white. Used as the deck's neutral surface — title openings, info-card slides, anything that wants to feel like a storybook page.
- **Turquoise** (`{colors.turquoise}` — #7ECDC0): A medium-saturation teal-green. The boldest of the surface pastels; loud enough that headlines on top need the charcoal text-shadow to stay legible.
- **Soft Pink** (`{colors.soft-pink}` — #F7C8D4): A bubblegum blush. Used as a full surface, a header-strip color, a day-marker fill, and the quote-mark accent inside a quote card.
- **Butter** (`{colors.butter}` — #FDE68A): A buttery pastel yellow. The active-state color for nav dots, the default badge fill, and the default bullet-dot fill. It is the system's "highlight" color when something needs to feel marked.
- **Mint** (`{colors.mint}` — #A8E6CF): A cool celadon green. A surface color, a header-strip color, a circle-icon fill, and a timeline-dot color.
- **Lavender** (`{colors.lavender}` — #D4A5E8): A muted purple. Surface, header-strip, marker-dot, day-marker — same role flexibility as mint and soft-pink.
- **Peach** (`{colors.peach}` — #FFCBA4): A warm pastel orange. Used as a surface (typically on process or sequence slides) and an accent.
- **Sky** (`{colors.sky}` — #A8D8F0): A pastel blue. Surface and accent color, often paired with cloud decorations.
- **Coral** (`{colors.coral}` — #F8635F): The single saturated accent. Used only as a marker fill (a numbered dot, a timeline node, a step circle) and a day-header — never as a full slide surface. Coral is the system's "look here" color and loses its punch if overused.
- **Text Dark** (`{colors.text-dark}` — #2D2D2D): The structural color. Every border, every body text run on light surfaces, every shadow, every SVG stroke. Slightly warmer than pure black — reads charcoal, not jet.
- **Text Muted** (`{colors.text-muted}` — #6B6B6B): The de-emphasized text color. Subtitles, descriptions under headlines, list-dash bullets, role labels.
- **White** (`{colors.white}` — #FFFFFF): The default card fill — every card, every avatar, every chart-container interior. Cards on a cream canvas still get white interiors so the card edge reads cleanly.

### Defaults
- **Default slide background**: `{colors.cream}`. Use a saturated pastel surface (turquoise, soft-pink, mint, butter, lavender, peach, sky) when the slide wants a tonal personality; default to cream when it doesn't.
- **Default card background**: `{colors.white}` — on any surface, including pastel surfaces. White-on-pastel is the standard card treatment.
- **Default headline color**: `{colors.text-dark}` — always.
- **Default body color**: `{colors.text-dark}` for primary body, `{colors.text-muted}` for descriptions, role labels, captions, and sublines.
- **Default border color**: `{colors.text-dark}` — always. There are no colored borders anywhere.
- **Default shadow color**: `{colors.text-dark}` — always. Shadows are never pastel.
- **Default badge fill**: `{colors.butter}`.
- **Default marker / accent fill** when an element needs a single "attention" color: `{colors.coral}`. When a sequence of markers is needed, rotate through the full pastel set (coral → mint → sky → lavender → butter) for sequence steps and dots.
- **Default header-strip color** on a framed-header component: any pastel surface — pick whichever harmonizes with the slide's surface color.

The pastels are interchangeable at the surface level — they do not carry fixed semantic meaning (mint is not "success", coral is not "warning"). Pick the surface that best serves the slide's emotional register. The one rule: coral is reserved for small high-contrast accents, not surfaces.

## Typography

### Font Family
The system loads exactly two web fonts from Google Fonts: **Fredoka One** (a single-weight rounded display face) and **Quicksand** (a humanist sans available at 400/500/600/700). The pairing is the entire typographic identity.

Fredoka One is a chunky single-weight display face — it has no italic, no lighter variants, no condensed cuts. The display weight reads as 400 by spec but visually behaves as a heavy weight because the letterforms are so rounded and full. Every headline, every title, every step number, every quote in the system runs in Fredoka One. There is no exception — using Quicksand for a heading or Fredoka One for a body paragraph breaks the system instantly.

Quicksand carries everything else: paragraphs, list items, role labels, captions, day-card body lists, legend text. Quicksand 500 is the body default; 600 is the "slightly stronger" variant used for emphasized body (welcome-list items, info-card descriptions, legend labels); 700 is used sparingly for quote-author attribution.

### Display, Body, and Marker Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | clamp(3.2rem, 7vw, 6.5rem) | Fredoka One | 400 | Cover / opening hero headline |
| `{typography.headline}` | clamp(2.5rem, 5vw, 4.5rem) | Fredoka One | 400 | Primary slide headline |
| `{typography.title}` | clamp(1.8rem, 3.5vw, 3rem) | Fredoka One | 400 | Section title or framed-header title |
| `{typography.quote}` | clamp(1.3rem, 2.5vw, 2rem) | Fredoka One | 400 | Pull-quote body text |
| `{typography.subtitle}` | clamp(1.3rem, 2vw, 1.8rem) | Fredoka One | 400 | Sub-headline, in-card title |
| `{typography.label-display}` | clamp(1rem, 1.5vw, 1.3rem) | Fredoka One | 400 | Small Fredoka labels — day-card header, step title |
| `{typography.body-strong}` | clamp(0.95rem, 1.4vw, 1.15rem) | Quicksand | 600 | Emphasized body — welcome lists, info-card descriptions |
| `{typography.body}` | clamp(0.95rem, 1.3vw, 1.15rem) | Quicksand | 500 | Standard paragraph body |
| `{typography.meta}` | clamp(0.8rem, 1.1vw, 0.95rem) | Quicksand | 600 | Compact secondary text — day-card lists, step descriptions, legend rows |
| `{typography.badge}` | 0.85rem | Fredoka One | 400 | Text inside a pill badge |

### Defaults
- **Default size for a primary slide headline**: `{typography.headline}` (clamp 2.5–4.5rem).
- **Default size for a cover-level title moment**: `{typography.display}` (clamp 3.2–6.5rem).
- **Default size for a paragraph**: `{typography.body}` (clamp 0.95–1.15rem) in Quicksand 500.
- **Default size for emphasized list items**: `{typography.body-strong}` (Quicksand 600).
- **Default size for a description under a card title or a meta caption**: `{typography.meta}` in `{colors.text-muted}`.
- **Default size for a section / framed-header title**: `{typography.title}`.
- **Default family for any text larger than ~1.3rem**: Fredoka One. Default family for any text smaller than that: Quicksand. The size threshold roughly tracks the Fredoka / Quicksand role boundary.

When unsure, reach for `{typography.headline}` for the slide's main text moment, not `{typography.subtitle}` or `{typography.title}` (which are intra-content titles, not the primary slide voice).

### Signature Treatments
These are **non-optional whenever the corresponding element type is used**:

- **Every Fredoka One headline placed on a saturated pastel surface carries a 3px charcoal text-shadow** (`{shadows.text-headline}` on bold surfaces like turquoise / mint, `{shadows.text-headline-soft}` on softer surfaces like pink / lavender). Headlines on cream sit flat without the shadow. The text-shadow is what makes the headline read as "outlined" in the same vocabulary as the rest of the system. Skipping it on a colored surface reads as broken.
- **Headlines placed on saturated surfaces switch text color to `{colors.white}`**; headlines on cream and on light pastel cards stay `{colors.text-dark}`. The pairing is white-on-saturated, dark-on-cream-or-card.
- **Every body list item uses an outlined colored disc as its bullet, not a glyph.** Default fill is `{colors.butter}`. The bullet is rendered as a `::before` 20px circle with 2px charcoal border, positioned 4px from the top of the first line.
- **Every quote uses the Fredoka quote-mark treatment**: an oversized `"` glyph in `{colors.soft-pink}` sits above the quoted text. Quotes never appear without a quote-mark anchor.
- **Quicksand body text never goes uppercase.** No display-style ALL-CAPS treatments on body. Fredoka has its own personality and doesn't need shouting.

### Typography Principles
The size ladder is the rhythm. Fredoka One does not get italicized, underlined, or rendered in alternate weights — Fredoka has one weight, full stop. Quicksand stays inside the 500 / 600 / 700 ladder; do not introduce 400 or 800 even if available. Letter-spacing on Fredoka stays at the spec default of `0.02em`. Letter-spacing on Quicksand stays at 0.

Mixing Quicksand into a headline (e.g. for an italicized phrase) is not supported in this system — the headline runs in one face. If a headline needs a different emotional register, the size and color do the work, not the font swap.

## Layout

### Canvas System
The system targets full viewport — every `.slide` is `100vw × 100vh` with `padding: 40px 60px` (default slide padding). Slides are stacked vertically inside a `.slides-container` that uses CSS scroll-snap (`scroll-snap-type: y mandatory`) to lock each slide to the viewport. Navigation is handled via fixed right-edge nav dots, a fixed bottom-center counter pill, keyboard arrows / spacebar, and intersection-observer-driven dot state.

### Padding and Gap Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-slide}` | 40px 60px | Outer slide padding |
| `{spacing.pad-card-lg}` | 48px 56px | Large featured cards (quote box, welcome body) |
| `{spacing.pad-card-md}` | 32px 40px | Standard cards (chart container, framed-header body) |
| `{spacing.pad-card-sm}` | 16px 24px | Compact cards (timeline card, day-card body) |
| `{spacing.gap-grid-lg}` | 28px | Major grid gaps (team grid, info-card grid) |
| `{spacing.gap-grid-md}` | 24px | Standard grid gaps |
| `{spacing.gap-grid-sm}` | 14px | Tight grid gaps (weekly day-card grid) |

### Border-Radius Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.radius}` | 20px | Standard cards, day-cards, timeline cards |
| `{spacing.radius-lg}` | 28px | Featured cards (chart container, welcome frame, quote box) |
| `{spacing.radius-pill}` | 50px | Badges, slide counter |
| `{spacing.radius-round}` | 50% | All circles (avatars, bullet dots, marker dots, step circles, icons) |

Every visible region carries some radius. There are zero square corners in this system besides the SVG decorations themselves.

### Content Centering
Slide content is flex-centered both vertically and horizontally inside the slide padding. The main content container has a max-width that varies by composition (typically 700–1100px) and never spans the full slide width — there is always margin between content and slide edge for the decorations to occupy.

## Depth and Elevation

### Hard Offset Shadow (Only Technique)
Every elevated element uses one of two shadow values:
- **`{shadows.default}`** = `6px 6px 0 {colors.text-dark}` — standard offset for cards, frames, chart containers, badges, the slide counter.
- **`{shadows.small}`** = `4px 4px 0 {colors.text-dark}` — lighter offset for smaller elevated elements (day-cards, timeline-cards, info-cards, step circles, avatars).

The shadow is **solid charcoal, zero blur, fixed bottom-right offset**. There is no rgba shadow, no blur, no soft elevation. An element either casts a hard offset shadow in `{colors.text-dark}` or it casts no shadow.

### Text Shadow for Display Type
A separate text-shadow treatment lives only on display headlines placed over saturated pastel surfaces:
- **`{shadows.text-headline}`** = `3px 3px 0 {colors.text-dark}` for bold pastel surfaces (turquoise, butter, peach).
- **`{shadows.text-headline-soft}`** = `3px 3px 0 rgba(0,0,0,0.2)` for softer pastel surfaces (soft-pink, mint) where the full charcoal would feel too heavy.

Headlines on cream get no text-shadow.

### Decorative Z-Index Layer
The atmospheric SVG decorations live on `z-index: 1` with `pointer-events: none`. Content sits on `z-index: 2`. This means decorations may visually overlap content rectangles, but never block interaction. Decorations frequently crop past the slide edge with negative offsets like `top:-30px / left:-30px`, which gives the layout a "stickers reaching off the page" feel.

## Shapes and Treatment

### Border Weight and Style
- **3px solid `{colors.text-dark}`** — the universal structural border. Cards, framed headers, badges, marker circles, step circles, avatars, chart containers, the slide counter.
- **2px solid `{colors.text-dark}`** — the lighter border used only on small elements at the bullet / nav-dot / legend-swatch / day-header divider scale.
- **~2.1px solid `#232323` or `#000`** — the SVG stroke weight used inside the daisy / star / cloud / sun decorations. This matches the perceived weight of the 3px structural border at the SVG's natural scale.

Borders are never colored. Borders are never dashed. The only line style in the system is solid charcoal.

### Decorative Element Types

**Daisy** — A six-petal white-petal / yellow-center daisy in two paired stem positions. The system's signature ornament. Place at corners (typically `top-left`, `top-right`, `bottom-left`, `bottom-right`), often cropped past the edge at `top:-30px` or `right:-20px`. Two daisies plus 2–3 stars is the most common decoration cluster.

**Star** — A puffy five-pointed sticker star in a solid pastel fill (pink, yellow, mint, lavender, white) with charcoal outline. Used as scattered accents between the larger daisy / sun / cloud ornaments. Vary fill color across instances on the same slide; do not use all-white or all-yellow stars.

**Sun** — A smiling round sun in butter yellow with rays. Used as a single feature ornament, typically at top-left or bottom-right.

**Cloud** — A puffy white-and-blue cloud with optional smaller cloud variant. Used in sequences (two clouds at opposing corners) or as a single ornament on slides that want a sky atmosphere.

**Rainbow** — An arched four-band rainbow (coral / yellow / mint / sky) with the standard charcoal outline. Used as a single feature ornament, typically at top-right or bottom-right.

**Framed Header** (`{components.framed-header}`) — A two-part stacked card: a colored header strip (any pastel) sits flush above a white body. The pair shares one rounded outer corner radius and one continuous 3px border, and the whole unit casts a single offset shadow. Used as a featured info container.

**Badge Pill** (`{components.badge-pill}`) — A short rounded-pill chip with 3px border and butter (default) fill. Used as a section tag or small label. Pill text is Fredoka One at 0.85rem.

**Marker Circle Set** — Three sizes (`{components.bullet-dot}` 20px, `{components.circle-dot}` 48px, `{components.circle-icon}` 44px, `{components.step-circle-lg}` 90px). All are outlined circles in a pastel fill, all carry charcoal border. Numerals or single letters inside larger marker circles are always Fredoka One in white text (except on butter-yellow, where text returns to dark).

**Avatar Circle** — A 100px outlined white circle holding a small character SVG portrait or initial. Carries `{shadows.small}`.

**Quote Mark** — An oversized `"` glyph in Fredoka One at ~4rem in `{colors.soft-pink}`, placed above the quote body inside a quote card.

**Process Arrow** — A simple `→` glyph in Fredoka One at ~2rem in `{colors.text-dark}`, sat between process steps.

**Legend Swatch** — A 18px square with 4px rounded corners and a 2px border. Holds a fill color matched to a corresponding data series.

## Do's and Don'ts

### Do
- Pair Fredoka One with Quicksand strictly by role — Fredoka for every headline and display moment, Quicksand for every paragraph and meta line. The two-face contrast is the system's voice.
- Set the default canvas to `{colors.cream}`. Reach for a saturated pastel surface (turquoise, soft-pink, mint, etc.) when the slide wants a tonal mood, but cream is the safe default for content-heavy moments.
- Apply a 3px solid charcoal outline plus a `{shadows.default}` or `{shadows.small}` hard offset shadow to every elevated container. The outline + offset shadow combo is the system's signature elevation.
- Apply the `{shadows.text-headline}` text-shadow to every Fredoka One headline placed over a saturated pastel surface. Skip it only on cream.
- Cluster 3–7 hand-drawn SVG decorations (daisies, stars, suns, clouds, rainbows) around every slide's edges, often cropping past the boundary. Empty corners look broken in this system.
- Use outlined colored discs as list bullets — never bare hyphens or asterisks. The `{components.bullet-dot}` with `{colors.butter}` fill is the default.
- Reserve `{colors.coral}` for small high-attention markers (step numbers, timeline dots, day-headers). Coral as a full slide surface breaks the warmth-balance and reads aggressive.
- Center the main content container with a max-width well inside the slide padding. The decorations need room at the edges; full-bleed content blocks the ornament layer.
- Rotate marker / dot colors through the pastel set (coral → mint → sky → lavender → butter) when a sequence needs distinct steps. Do not use a single color for all steps.

### Don't
- Don't use any font other than Fredoka One and Quicksand. The system loads only those two faces from Google Fonts. Adding a third face breaks the storybook voice.
- Don't put Quicksand into a headline or Fredoka One into a paragraph. The role / face mapping is strict.
- Don't use square corners. Every card, every badge, every marker has some radius — the smallest radius in the system is 4px (legend swatch), and most are 20px or larger.
- Don't use blurred or rgba shadows. The system uses solid charcoal offsets only. `0 4px 12px rgba(0,0,0,0.1)` does not exist here.
- Don't use colored borders. All borders are charcoal `{colors.text-dark}`.
- Don't use coral as a full slide surface. Coral is the system's high-attention spot color; it loses power if it covers a region.
- Don't render Fredoka One in italic, underline, or stretched weights. Fredoka has one weight — that's the design.
- Don't omit the text-shadow on Fredoka headlines that sit on a saturated pastel surface. The shadow is what unifies headline weight with the outlined-shape vocabulary.
- Don't leave a slide's corners empty of decorations. The ornament layer is part of the composition, not optional dressing.
- Don't pile two cards on top of each other without separation. The system reads as one main content region per slide, surrounded by ornament — not as a stack of competing panels.

## Responsive Behavior

The system targets a viewport-fluid layout (everything sized in `clamp()` or `vw`), but is tuned for desktop / projector at roughly 1280–1920 width. Two responsive breakpoints adapt the grids:

- **`@media (max-width: 768px)`**: Slide padding tightens to `24px 20px`. Multi-column grids collapse: the 5-column weekly grid drops to 3, the 4-column team grid drops to 2, the 2-column info-card grid drops to 1, the horizontal process flow stacks vertically with rotated arrows, and the horizontal donut layout stacks. The right-edge nav dots hide. Decoration opacity drops to 0.6 so they don't overwhelm the cramped layout.
- **`@media (max-width: 480px)`**: The 3-column weekly grid drops further to 2. Decoration opacity drops to 0.4.

### Presenter Behavior
- Scroll-snap-y mandatory locks each slide to the viewport on vertical scroll.
- Keyboard: ArrowDown / ArrowRight / Space / PageDown advance; ArrowUp / ArrowLeft / PageUp reverse; Home jumps to first; End jumps to last.
- Right-edge nav dots show current slide and accept click-to-jump.
- A bottom-center counter pill displays `N / total` and updates via IntersectionObserver.

### Print / Export
There is no `@media print` rule defined. Print export will inherit the scroll-container layout, which may not paginate cleanly. Treat this as a screen-first system; a separate print stylesheet would be needed for PDF export.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin font | Recommended Chinese pairing | Source |
|---|---|---|---|
| Display / Headline (Fredoka One 400) | Fredoka One | 站酷小薇体 ZCOOL XiaoWei | Google Fonts |
| Body (Quicksand 500–600) | Quicksand | 悠哉字体 Yozai | cn-fontsource CDN |

### Mixed-Content Strategy

Use **Strategy A — single-font-stack with fallback**: declare ZCOOL XiaoWei *after* Fredoka One and Yozai *after* Quicksand in the same `font-family` stack so Latin glyphs render in the Latin face and CJK glyphs fall through to the Chinese face automatically. One CSS rule per role, no manual class switching.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Quicksand:wght@400..700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/cn-fontsource-yozai-regular/font.css" rel="stylesheet">
```

```css
:root {
  --font-display: "Fredoka One", "ZCOOL XiaoWei", cursive;
  --font-body: "Quicksand", "Yozai", sans-serif;
}
```

### Universal CJK Adjustments

- **Line-height**: bump CJK body line-height to ~1.75 (from 1.6) — Hanzi need more vertical breathing than Latin lowercase.
- **Letter-spacing**: zero out `letter-spacing` on Hanzi runs (the 0.02em Fredoka tracking jams Hanzi strokes together). Keep Latin tracking only on Latin spans.
- **Text-transform**: drop `text-transform: uppercase` on any badge/label when content is Hanzi — Chinese has no case; forcing uppercase does nothing for Hanzi but breaks the rendering of any mixed Latin acronyms inside.
- **Punctuation**: use Chinese full-width punctuation (，。：；「」) for Chinese sentences, half-width (`,.:;""`) for Latin. Never mix half-width punctuation into a Chinese sentence.
- **No period on headlines**: Chinese headline convention omits the terminal 。 — strip it from display strings.
- **Pangu spacing**: insert a thin space (or a regular space) between adjacent Hanzi and Latin/digit runs (e.g. `2026 年`, `AI 产品`). Improves readability of mixed runs.
- **One font per sentence**: don't switch CJK families mid-sentence. Pick ZCOOL XiaoWei *or* Yozai for a given text run based on its role, never both inside one phrase.

### Aesthetic Notes

ZCOOL XiaoWei's rounded soft display register is the closest Hanzi analogue to Fredoka One's chubby storybook voice — it carries the same "friendly children's-book" mood at headline scale without becoming saccharine. Yozai's open counters and modest stroke contrast match Quicksand's humanist warmth, so body paragraphs and meta lines feel continuous with the pastel-garden aesthetic. The 3px charcoal text-shadow on headlines that sit on saturated pastel surfaces works identically on ZCOOL XiaoWei — apply `{shadows.text-headline}` to Chinese headlines on turquoise / butter / peach surfaces, and `{shadows.text-headline-soft}` on soft-pink / mint, exactly as the Latin rule prescribes. The colored bullet-dots, hand-drawn SVG decorations (daisies, stars, suns, clouds, rainbows), framed-header cap-and-body pattern, and pastel marker rotation are all content-agnostic. The single-weight constraint of Fredoka One maps cleanly to ZCOOL XiaoWei's single-weight constraint — neither face supports italic, underline, or weight axis variation, which preserves the system's "one weight, one face per role" discipline.

### Known CJK Gap

ZCOOL XiaoWei is a single-weight display face with limited glyph coverage compared to Noto family — exotic or technical Hanzi (rare surnames, classical characters, simplified-only variants outside GB2312) may fall back to system font. For Traditional Chinese decks, swap Yozai for `LXGW WenKai TC` (Google Fonts) which has fuller TC coverage and a similar friendly humanist register. ZCOOL XiaoWei reads slightly more literary-formal than Fredoka One's chubby chunky personality — Chinese decks built with Daisy Days will feel ~20% more "calm pastel" and ~20% less "sticker-sheet kawaii" than the Latin original. The hand-drawn SVG ornaments (daisy, star, sun, cloud, rainbow) carry the storybook mood that the typography slightly loses, so on Chinese decks consider clustering 5–7 ornaments per slide (the upper end of the 3–7 range) to recover the playful weight.

## Iteration Guide

1. Any new container is rounded (20px / 28px / pill / circle), bordered in 3px charcoal, and shadowed with `{shadows.default}` or `{shadows.small}`. Never ship a flat rectangle with square corners.
2. Any new headline is Fredoka One. If it sits on a saturated pastel surface, it gets a 3px charcoal text-shadow and switches color to `{colors.white}`. If it sits on cream or on a white card, it stays `{colors.text-dark}` and skips the shadow.
3. Any new paragraph is Quicksand 500 by default; Quicksand 600 when the paragraph needs emphasis.
4. Any new bullet is an outlined colored disc (`{components.bullet-dot}`), not a glyph. The default fill is butter, but circle bullets can rotate through the pastel set.
5. Any new sequence of markers (steps, timeline nodes, day labels) rotates through the pastel set (`coral → mint → sky → lavender → butter`) rather than reusing one color.
6. Any new slide needs 3–7 SVG decorations clustered at corners and edges. Draw from the established ornament types (daisy, star, sun, cloud, rainbow) — do not introduce a new ornament style (e.g. line-art arrows, photo cutouts).
7. Any new accent surface picks one of the eight pastels. Do not introduce a ninth color.
8. Coral stays a small-marker color only. Do not make a coral surface, a coral card, or a coral headline.
9. Any list bullet sits 4px from the top of the first text line, vertically aligned with x-height, not the line baseline.
10. When a new component needs a "two-part frame" feel, reach for the `{components.framed-header}` pattern (colored cap + white body) rather than nesting two separate cards.

## Known Gaps

- The two Google Fonts (Fredoka One, Quicksand) are loaded via `<link>` from Google Fonts CDN. Offline rendering will fall back to `cursive` and `sans-serif` system defaults, which collapses the entire typographic identity. Self-hosting the fonts is required for offline / print reliability.
- The hand-drawn SVG decorations (daisy, star, sun, cloud, rainbow) are inline SVG with their stroke colors hardcoded to `#232323` or `#2D2D2D`. There is no programmatic way to recolor them to match a new palette — extending the decoration library requires authoring new SVG sources.
- The system uses scroll-snap navigation (not absolute-positioned slides). It does not have a dedicated print stylesheet; PDF export of the deck will not paginate one-slide-per-page out of the box.
- The nav-dots / slide-counter / keyboard / observer JavaScript is embedded inline and hardcodes the slide count via the `<div class="nav-dot">` array. Adding a new slide requires manually adding a corresponding nav-dot div.
- The pastel surfaces (turquoise, mint, peach) have varying perceived brightness; the text-shadow treatment for headlines must be tuned per-surface (the system already does this — full charcoal for bold surfaces, 20%-opacity charcoal for soft surfaces). New surface colors will require a similar tuning decision.
- The `--text-muted` color (#6B6B6B) is used for subtitles and captions but has limited contrast against pastel surfaces. Reserve muted text for use on cream or on white cards, not on pastel surfaces directly.
- The decoration SVGs include a placeholder comment string `SVG created with Arrow, by QuiverAI (https://quiver.ai)` — this is the original authoring tool credit and can be stripped without affecting rendering.
