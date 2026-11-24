---
version: alpha
name: BlockFrame
description: "A maximalist neobrutalist presentation system built on 4px solid black borders, 8px hard offset shadows, and a high-key candy palette of five saturated pastels plus cream and off-white. Display type runs Inter at weight 800-900 in tight uppercase; secondary chrome uses Space Grotesk as a quasi-monospace label face. Tilted decorative shapes (rotated stars, rectangles, badges) puncture the borders and break the grid intentionally. Pastels are paired loudly: pink + blue + green + yellow + cream cycle through every region with deliberate juxtaposition. The aesthetic borrows from zine layout, 1990s-revival sticker books, and contemporary toy packaging — bold, joyful, slightly chaotic, never timid."

colors:
  black: "#000000"
  white: "#FFFFFF"
  offwhite: "#FFFDF5"
  pink: "#FE90E8"
  blue: "#C0F7FE"
  green: "#99E885"
  yellow: "#F7CB46"
  cream: "#FFDC8B"

borders:
  primary: "4px solid {colors.black}"
  thin: "3px solid {colors.black}"

shadows:
  default: "8px 8px 0px {colors.black}"
  small: "4px 4px 0px {colors.black}"
  hover: "6px 6px 0px {colors.black}"
  close-yellow: "12px 12px 0px {colors.yellow}"
  close-white: "6px 6px 0px {colors.white}"

typography:
  heading-xl:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 900
    fontSize: "clamp(48px, 6vw, 96px)"
    lineHeight: 0.95
    letterSpacing: -0.03em
    textTransform: uppercase
  heading-lg:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 800
    fontSize: "clamp(32px, 4vw, 64px)"
    lineHeight: 1
    letterSpacing: -0.02em
    textTransform: uppercase
  heading-md:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 700
    fontSize: "clamp(24px, 2.5vw, 40px)"
    lineHeight: 1.1
    letterSpacing: -0.01em
  close-title:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 900
    fontSize: "clamp(40px, 5vw, 80px)"
    lineHeight: 0.95
    letterSpacing: -0.03em
    textTransform: uppercase
  quote-text:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 900
    fontSize: "clamp(28px, 3.5vw, 52px)"
    lineHeight: 1.15
    letterSpacing: -0.02em
    textTransform: uppercase
  stat-number:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 900
    fontSize: "clamp(36px, 4vw, 64px)"
    lineHeight: 1
  card-title:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 700
    fontSize: 22px
    lineHeight: 1.2
    textTransform: uppercase
  step-num:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 900
    fontSize: 48px
    lineHeight: 1
  body:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: "clamp(16px, 1.2vw, 20px)"
    lineHeight: 1.6
  body-card:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: 15px
    lineHeight: 1.6
  list-body:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: 16px
    lineHeight: 1.5
  label:
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 600
    fontSize: 13px
    lineHeight: 1
    letterSpacing: 0.08em
    textTransform: uppercase
  mono-tag:
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 600
    fontSize: 14px
    lineHeight: 1
    letterSpacing: 0.05em
    textTransform: uppercase
  mono-meta:
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 500
    fontSize: 15px
    letterSpacing: 0.02em
  subtitle-mono:
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 500
    fontSize: 18px
    lineHeight: 1.5
  counter:
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 700
    fontSize: 14px
    lineHeight: 1
    letterSpacing: 0.1em
    textTransform: uppercase
  legend-item:
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 600
    fontSize: 13px

spacing:
  slide-pad: 60px
  card-pad-lg: 60px
  card-pad-md: 36px
  card-pad-sm: 28px
  card-pad-xs: 22px
  gap-lg: 48px
  gap-md: 32px
  gap-sm: 24px
  gap-xs: 16px
  pad-bottom-clearance: 110px

canvas:
  width: 100vw
  height: 100vh
  default-background: "{colors.offwhite}"

components:
  card-elevated:
    border: "4px solid {colors.black}"
    background: "{colors.white}"
    boxShadow: "{shadows.default}"
    description: "Primary elevated card. 4px ink border + 8px ink offset shadow. Background is white by default; on darker surfaces background may shift to offwhite or to a colored fill."
  card-flat:
    border: "4px solid {colors.black}"
    background: "{colors.white}"
    description: "Bordered card without elevation shadow. Used for secondary content cells inside multi-card grids where the shadow would compound."
  card-small:
    border: "3px solid {colors.black}"
    background: "{colors.white}"
    boxShadow: "{shadows.small}"
    description: "Compact card with thinner border + smaller offset shadow. Used for intro-cards, stat-cards, team-cards, and timeline-steps."
  label-pill:
    border: "3px solid {colors.black}"
    padding: "6px 16px"
    fontFamily: "'Space Grotesk', monospace"
    fontSize: 13px
    fontWeight: 600
    letterSpacing: 0.08em
    textTransform: uppercase
    background: "{colors.white}"
    boxShadow: "{shadows.small}"
    description: "Universal section eyebrow. White base by default; pink, blue, green, yellow, cream variants swap background. Always sits on a 3px black border with a 4px hard offset shadow."
  button-primary:
    border: "3px solid {colors.black}"
    background: "{colors.yellow}"
    color: "{colors.black}"
    padding: "14px 32px"
    fontFamily: "'Inter', sans-serif"
    fontWeight: 700
    fontSize: 16px
    boxShadow: "{shadows.small}"
    description: "Primary CTA. Yellow fill with black text, 3px black border, 4px offset shadow. Hover lifts the button -2/-2 and grows shadow to 6px."
  corner-bracket:
    width: 24px
    height: 24px
    border: "3px solid {colors.black}"
    description: "Two L-shaped brackets at opposite corners of a card or frame (tl + br + tr + bl pattern available). Sits inside the card edge as a decorative frame-within-frame."
  icon-square:
    width: 64px
    height: 64px
    border: "3px solid {colors.black}"
    description: "Solid pastel square (pink/blue/green) holding a single uppercase letter glyph at weight 700 / 28px. Used as feature-card icons."
  feature-deco:
    width: 48px
    height: 48px
    border: "3px solid {colors.black}"
    background: "{colors.yellow}"
    position: "absolute top -12px right 24px"
    description: "Yellow square notch that protrudes from the top edge of a feature card, breaking the card's top border line."
  stat-deco-dot:
    width: 12px
    height: 12px
    borderRadius: 50%
    border: "2px solid {colors.black}"
    description: "Small black-bordered colored circle pinned to the top-right of a stat card. The only round shape used on cards. Fill cycles through the pastel palette."
  avatar-square:
    width: 72px
    height: 72px
    border: "3px solid {colors.black}"
    background: "{colors.pink}"
    fontFamily: "'Inter', sans-serif"
    fontWeight: 900
    fontSize: 28px
    textTransform: uppercase
    description: "Square avatar with two-letter initials, used in team grids. Fill cycles through the pastel palette."
  list-number:
    width: 36px
    height: 36px
    border: "3px solid {colors.black}"
    background: "{colors.yellow}"
    fontFamily: "'Space Grotesk', monospace"
    fontWeight: 700
    fontSize: 14px
    description: "Square numerical bullet pinned to the left of each list item. Black border, yellow fill, mono numeral."
  star-burst:
    clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
    border: "3px solid"
    background: "{colors.pink}"
    description: "10-point star clipped via CSS clip-path with a 3px border. Decorative attention-grabber pinned to corners of close-frames and feature cards."
  stripe-block:
    background: "repeating-linear-gradient(45deg, {colors.black}, {colors.black} 4px, {colors.green} 4px, {colors.green} 12px)"
    border: "3px solid {colors.black}"
    description: "Black-and-color diagonal stripe panel used as decorative attention block on poster-class surfaces."
  bg-dot-grid:
    backgroundImage: "radial-gradient(circle, {colors.black} 1.2px, transparent 1.2px)"
    backgroundSize: "24px 24px"
    description: "Faint dot-grid background pattern used as an overlay on light surfaces or as decoration in corners of cards."
  tilt-card:
    transform: "rotate(±2deg) or rotate(±8deg)"
    description: "Card with intentional tilt. Stat cards alternate -2deg / +2deg; decorative rectangles tilt up to ±12deg. The tilt is the system's playful structural signature."
  nav-btn:
    width: 48px
    height: 48px
    border: "3px solid {colors.black}"
    background: "{colors.white}"
    boxShadow: "{shadows.small}"
    description: "Square nav arrow button. Hover translates -2/-2 and grows shadow; active translates 2/2 and shrinks shadow."
  slide-counter:
    border: "3px solid {colors.black}"
    background: "{colors.white}"
    padding: "10px 18px"
    boxShadow: "{shadows.small}"
    description: "Persistent slide counter pill at bottom-left. Space Grotesk uppercase NN / NN format."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

BlockFrame is a **maximalist neobrutalist presentation system** built on five structural laws: every region has a 4px black border, every elevated element has an 8px hard offset shadow, every corner is square, every accent color is a saturated pastel, and every layout is allowed to be a little bit crooked. The system's joy comes from the deliberate collision of these laws — bordered cards meet bordered cards, shadows stack against shadows, tilted decorations puncture the grid intentionally.

The type system pivots on **Inter** (weights 400-900) for display, body, and stats — set at weight 800-900 in tight uppercase with negative letter-spacing for headlines, weight 500 sentence case for body, and weight 700 uppercase for card titles. **Space Grotesk** (weights 400-700) is the secondary face, used as a quasi-monospace label voice for eyebrows, slide counters, stat labels, mono tags, and any chrome that should read as "system" rather than "editorial". The face combination is deliberately ordinary — both are widely-available open sans-serifs — but the treatment (heavy uppercase Inter + wide-tracked Space Grotesk) gives them a distinct neobrutalist register.

The palette is built around **five saturated pastels** (pink `#FE90E8`, blue `#C0F7FE`, green `#99E885`, yellow `#F7CB46`, cream `#FFDC8B`) plus **pure black** (`#000000`) for borders and text, **white** (`#FFFFFF`) for clean card fills, and **off-white** (`#FFFDF5`) for warm canvas. The pastels are not subtle accents — they are full-bleed surface fills. A typical deck cycles every slide through a different colored ground (offwhite cover → blue intro → offwhite content → green chart → pink quote → yellow split → offwhite timeline → blue stats → cream team → black close). This color cycling is the system's primary rhythm.

Depth is **hard offset shadow at 4px and 8px**, always solid black, always zero blur, always positioned bottom-right. Larger elements get 8px, smaller chrome gets 4px. The close-frame uses a single 12px offset in **yellow** (the only colored shadow in the system) as the system's loudest depth statement, and inverted close-frames pair 6px **white** shadows on black surfaces. Borders are 4px solid black on primary cards, 3px solid black on secondary chrome. Border weight and shadow size are tightly coupled — a 4px border carries an 8px shadow; a 3px border carries a 4px shadow.

**Density philosophy: comfortably dense.** This system reads as authoritative when packed and timid when sparse. A typical surface holds: a label-pill eyebrow + a large headline + a multi-card grid (3-6 cards) + at least one decorative element (tilted rectangle, star burst, stripe block, corner bracket, deco dots). Empty space within a region reads as "broken" — every card should be filled, every grid should be complete. The system's joy depends on the visual chatter of many bordered objects existing in the same frame.

**Key Characteristics:**
- 4px solid black borders on primary cards, 3px on secondary chrome — never thinner.
- 8px hard offset shadows on primary cards, 4px on secondary chrome — solid black, zero blur.
- Five-pastel palette (pink, blue, green, yellow, cream) plus black, white, off-white — cycled across surfaces.
- Inter weight 800-900 uppercase with negative tracking is the display voice; Space Grotesk weight 600 uppercase with 0.08em tracking is the label voice.
- Square corners everywhere except a single circular accent dot on stat cards.
- Tilted decorative elements (rotated rectangles, stars, badges) puncture the grid intentionally.
- Label pills (`{components.label-pill}`) carry a 3px border, 4px offset shadow, and a pastel fill variant — the universal section eyebrow.
- Colored fills are bold and saturated; pastels are used as panel grounds, not as light accents.
- Yellow is the default CTA color; black is the default close-surface color.
- Star bursts, stripe blocks, and dot grids are reusable decorative attention units.

## Colors

### Palette

- **Black** (`{colors.black}` — `#000000`): The structural color. Every border, every primary text moment, every shadow. Pure black, no warm bias. The system's contrast anchor.
- **White** (`{colors.white}` — `#FFFFFF`): The default card fill. Used on every primary card and as the background of label-pills and nav-buttons. Pure white, no warmth.
- **Off-white** (`{colors.offwhite}` — `#FFFDF5`): The warm canvas tone. The default body/slide background when no pastel ground is in play. Subtly warmer than pure white so that white cards sitting on top still feel layered.
- **Pink** (`{colors.pink}` — `#FE90E8`): A high-key candy magenta. Used as a full-surface ground, as label-pill fill, as icon-square fill, as star-burst fill, and as one of the pastel chart series. The most saturated of the five pastels.
- **Blue** (`{colors.blue}` — `#C0F7FE`): A pale cyan-ice blue. Used as a full-surface ground (the "intro" and "stats" feel), as label-pill fill, as icon-square fill, and as a chart series.
- **Green** (`{colors.green}` — `#99E885`): A bright spring green. Used as a full-surface ground, as label-pill fill, as icon-square fill, in the stripe-block diagonal pattern, and as a chart series.
- **Yellow** (`{colors.yellow}` — `#F7CB46`): The CTA color. Used as the default button fill, as the close-frame shadow color, as list-number squares, as the feature-deco notch, and as label-pill fill. The brightest, most attention-pulling pastel.
- **Cream** (`{colors.cream}` — `#FFDC8B`): A warm yellow-cream. Softer than yellow, more saturated than offwhite. Used as a full-surface ground (the "team" or "cover" feel), as label-pill fill, and as a tertiary chart accent.

### Defaults

- **Default surface background**: `{colors.offwhite}` for content-heavy surfaces; cycle through `{colors.cream}`, `{colors.blue}`, `{colors.pink}`, `{colors.green}`, `{colors.yellow}` for surfaces that need a stronger ground. The cycle is the rhythm; staying on one ground for many slides flattens the system.
- **Default headline color**: `{colors.black}` on all light/pastel surfaces; `{colors.white}` on the black close-surface.
- **Default body text color**: `{colors.black}` on all light/pastel surfaces; `{colors.white}` or `{colors.cream}` on dark surfaces.
- **Default border color**: `{colors.black}` — always. There are no colored borders anywhere except the 4px white border on the inverted close-frame.
- **Default card fill**: `{colors.white}`. Use a pastel fill only when the card is part of a multi-card row where each card needs distinct color identity (e.g., the timeline-step row where each step is a different pastel).
- **Default button fill**: `{colors.yellow}`. Other pastels work, but yellow is the system's primary "click here" signal.
- **Default label-pill base**: `{colors.white}`; pastel variants (`{colors.pink}`, `{colors.blue}`, `{colors.green}`, `{colors.yellow}`, `{colors.cream}`) signal section type or decorate the eyebrow.
- **Default decorative accent on stat cards**: a 12px circle (`{components.stat-deco-dot}`) in a pastel fill — cycling pink, blue, green, yellow across cards.
- **Default chart palette order**: pink → blue → green (three-series), with yellow and cream available for additional series.

The pastels are interchangeable in role — none of them carry fixed semantic meaning (green isn't "success", red doesn't exist in the palette at all). Pair them by visual juxtaposition: pink + blue + green is the most common trio; cream + yellow is the warm pair; blue + pink is the cool-warm contrast.

## Typography

### Font Family Stack
The system runs two faces.

**Inter** (weights 400-900) is the display, body, headline, and stat face. Used at weight 900 for hero/close titles and quote text, weight 800 for primary headlines, weight 700 for medium headlines and card titles, weight 500 for body. Display weights are always uppercase with negative letter-spacing (-0.02 to -0.03em); body weights are always sentence case with default tracking. The contrast between heavy uppercase display and weight-500 sentence body is the system's typographic rhythm.

**Space Grotesk** (weights 400-700) is the label and chrome face. Used at weight 600 for label-pills (13px, 0.08em tracking, uppercase) and at weight 500 for monospace meta callouts. The face is technically not monospace, but its slightly geometric character + the wide tracking treatment makes it read as the system's "code" voice.

Don't introduce a third face. The Inter + Space Grotesk pairing is the entire typographic palette.

### Typography Scale

| Token | Size (clamp / px) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.heading-xl}` | 48–96px clamp | Inter | 900 | Hero or cover-scale headline |
| `{typography.heading-lg}` | 32–64px clamp | Inter | 800 | Primary section headline |
| `{typography.heading-md}` | 24–40px clamp | Inter | 700 | Region headline, chart title |
| `{typography.close-title}` | 40–80px clamp | Inter | 900 | Closing-statement title (inverted surface) |
| `{typography.quote-text}` | 28–52px clamp | Inter | 900 | Quote body — always uppercase |
| `{typography.stat-number}` | 36–64px clamp | Inter | 900 | Stat numeral |
| `{typography.card-title}` | 22px | Inter | 700 | Feature card title — uppercase |
| `{typography.step-num}` | 48px | Inter | 900 | Numeral inside a timeline-step (opacity 0.6) |
| `{typography.body}` | 16–20px clamp | Inter | 500 | Standard body paragraph |
| `{typography.body-card}` | 15px | Inter | 500 | Body inside compact cards |
| `{typography.list-body}` | 16px | Inter | 500 | Numbered list body |
| `{typography.label}` | 13px | Space Grotesk | 600 | Text inside label-pill |
| `{typography.mono-tag}` | 14px | Space Grotesk | 600 | Mono tag/badge, slide-counter |
| `{typography.mono-meta}` | 15px | Space Grotesk | 500 | Inline mono metadata |
| `{typography.subtitle-mono}` | 18px | Space Grotesk | 500 | Hero subtitle / close subtitle |
| `{typography.counter}` | 14px | Space Grotesk | 700 | Persistent slide counter (NN / NN) |
| `{typography.legend-item}` | 13px | Space Grotesk | 600 | Chart legend label |

### Defaults

- **Default size for a hero or cover title**: `{typography.heading-xl}` (48–96px). Always uppercase, always weight 900, always with -0.03em tracking.
- **Default size for a primary section headline**: `{typography.heading-lg}` (32–64px). Uppercase, weight 800, -0.02em.
- **Default size for a region or chart title**: `{typography.heading-md}` (24–40px). The only Inter heading not in uppercase by default — though uppercase is permitted.
- **Default size for a stat numeral**: `{typography.stat-number}` (36–64px). Weight 900, line-height 1.
- **Default size for body paragraph**: `{typography.body}` (16–20px clamp). Weight 500, sentence case, line-height 1.6.
- **Default size for an eyebrow label**: `{typography.label}` (13px) inside the `{components.label-pill}`.
- **Default weight for any Inter display**: 800 or 900. Inter display at weight 700 reads as "almost there"; only use 700 for `{typography.heading-md}` or card titles.
- **Default weight for any Inter body**: 500. Body at 400 reads as too light, body at 700 reads as oversized.
- **Default tracking for any Space Grotesk label/chrome**: 0.05-0.10em. Wide tracking is the face's "chrome" signal.
- **Default tracking for any Inter display**: -0.01em (heading-md) to -0.03em (heading-xl). Display without negative tracking reads as untreated.

When unsure which heading token to reach for, default to `{typography.heading-lg}` (32–64px) for the slide's primary text moment. `{typography.heading-md}` is for region or chart titles within a slide.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Inter display element (heading-xl, heading-lg, quote-text, close-title) is uppercase.** Sentence-case Inter display at weights 800+ does not exist in this system. The uppercase + heavy-weight + negative-tracking combination is the visual identity.
- **Every Inter display element uses negative letter-spacing** (-0.01 to -0.03em). Display without negative tracking reads as default Inter, which is a fundamentally different aesthetic.
- **Every label-pill carries the 3px border + 4px shadow + uppercase Space Grotesk text** combination. A label without all three properties is not a label-pill — it's a stray text element.
- **Every card-title is uppercase Inter weight 700.** Card titles in sentence case break the brutalist rhythm.
- **Every Space Grotesk label/chrome/counter is uppercase with 0.05-0.1em tracking.** Sentence-case Space Grotesk does not exist in this system except for body-adjacent metadata (mono-meta, mono inline).
- **Every stat numeral is Inter weight 900 with line-height 1.** Stat numerals are display moments, not data chrome.
- **Every Inter body block is sentence case with line-height 1.6 (or 1.5 for compact card body).** Body in uppercase or with tight line-height reads as broken.
- **Step numbers inside timeline-step cards are 48px weight 900 at opacity 0.6.** The reduced opacity is mandatory — full-opacity step numbers overwhelm the step title.

### Typography Principles

The voice contrast is **bold uppercase display ↔ sentence body ↔ wide-tracked label**. Italic is never used. Underline is never used. The only emphasis mechanism is weight contrast within the Inter ladder and the uppercase/sentence-case switch.

Display elements should be allowed to **dominate the canvas**. The system is built for poster-scale typography; reading a heading-xl at small size collapses its character. Lean into the upper bound of every clamp.

## Layout

### Canvas System
The system targets `100vw × 100vh` per slide. Slides are absolutely positioned and toggled via `display: none` / `display: flex` on the `.active` class. Default slide padding is 60px on all sides. Slides that contain bottom-anchored grids (timeline, team grid, chart with stat column) carry an additional `padding-bottom: 110px` to clear the fixed slide-counter and nav-controls chrome.

The default slide flex direction is column with `justify-content: center`. For two-column splits (intro slide, split image+text), flex direction switches to row.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.slide-pad}` | 60px | Default slide padding from edge to content |
| `{spacing.card-pad-lg}` | 60px | Hero-frame and quote-frame internal padding |
| `{spacing.card-pad-md}` | 36px | Feature-card internal padding |
| `{spacing.card-pad-sm}` | 28px | Intro-card internal padding |
| `{spacing.card-pad-xs}` | 22px | Team-card and small-cell padding |
| `{spacing.gap-lg}` | 48px | Gap between major sections (header-to-grid) |
| `{spacing.gap-md}` | 32px | Gap between feature cards |
| `{spacing.gap-sm}` | 24px | Gap between intro cards, stat cards |
| `{spacing.gap-xs}` | 16px | Gap inside list items, intra-card content |
| `{spacing.pad-bottom-clearance}` | 110px | Bottom padding reserve to clear fixed nav chrome |

### Persistent Chrome
Three elements appear on every slide:
- **Slide counter** at bottom-left — 3px black border, white fill, 4px shadow, Space Grotesk 14px weight 700 uppercase, NN / NN format.
- **Nav controls** at bottom-right — two 48px square nav buttons with 3px borders, white fills, 4px shadows.
- The slide-counter and nav-controls are not part of the slide composition — they live outside `.slides-container` and overlap the bottom edge.

### Card-on-Card Structure
The system's primary layout pattern is **cards on grounds on grounds**. A typical slide places a colored-ground surface, on which sits a white card with 4px black border + 8px shadow, which may contain smaller cards or icon-squares. Each level of nesting carries its own border weight: 4px for the outer card, 3px for inner chrome. This nested-bordered structure is what gives the system its dense, packed feel.

### Decorative Disruption
Tilted decorative elements (rotated rectangles, stars, badges, dot grids) are placed absolutely on slide and card surfaces to puncture the grid intentionally. These are not "background decoration" — they are part of the composition. A surface without any decorative element reads as too clean.

## Depth and Elevation

### Hard Offset Shadow Stack
The system uses three primary shadow values:
- **`{shadows.default}`** = `8px 8px 0px {colors.black}` — primary card shadow. Used on hero-frame, feature-card, quote-frame, chart-frame, and any elevated card.
- **`{shadows.small}`** = `4px 4px 0px {colors.black}` — secondary chrome shadow. Used on intro-card, stat-card, team-card, timeline-step, label-pill, button-primary, nav-btn, slide-counter.
- **`{shadows.hover}`** = `6px 6px 0px {colors.black}` — hover state for buttons and nav. Triggered with a -2/-2 transform.

All shadows are solid black, zero blur, fixed offset bottom-right. The shadow + transform pairing on hover creates a "lifting off the page" interaction signature — the element translates -2/-2 while the shadow grows to 6/6, simulating a peel-up.

### Inverted Shadows
On the dark close-surface, shadows invert their color but keep the offset logic:
- **`{shadows.close-yellow}`** = `12px 12px 0px {colors.yellow}` — the loudest depth statement in the system. Used on close-frame to make the inverted surface read as still "elevated" despite its dark ground.
- **`{shadows.close-white}`** = `6px 6px 0px {colors.white}` — used on the close-btn to maintain elevation on the black ground.

These colored shadows are the only exceptions to the "shadows are always black" rule, and they appear only on the dark surface.

### Border-Based Depth
Most of the system's apparent layering comes from the 4px or 3px ink borders, not from shadow. A card with a border but no shadow still reads as "an object on a surface" — the shadow is what makes it read as "lifted". Use shadow for elevated cards; use border-only for secondary cards inside a multi-card grid where stacked shadows would compound into noise.

### Tilted Elements as Depth
The system's playful depth signature is **tilt**. Stat cards alternate -2deg / +2deg rotation. Decorative pink rectangles tilt up to ±12deg. The yellow button tab on the hero frame tilts -3deg. These tilts break the grid alignment intentionally and create perceived dimensionality without using actual perspective or shadow.

## Shapes and Treatment

### Border Radius
- **0px** on everything structural — cards, label-pills, buttons, icon-squares, list-numbers, avatars, badges. Square corners are non-negotiable.
- **50% (circle)** used only for the stat-deco dot (12×12 circular accent pinned to stat cards). This is the only round shape in the system.

The square-corner discipline is the system's structural identity. Adding rounded corners to any card or chip immediately reads as a different aesthetic.

### Border Weights
- **4px solid `{colors.black}`** — used on primary cards (hero-frame, feature-card, quote-frame, chart-frame, team-card border, timeline-step border, stat-card border) and the close-frame inverse (4px solid white on black ground).
- **3px solid `{colors.black}`** — used on secondary chrome (label-pill, button, intro-card, icon-square, list-number, avatar, corner-bracket, nav-btn, slide-counter, stripe-block, star-burst). The 3px weight signals "secondary structural" vs. the 4px "primary structural".
- **2px solid `{colors.black}`** — used only on legend swatches (16×16 chart swatches) and stat-deco dots. The thinnest border weight, reserved for atomic chrome.
- **4px solid `{colors.white}`** — used only on the inverted close-frame, the visual-box, and its ::after offset frame on the dark split-visual surface.

The border weight ladder (2 / 3 / 4) is fixed. No 1px borders, no 5px+ borders.

### Decorative Element Types

**Label-pill** — Square bordered pill (3px black border, 4px shadow), pastel or white fill, Space Grotesk 13px weight 600 uppercase text with 0.08em tracking. The universal section eyebrow.

**Corner-bracket** — Two L-shaped brackets (or four for full enclosure) at the corners of a card, 3px black border. Creates a frame-within-frame decorative motif.

**Star-burst** — 10-point star clipped via CSS clip-path with a 3px border, pastel fill. Decorative attention-grabber pinned to corners of close-frames and feature cards.

**Stripe-block** — Diagonal 4px-on, 8px-off stripe pattern in black + a pastel color, framed with a 3px black border. Decorative attention block used on poster-class surfaces.

**Dot-grid** — 1.2px radial-gradient dot pattern at 24×24 spacing. Used as a faint decorative overlay in corners of slides, at 30-40% opacity.

**Feature-deco notch** — 48×48 yellow square with 3px black border, positioned absolutely to protrude from the top edge of a feature card. The notch breaks the card's top border, suggesting it's been "stapled on".

**Icon-square** — 64×64 pastel square with 3px black border holding a single uppercase letter glyph at Inter weight 700 / 28px. Used as feature-card icons.

**Stat-deco dot** — 12×12 circle with 2px black border, pastel fill, pinned to the top-right of a stat card. The system's only round shape.

**List-number** — 36×36 yellow square with 3px black border holding a Space Grotesk 14px weight 700 numeral. Used as bullets on numbered lists.

**Avatar-square** — 72×72 pastel square with 3px black border holding two uppercase initials at Inter weight 900 / 28px. Used in team grids; fills cycle through pastels.

**Step-connector** — A 28×4 horizontal black bar pinned to the right edge of a timeline-step card, mid-height. Visually links adjacent steps in a horizontal flow.

**Tilted decoration** — Any rectangle, badge, or star with a rotate(±2deg to ±12deg) transform. The tilt is intentional disruption of the grid; without it, the system reads as too uniform.

## Do's and Don'ts

### Do

- Apply 4px solid black borders to primary cards (`{components.card-elevated}`, hero-frame, quote-frame) and 3px to secondary chrome. The border weight ladder is the system's structural backbone.
- Pair every 4px border with an 8px offset shadow, and every 3px border with a 4px offset shadow. The border/shadow coupling is non-negotiable.
- Cycle slide backgrounds through the pastel palette — offwhite, cream, blue, pink, green, yellow — to keep the deck visually rhythmic. Staying on one color for many slides flattens the system.
- Set every Inter display element in uppercase with negative letter-spacing (-0.01 to -0.03em) and weight 800+. The combination is the typographic identity.
- Use the `{components.label-pill}` (3px border, 4px shadow, pastel fill, Space Grotesk uppercase 0.08em) as the universal section eyebrow on every region.
- Apply tilt to decorative rectangles, stat cards, stars, and badges (±2deg to ±12deg). The intentional misalignment is the system's playful signature.
- Use `{colors.yellow}` as the default button color. Yellow with a 3px black border and 4px black shadow is the system's "click here" voice.
- Render shadows as solid black with zero blur, always offset bottom-right. The hard-edge shadow is the depth language.
- Add a decorative element (star-burst, stripe-block, dot-grid, corner-bracket, tilted rectangle) to every surface. The visual chatter is part of the system's energy.
- Use pure black `{colors.black}` for the closing surface, with white text and a 12px yellow offset shadow on the close-frame. The inverted dark surface is the system's loudest contrast moment.

### Don't

- Don't round any corner on cards, buttons, label-pills, icon-squares, or avatars. Border-radius is forbidden except on the stat-deco dot (12px circle).
- Don't blur any shadow. Every shadow is hard-edged at zero blur. `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` does not exist in this system.
- Don't use colored borders. Borders are always pure black, except for the inverted 4px white border on the close-frame.
- Don't use Inter display weights in sentence case. Uppercase is mandatory on heading-xl, heading-lg, quote-text, close-title, and card-title.
- Don't set Inter display without negative letter-spacing. Default-tracked Inter at heavy weights reads as a different system.
- Don't introduce a sixth pastel color. The palette is locked at pink, blue, green, yellow, cream. Adding purple, orange, or red breaks the curated candy palette.
- Don't omit the label-pill on a region. Going straight from background to headline without an eyebrow tag breaks the system's editorial rhythm.
- Don't render label-pills as plain text. The 3px border + 4px shadow + pastel fill combination is what defines the pill.
- Don't use blurred or colored body text. Body is solid black on light surfaces, solid white or cream on dark surfaces.
- Don't keep every card perfectly aligned. The tilt on stat cards, decorations, and badges is what gives the system its hand-made energy.

## Responsive Behavior

BlockFrame is designed as a **1920×1080 presentation system** (effective 100vw × 100vh). Sizing uses CSS `clamp()` for type and fixed px for borders, shadows, and structural padding. The system has three component-level breakpoints for narrow viewports.

### Scaling Behavior
- Heading-xl scales 48px → 96px on viewport width.
- Heading-lg scales 32px → 64px.
- Body scales 16px → 20px.
- Borders (3px, 4px), shadows (4px, 8px), and structural padding (60px slide-pad) are fixed and do not scale.

### Component Breakpoints
- `max-width: 1024px` — slide padding shrinks 60px → 40px, two-column splits stack vertically, feature card row stacks vertically, timeline track stacks vertically with step-connectors hidden, stats grid collapses to 2 columns, team grid collapses to 2 columns. Split visual loses left border and gains a top border.
- `max-width: 640px` — stats grid collapses to 1 column, team grid collapses to 1 column, hero-frame padding shrinks to 32px, quote-frame padding shrinks to 32px.

### Presenter Behavior
- Slides advance via `ArrowRight` or `Space`.
- Slides reverse via `ArrowLeft`.
- Horizontal touch swipe with a 50px threshold advances/reverses.
- Slide transitions are instant (`display: none` ↔ `display: flex` on the `.active` class), with no crossfade.

### Print Behavior
The system has no `@media print` rule. Slides are absolute-positioned and only one is visible at a time — printing produces only the active slide. For static export, screenshots of each slide preserve all borders, shadows, and decorations (all are CSS, not image assets).

### Interactive States
- Buttons and nav-buttons translate -2/-2 on hover and shadow grows to 6px (`{shadows.hover}`); on active, translate 2/2 and shadow shrinks to 2px. The hover-press behavior is unusual for a presentation system; it reflects BlockFrame's hybrid identity as both deck and interactive product mockup.

## CJK & International Content

When using this template for Chinese (or other CJK) content, swap the Latin typeface stack for an equivalent Chinese pairing and apply universal CJK adjustments. All recommended Chinese fonts load via CDN — no install required.

### Recommended Chinese Pairing

| Role | Latin (default) | Chinese counterpart |
|---|---|---|
| Display / hero / quote / close title / stat numerals | Inter 800–900 (uppercase, negative tracking) | 思源黑体 Noto Sans SC 900 (sentence case, 0 tracking) |
| Card title | Inter 700 (uppercase) | 思源黑体 Noto Sans SC 700 (no transform) |
| Body / list body | Inter 500 | 思源黑体 Noto Sans SC 400 |
| Label / mono tag / counter / legend | Space Grotesk 600–700 (uppercase, 0.05–0.1em tracking) | 思源黑体 Noto Sans SC 600 (no transform, no tracking) |

### Mixed-Content Strategy

**Strategy A** — single CJK family with built-in Latin glyph coverage. Set every text element to `font-family: 'Noto Sans SC', sans-serif`. 思源黑体 ships Latin glyphs that pair cleanly with its Chinese characters, so mixed sentences render in one consistent face. The Inter / Space Grotesk distinction in the Latin original is preserved through weight contrast: weight 900 carries the brutalist display role, weight 600 carries the label role, weight 400–500 carries body. Visual hierarchy survives even though the face contrast is gone.

### Loading

Add to the template's `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;900&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

- **Line-height**: increase by ~15–25% from the Latin spec. Body 1.75–1.85 (up from 1.6), display 1.15–1.25 (up from 0.95–1). The Latin display compresses to 0.95 line-height; CJK at that compression collides vertically.
- **Letter-spacing**: set to 0 on every CJK run. The template's negative display tracking (−0.02 to −0.03em on Inter) overlaps CJK strokes and reads as broken; the positive 0.05–0.1em tracking on Space Grotesk labels reads as gappy on square glyphs.
- **Text transform**: don't apply `uppercase` to Chinese text — CJK has no case. Every Inter display heading (heading-xl, heading-lg, quote-text, close-title, card-title) uses `text-transform: uppercase` in the Latin original; remove it for CJK runs. Every label-pill, counter, and chrome element also uses uppercase; remove that too.
- **Punctuation**: use full-width Chinese punctuation （，。：；！？「」（））.
- **No period on display headlines**: Chinese typography convention omits trailing 。 on display-scale headlines.
- **Space between CJK and Latin (盘古之白)**: insert an ASCII space between every Chinese character and adjacent Latin character or digit. Write `BlockFrame 设计系统` not `BlockFrame设计系统`.
- **One font per sentence**: 思源黑体 covers both CJK and Latin glyphs in a unified style — let it handle mixed sentences. Don't let the browser font-switch to Inter or Space Grotesk mid-word.

### Aesthetic Notes for This System

The Latin original's typographic identity rests entirely on the **heavy uppercase + negative tracking** combination on Inter display. CJK has no case, so this signal disappears. The system survives because its identity is **80% structural, 20% typographic**: the 4px black borders, 8px hard offset shadows, five-pastel palette, tilted decorations, label-pills, star bursts, stripe blocks, and dot grids do the brutalist work. Set 思源黑体 900 in sentence case at the same large sizes; the chunky black-on-pastel + hard-shadow framing reads as brutalist regardless of whether the type is in caps.

The label-pill (Space Grotesk 600 uppercase, 0.08em tracking, 3px border + 4px shadow, pastel fill) loses the uppercase + tracked-mono character. Render Chinese label-pills with 思源黑体 weight 600 at 0 tracking and a slightly tighter fontSize (11–12px instead of 13px) — the bordered pill shape and shadow do the chrome-recognition work. Keep the pastel fill rotation (pink / blue / green / yellow / cream) intact; it's the system's most recognizable signal after the borders themselves.

### Known CJK Gap

- **No CDN Chinese monospace face for the "system readout" voice.** Space Grotesk's quasi-mono role (label-pills, counters, mono-tags, slide counter NN / NN) depends on its slightly geometric character plus the wide-tracked uppercase treatment. Neither survives the CJK translation. The slide counter and chart legend can keep Latin digits + Latin labels intact; for purely Chinese chrome, lean on the pill border + shadow + pastel fill to signal "label" rather than the typographic treatment.
- **The "uppercase brutalist" identity weakens.** The system's most distinctive typographic decision is "heavy uppercase Inter with negative tracking" — and that signal is irreplaceable in CJK. Compensate by leaning harder on the structural elements: more decorative disruption (extra tilted rectangles, star bursts, stripe blocks), more saturated pastel-ground rotation across slides, and slightly tighter shadow offsets to compensate for the calmer typographic baseline.

## Iteration Guide

1. Any new card uses a 4px or 3px solid black border + the matched-weight offset shadow (8px or 4px). Never use a card without both.
2. Any new region begins with a `{components.label-pill}` eyebrow in pastel fill, then the headline in uppercase Inter weight 800+, then content. The label-headline-content sequence is the system's editorial rhythm.
3. Any new headline uses uppercase Inter with negative letter-spacing and weight 800-900. Reach for `{typography.heading-lg}` (32-64px) for primary moments and `{typography.heading-xl}` (48-96px) for cover/hero scale.
4. Any new accent or surface fill picks from the 5-pastel palette (pink, blue, green, yellow, cream) — never introduce a sixth pastel.
5. Any new CTA uses the `{components.button-primary}` pattern: 3px black border, yellow fill, 4px black shadow, Inter weight 700 / 16px. Hover lifts -2/-2 with shadow growing to 6px.
6. Any new chart cycles through pink → blue → green for series order, with yellow/cream available for additional series. Legend swatches use 2px black border.
7. Any new stat or metric uses Inter weight 900 + line-height 1 for the numeral, paired with Space Grotesk uppercase label below. Decorate the card with a `{components.stat-deco-dot}` in a pastel color.
8. Any new slide adds at least one decorative disruption (tilted rectangle, star-burst, stripe-block, dot-grid corner, corner-bracket frame) — empty surfaces feel timid.
9. Any new closing-style surface uses pure `{colors.black}` ground with white text, a 4px white-bordered close-frame, and a 12px yellow offset shadow. This is the only colored shadow allowed.
10. If a surface feels too noisy, drop a decoration — don't drop a border or shadow. The borders and shadows are structural; the decorations are tunable.

## Known Gaps

- **Inter and Space Grotesk are loaded from Google Fonts** via inline `@import`. There are no system fallbacks beyond `sans-serif` and `monospace` — in environments where Google Fonts fail, the system collapses to system defaults and loses its identity.
- **The system uses `@import` inside the `<style>` block** rather than a `<link>` preconnect. This is slower than the standard `<link>` approach and may delay first paint of typography.
- **The chart is rendered as inline SVG with hardcoded coordinates** (`viewBox="0 0 800 360"`, hardcoded `x/y/width/height` per `<rect>`). Adding new chart slides requires manual coordinate math; there is no data-binding layer.
- **The hover/active state on buttons assumes a pointing device.** On touch devices the lift-and-press feedback only triggers on tap and may feel inconsistent.
- **The tilt on stat cards is hardcoded with `:nth-child(odd)` -2deg and `:nth-child(even)` +2deg.** Re-ordering cards changes which tilts which direction — there's no per-card tilt control beyond ordering.
- **The decorative star uses a CSS clip-path polygon with 10 points.** Browsers without clip-path support (very old IE/Edge) will render the star as a colored rectangle.
- **The slide-counter and nav-controls overlap the slide content area at the bottom edge.** The 110px bottom padding on certain slides (slide-4, slide-9) reserves space, but other slides may have content that crowds the bottom-left counter pill.
- **The black close-surface uses pure `#000000` ground with white text** — accessibility-wise this is high-contrast and fine, but the colored decorations on this surface (yellow shadow, white border) don't pass the WCAG color contrast checks at small sizes.
- **The dot-grid background is a CSS radial-gradient.** At very large viewport sizes the dots may look too small to read as a grid; at very small sizes they may visually merge into solid noise.
- **There is no transition between slides** other than the binary display toggle. Adding a fade or slide animation requires modifying the JS and adding transition CSS.
