---
version: alpha
name: Retro Zine
description: "A risograph-zine editorial system on warm khaki paper with a deep forest-green accent and ink-black structure. Display type runs in Bebas Neue (condensed industrial sans, uppercase, generously tracked); body type runs in Space Grotesk at weight 300–500; handwritten emphasis runs in Caveat. A subtle SVG grain overlay sits over every slide, reinforcing the printed-paper feel. The aesthetic borrows from independent press, mid-century activist posters, and DIY zine culture: slightly rotated stamp marks, masking-tape pieces in collage layouts, drop caps, and offset paper-on-paper shadows. The effect is hand-printed editorial — warm but disciplined, confident but tactile."

colors:
  bg: "#C8B99A"
  bg-dark: "#B8A98A"
  green: "#008F4D"
  green-light: "#00A85D"
  black: "#1A1A1A"
  white: "#F4EFE6"

color-aliases:
  line: black

typography:
  display-hero:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(56px, 10vw, 160px)"
    fontWeight: 400
    lineHeight: 0.85
    letterSpacing: 0.04em
    textTransform: uppercase
  display-cover:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(48px, 10vw, 140px)"
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: 0.04em
    textTransform: uppercase
  display:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(48px, 8vw, 120px)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: 0.04em
    textTransform: uppercase
  headline:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(42px, 6vw, 90px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: 0.03em
    textTransform: uppercase
  headline-md:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(36px, 5vw, 72px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: 0.03em
    textTransform: uppercase
  statement:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(36px, 6vw, 90px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
    textTransform: uppercase
  title:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(24px, 3vw, 42px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.04em
    textTransform: uppercase
  number-hero:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(80px, 12vw, 160px)"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.02em
  number-md:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(44px, 6vw, 80px)"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.02em
  drop-cap:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(48px, 6vw, 80px)"
    fontWeight: 400
    lineHeight: 0.8
    letterSpacing: 0.02em
  body:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(13px, 1.2vw, 16px)"
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(14px, 1.3vw, 18px)"
    fontWeight: 400
    lineHeight: 1.6
  label-eyebrow:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "14–18px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.2em
    textTransform: uppercase
  label-spaced:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "12–14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.25em
    textTransform: uppercase
  caption-feature:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "13–15px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.2em
    textTransform: uppercase
  hand-script:
    fontFamily: "'Caveat', cursive"
    fontSize: "clamp(22px, 3vw, 36px)"
    fontWeight: 600
    lineHeight: 1.3
  hand-script-sm:
    fontFamily: "'Caveat', cursive"
    fontSize: "clamp(16px, 2vw, 22px)"
    fontWeight: 400
    lineHeight: 1.3
  hand-script-lg:
    fontFamily: "'Caveat', cursive"
    fontSize: "clamp(24px, 3vw, 36px)"
    fontWeight: 600
    lineHeight: 1.3

spacing:
  slide-pad: 60px
  slide-pad-wide: "60px 80px"
  card-pad-lg: 48px
  card-pad-md: 32px
  card-pad-sm: 24px
  gap-lg: 60px
  gap-md: 40px
  gap-sm: 24px

canvas:
  width: 100vw
  height: 100vh

components:
  grain-overlay:
    backgroundImage: "SVG fractal-noise filter, base 200×200 tile"
    opacity: 0.07
    zIndex: 9999
    description: "Fixed, full-viewport SVG grain overlay sitting above all content. Imitates the print-grain texture of a risograph or letterpress page. Pointer-events disabled. Required on every slide."
  line-box:
    border: "3px solid {colors.black}"
    description: "Generic outlined card with 3px solid black border on khaki background. The system's default content container."
  line-divider:
    border: "3px solid {colors.black}"
    description: "Strict 3px black rule used as a region divider. May be top, bottom, left, or right of a region; meets adjacent borders without gap."
  line-thin:
    border: "2px solid {colors.black}"
    description: "2px black rule used inside a section for sub-region division (editorial column rule, ed-header bottom rule)."
  line-fine:
    border: "1.5px solid {colors.black}"
    description: "1.5px black rule used inside grid containers for cell separation (sub-cells inside a 3px-bordered grid)."
  stamp:
    transform: "rotate(-8deg) or rotate(6deg)"
    display: inline-block
    description: "Any element may be rotated -8deg (stamp) or 6deg (stamp-alt) to read as a hand-pressed ink stamp or applied label. Reserve for badges, callouts, and decorative overlays."
  stamp-mark:
    background: "{colors.black}"
    color: "{colors.green}"
    fontFamily: "'Bebas Neue', sans-serif"
    padding: "10px 24px"
    border: "2px solid {colors.green}"
    transform: "rotate(-8deg)"
    fontSize: 18px
    letterSpacing: 0.1em
    description: "Approval / status stamp — black background, green text, green 2px border, rotated -8deg. Used as a 'stamp of authenticity' callout."
  ribbon-bar:
    background: "{colors.green}"
    color: "{colors.white}"
    padding: "4–8px 12–20px"
    description: "Solid green color-block that contains light cream text — used as section labels, accent strips, and inline highlight bars."
  inline-highlight:
    background: "{colors.black}"
    color: "{colors.bg}"
    padding: "2px 8px"
    fontWeight: 600
    description: "Black-on-khaki marker highlight applied inline inside body paragraphs to lift a phrase. The print equivalent of a marker pen swipe."
  drop-cap:
    float: left
    fontSize: "clamp(48px, 6vw, 80px)"
    fontFamily: "'Bebas Neue', sans-serif"
    color: "{colors.green}"
    lineHeight: 0.8
    marginRight: 12px
    description: "Oversized green initial cap at the start of an editorial paragraph. Bebas Neue, line-height 0.8, floated left so body text wraps around."
  card-offset:
    background: "{colors.white}"
    border: "3px solid {colors.black}"
    positionBefore:
      offset: "12px down, 12px right"
      background: "{colors.green}"
      zIndex: -1
    description: "Card with a paper-on-paper offset effect — a solid green slab sits 12px behind the card, offset down-and-right. Reads as a colored shadow without using box-shadow."
  collage-piece:
    border: "3px solid {colors.black}"
    padding: 24px
    position: absolute
    transform: "rotate(-5deg to 5deg)"
    description: "Free-positioned collage panel with a 3px black border and small rotation. Backgrounds vary across pieces — white, khaki-dark, green, or black-with-inversion. Used in scatter-on-page compositions."
  tape:
    width: 80px
    height: 24px
    background: "rgba(255,255,255,0.4)"
    border: "1px solid rgba(0,0,0,0.1)"
    transform: "rotate(-40deg to 35deg)"
    description: "Translucent masking-tape rectangle layered at random angles over a collage to suggest physically taped-down pieces. Positioned absolutely; 1px hairline border. Always semi-transparent white."
  divider-stub:
    width: 60–80px
    height: 4px
    background: "{colors.white} or {colors.green}"
    description: "Short solid horizontal rule used as a centered visual breath above/below a statement or closing title. 4px tall."
  rsvp-field:
    borderBottom: "2px solid {colors.black}"
    paddingBottom: 8px
    description: "Form-field row pattern: small Bebas Neue green label, hand-script value drawn over a 2px black underline. Mimics a written form."
  ledger-row:
    borderBottom: "1.5px solid {colors.black} (header) or 1px solid rgba(black, 0.22) (body)"
    padding: "10–18px 0"
    description: "Horizontal data row pattern: date | title | edition | track | nr. Header row has stronger bottom border; body rows have hairline dividers."
  chip:
    padding: "4px 10px"
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "11–12px"
    color: "{colors.white}"
    textTransform: uppercase
    letterSpacing: 0.06em
    description: "Mono-font color chip used inline in tabular ledger rows to tag a row's category. Fill pulls from green / red-stamp / orange / pink / blue as a categorical palette extension."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Retro Zine is a **risograph-zine editorial system** on a warm khaki canvas (`{colors.bg}` — #C8B99A) with deep forest-green (`{colors.green}` — #008F4D) as the meaningful accent and ink-black (`{colors.black}` — #1A1A1A) as the structural color. The aesthetic borrows from independent press culture, mid-century activist posters, and DIY zine layouts: condensed industrial display type, hand-script emphasis, slightly rotated stamps, masking-tape collage marks, drop caps, and a print-grain overlay that ties every surface to a printed-paper register.

The typeface stack pairs three faces with distinct emotional roles. **Bebas Neue** is the display voice — a condensed, all-caps industrial sans with generous tracking (0.02–0.04em) used for every headline, statement, statistic, numeral, and label. Its compressed verticality is the system's visual identity; substituting any other display sans loses the zine voice. **Space Grotesk** is the body voice — a clean humanist geometric sans at weight 300–500 for paragraphs, used at small sizes (13–18px) which preserves the magazine column-text density. **Caveat** is the hand-script voice — a casual ballpoint cursive used for author attributions, side notes, captions on display elements, and the form-field "writing" in RSVP-style layouts. The three faces together read as "an editorial spread typeset by a small press."

The color philosophy is **earth + forest**: a warm khaki paper canvas, a deeper khaki tonal sibling for layered surfaces, deep forest-green for accents and accent surfaces, ink-black for structure and body, and an off-white cream (`{colors.white}` — #F4EFE6) for cards and inverted text fills. The white is deliberately not pure — it's a soft cream that sits as paper inside paper rather than as a hard rectangle. Green carries the system's emotional voice: it is what activates a section, what stamps approval, what marks the brand. The same hex (#008F4D) appears as drop caps, ribbon bars, inline labels, statement backgrounds, and the progress bar.

Depth comes from **paper-on-paper offset blocks** and **slight rotations**, not blurred shadows. The signature treatment: a `{components.card-offset}` carries a solid green slab sitting 12px down-and-right behind it via an absolutely-positioned `::before` pseudo-element. The visual effect is a layered paper or letterpress underprint rather than a soft drop shadow. Rotations on stamps (`-8deg` or `6deg`) and on collage pieces (`-5deg` to `5deg`) add the hand-placed feeling.

**Density philosophy: medium-high.** The zine register depends on visual richness — collage compositions, multi-column editorial layouts, drop caps inside body text, tabular ledgers with chip categories, ribbon-bar headers stamped at angles. A slide that holds only one centered headline reads as underdesigned; the zine voice expects a layout to be packed with editorial moves. The correct density is one dominant text moment supported by multiple subordinate components (decorative stamps, eyebrow labels, divider stubs, hand-script attributions, drop caps). Reserve true sparseness for the manifesto / statement moment where a single large quote dominates a solid green field.

**Key Characteristics:**
- Warm khaki paper canvas (`{colors.bg}`) + deep forest-green accent (`{colors.green}`) + ink-black structure (`{colors.black}`).
- An SVG grain overlay (`{components.grain-overlay}`) sits over every slide at 0.07 opacity, reinforcing the printed-paper register.
- Bebas Neue uppercase + tracked for every display moment; Space Grotesk at small sizes for body; Caveat for hand-script emphasis.
- 3px solid black structural borders divide regions; 2px and 1.5px borders subdivide.
- Paper-on-paper offset cards: green slab sits 12px behind a white card via `::before`.
- Stamps and collage pieces carry small rotations (-8°, +6°, -5° to +5°).
- Translucent masking-tape pieces (`{components.tape}`) layered over collage compositions.
- Green drop caps, green ribbon bars, and green inline highlights mark editorial emphasis.

## Colors

### Palette
- **Background** (`{colors.bg}` — #C8B99A): The warm khaki paper canvas. The default surface for every slide. Saturated enough to read as paper-with-history rather than as a neutral; warm enough to harmonize with the forest-green accent.
- **Background Dark** (`{colors.bg-dark}` — #B8A98A): A slightly darker tonal sibling of the canvas. Used for layered surface regions when one half of a split-screen needs to sit visually behind the other, and for collage pieces that want to read as "paper on khaki paper."
- **Green** (`{colors.green}` — #008F4D): Deep forest green. The system's accent color — hero numerals, drop caps, ribbon bars, statement-slide backgrounds, progress bar, inline highlights, RSVP labels, the offset slab behind cards, divider stubs on the closing slide. The single most distinctive non-canvas color.
- **Green Light** (`{colors.green-light}` — #00A85D): A slightly brighter sibling of green. Available as a hover-state or secondary green where the deep green needs a step-up; rarely used in baseline static slides.
- **Black** (`{colors.black}` — #1A1A1A): Ink-black. The structural color — all borders, all body text, all dividers, all closing-slide backgrounds, all label fills (when inverted). Slightly softer than pure black (#000000) so it sits as warm ink on warm paper.
- **White / Cream** (`{colors.white}` — #F4EFE6): Soft cream. Used as card fills (paper-on-paper), as text inside black surfaces, and as the divider-stub color on statement slides. Critically, this is not pure white — it's a paper-cream that maintains the warm-paper register even when used as a "white" surface.

### Defaults
- **Default surface background**: `{colors.bg}` — every slide opens on warm khaki paper.
- **Default headline color**: `{colors.green}` for primary section headlines and hero titles; `{colors.black}` for body-paired headlines in two-column or split layouts. When in doubt, reach for `{colors.green}` — a green headline is the system's loudest editorial signal.
- **Default body text color**: `{colors.black}`.
- **Default border color**: `{colors.black}` — every structural border is black, no exceptions.
- **Default accent surface for emphasis (statement, hero callout)**: `{colors.green}` with `{colors.white}` text.
- **Default text color on a `{colors.green}` surface**: `{colors.white}` (cream).
- **Default text color on a `{colors.black}` surface**: `{colors.bg}` (the khaki canvas), so type still reads as "ink on paper" even in inversion. Green accents on a black surface (closing slide eyebrow + hand-script) lift the inversion.
- **Default eyebrow / label color**: `{colors.green}` for Bebas Neue labels; `{colors.black}` for letter-spaced Space Grotesk labels.
- **Default drop-cap color**: `{colors.green}`. Drop caps are the editorial fingerprint and they are always green.
- **Default hand-script color**: `{colors.black}` on khaki/cream surfaces; `{colors.green}` on black surfaces (closing).
- **Default inline highlight**: black-on-khaki (`{components.inline-highlight}`) — used to lift phrases inside body paragraphs as if marked with a pen.

The green and black accents are not interchangeable: **green = emphasis** (this is what we want you to notice), **black = structure** (this is what holds the page together). Reversing them — using black for emphasis and green for structure — flips the system's voice.

## Typography

### Font Family
The system pairs three Google Fonts:

- **Bebas Neue** (display): A condensed all-caps industrial sans-serif. Single weight (400) but reads bold by virtue of its dense vertical strokes. Used uppercase with 0.02–0.04em letter-spacing for every display moment — headlines, statements, statistics, ordinals, eyebrow labels. The narrow tracked Bebas voice is what makes the system unmistakably "zine."
- **Space Grotesk** (body): A clean humanist geometric sans-serif with subtle quirky proportions. Used at weights 300–500 for body paragraphs at small sizes (13–18px), and at weight 600 for letter-spaced Space Grotesk caps labels. Provides the readable counterpoint to Bebas's expressive density.
- **Caveat** (hand-script): A casual handwritten cursive. Used at weights 400–700 for author attributions ("— Our founding principle since day one"), side notes, decorative captions on display elements, value-fills in RSVP-style form layouts. Provides warmth and a human-hand voice against the otherwise typeset system.

There is no fourth face. Italic does not exist (Caveat is a script face, not an italic). Underline does not exist. Emphasis is achieved by switching face (Space Grotesk body → Caveat hand-script for a personal note, Bebas Neue display for a callout) or by color (`{colors.black}` → `{colors.green}`).

### Type Scale

| Token | Size (clamp) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display-hero}` | 56–160px | Bebas Neue | 400 | Closing or oversized cover headline |
| `{typography.display-cover}` | 48–140px | Bebas Neue | 400 | Cover / opening display headline |
| `{typography.display}` | 48–120px | Bebas Neue | 400 | Major declarative or callout display |
| `{typography.headline}` | 42–90px | Bebas Neue | 400 | Primary section headline |
| `{typography.statement}` | 36–90px | Bebas Neue | 400 | Long-form quoted statement |
| `{typography.headline-md}` | 36–72px | Bebas Neue | 400 | Editorial section header |
| `{typography.title}` | 24–42px | Bebas Neue | 400 | Region or collage-piece title |
| `{typography.number-hero}` | 80–160px | Bebas Neue | 400 | Hero statistic numeral |
| `{typography.number-md}` | 44–80px | Bebas Neue | 400 | Tile or sub-stat numeral |
| `{typography.drop-cap}` | 48–80px | Bebas Neue | 400 | Initial cap leading an editorial paragraph |
| `{typography.body-md}` | 14–18px | Space Grotesk | 400 | Lead paragraph or emphasized body |
| `{typography.body}` | 13–16px | Space Grotesk | 400 | Standard paragraph body |
| `{typography.label-eyebrow}` | 14–18px | Bebas Neue | 400 | Eyebrow label above a headline, tracked 0.2em |
| `{typography.label-spaced}` | 12–14px | Space Grotesk | 600 | Tracked all-caps small label |
| `{typography.caption-feature}` | 13–15px | Bebas Neue | 400 | Tracked all-caps caption or feature-callout label |
| `{typography.hand-script}` | 22–36px | Caveat | 600 | Author attribution, decorative note, statement byline |
| `{typography.hand-script-sm}` | 16–22px | Caveat | 400 | Small handwritten label or descriptor |
| `{typography.hand-script-lg}` | 24–36px | Caveat | 600 | Larger handwritten subtitle |

### Defaults
- **Default size for a primary section headline**: `{typography.headline}` (42–90px clamp) in `{colors.green}`.
- **Default size for a cover or oversized opening headline**: `{typography.display-cover}` (48–140px clamp) in `{colors.green}`.
- **Default size for paragraph body**: `{typography.body}` (13–16px clamp) — the zine register expects small body type, not modern 18px+ paragraphs.
- **Default size for a lead paragraph or emphasized body**: `{typography.body-md}` (14–18px).
- **Default size for an eyebrow label above a headline**: `{typography.label-eyebrow}` (14–18px) in `{colors.green}`, tracked 0.2em uppercase.
- **Default size for a hero numerical figure**: `{typography.number-hero}` (80–160px clamp) in `{colors.green}`.
- **Default size for any hand-script attribution / side note**: `{typography.hand-script}` (22–36px clamp).
- **Default weight for any Bebas display element**: 400 (Bebas Neue ships at 400; weight changes are not part of the system).
- **Default weight for body**: 400; for tracked-caps small labels: 600.

When unsure between `{typography.headline}` and `{typography.title}` for the dominant text moment on a slide, reach for `{typography.headline}` — `{typography.title}` is for collage-piece or region-level subtitling within a slide.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Bebas Neue element is uppercase.** The font has lowercase glyphs but they are not used in this system. Sentence-case Bebas is not part of the vocabulary.
- **Every Bebas Neue element carries positive letter-spacing of at least 0.02em.** Default tracking on Bebas reads as cramped; the 0.02–0.04em opens it up. Labels and eyebrows track even more (0.2–0.25em).
- **Every primary section headline is set in `{colors.green}`.** Black headlines exist (for body-paired columns) but the system's loudest editorial voice is green-on-khaki.
- **Every editorial paragraph that opens a column may carry a drop cap.** The drop cap is always `{components.drop-cap}` — green, Bebas Neue, line-height 0.8, floated left. Use it as the opening flourish for a feature-length body column.
- **Every hand-script element uses Caveat.** Substituting another script face loses the personal-note voice.
- **Hand-script attributions follow display headlines on quote / statement layouts.** A statement without a hand-script byline reads as incomplete; the byline grounds the quote as a human voice.
- **Inline highlights inside body use the black-on-khaki pattern** (`{components.inline-highlight}`), not green-on-khaki. Green inline reads as a typo; black inline reads as a marker stripe.

### Typography Principles
The system's typographic rhythm comes from **three-face contrast**: condensed industrial Bebas display (loud, tracked, uppercase) → clean Space Grotesk body (quiet, small, sentence case) → expressive Caveat hand-script (personal, looser, signature-style). Slides that use only one face read as monotonous; slides that mix all three within a single composition read as zine-correct.

Line-height: tight on display (0.85–1.1), generous on body (1.6–1.7), loose on hand-script (1.3). Never invert these — tight body and loose display both break the rhythm.

## Layout

### Canvas System
The system targets `100vw × 100vh` — full viewport. Each `.slide` is absolutely positioned to fill the viewport; only the `.active` slide is visible (opacity 1, others at opacity 0). Slide transitions use a 0.6s opacity + translateY(20px) ease for a soft paper-shuffle feel. Navigation is JS-driven via arrow keys, space, click, and touch swipe. A 4px tall `{colors.green}` progress bar runs flush along the bottom edge.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.slide-pad}` | 60px | Standard slide outer padding |
| `{spacing.slide-pad-wide}` | 60px 80px | Editorial column-spread outer padding |
| `{spacing.card-pad-lg}` | 48px | Inside hero cards (RSVP, large callout) |
| `{spacing.card-pad-md}` | 32px | Inside grid-box cells |
| `{spacing.card-pad-sm}` | 24px | Inside collage pieces, smaller card cells |
| `{spacing.gap-lg}` | 60px | Editorial column gap |
| `{spacing.gap-md}` | 40px | Standard region gap |
| `{spacing.gap-sm}` | 24px | Tight inline gap |

### Persistent Chrome
Three persistent elements live outside the slide composition:
- **Progress bar** flush along the bottom-left, 4px tall, fill in `{colors.green}`. Grows as the deck advances.
- **Slide counter** at bottom-right — Bebas Neue 14px in a 2px-bordered cream chip with khaki ink.
- **Nav hint** at bottom-center — a black-fill pill with cream text, fading in only on `body:hover` (0.4s opacity transition).

### Region Borders vs Internal Padding
The system follows a **border-as-divider** principle for grid containers — a parent container has a 3px solid black outer border, and each child cell has a 1.5px solid black border that creates a hairline cell-to-cell divider. Where regions abut at a slide-edge (split-screen layouts), the dividing line is 3px solid black with the two regions meeting it directly — no gap.

For free compositions (collage, hero, manifesto), regions are positioned absolutely with rotation and overlap; borders sit on individual pieces, not on the slide grid.

## Depth and Elevation

### Paper-on-Paper Offset Block (Primary Technique)
The signature depth treatment is the **offset color block**: a card carries a `::before` pseudo-element absolutely positioned, offset 12px down-and-right, filled in `{colors.green}` (or another accent), and z-indexed behind the card. The visual effect is a layered paper underprint — the card looks like it sits on top of a slightly-larger green sheet of paper, with the green showing through at the bottom-right edges. Used on hero RSVP cards and primary callout containers.

### Rotation (Secondary Technique)
Small rotations (`-8deg` stamp, `+6deg` stamp-alt, `-5deg` to `+5deg` collage) on stamp marks, RSVP labels, visual overlay callouts, and collage pieces give the system its hand-placed energy. Rotations are intentional — never accidental tilt — and reserved for elements meant to read as physical artifacts (stamps, taped pieces, applied labels).

### Grain Overlay (Atmospheric Texture)
A subtle SVG fractal-noise overlay sits over every slide at 0.07 opacity, tinting all surfaces with print grain. This is not depth in the strict sense — it's surface texture that grounds every flat color block in the printed-paper register. Removing the grain breaks the zine voice immediately.

### No Web Shadows
The system uses **no blurred `box-shadow`, no `drop-shadow`, no rgba shadow tints** for depth. The offset color block, the rotations, and the grain overlay are the entire depth grammar. A modern soft shadow on any element breaks the print aesthetic.

### Color-Block Contrast
Beyond shadows and rotations, **green-on-khaki and black-on-khaki contrast** provides regional depth. A green ribbon bar inside a khaki region visually projects forward; a black region behind a white card visually recedes. The palette's high contrast is the secondary depth signal.

## Shapes and Treatment

### Border Radius
The system has **no rounded corners**. Every shape — cards, ribbon bars, stamps, RSVP cards, table cells, drop caps, chips, divider stubs — is a strict rectangle or square. Border-radius is `0` system-wide.

### Border Weights
- **3px solid `{colors.black}`** — the universal structural border on cards, region dividers, grid container outer borders, collage pieces, RSVP cards, hero callouts.
- **2px solid `{colors.black}`** — used for editorial column rules, RSVP-field underlines, ed-header bottoms, and the stamp-mark green border.
- **1.5px solid `{colors.black}`** — used for grid cell sub-borders inside a 3px outer-bordered container, and for ledger header underlines.
- **1px solid rgba(black, 0.22)** — used for ledger row dividers and hairline tabular separations.

Borders are always black. Colored borders do not exist except the green border on the `{components.stamp-mark}` approval stamp.

### Decorative Element Types

**Line box** (`{components.line-box}`) — Generic 3px-bordered card on khaki background. The system's default content container. Padding from the `{spacing.card-pad-*}` scale.

**Card with offset** (`{components.card-offset}`) — White cream card with a 3px black border and a 12px-offset green slab sitting behind via `::before`. The signature paper-on-paper card.

**Stamp** (`{components.stamp}` / `{components.stamp-mark}`) — Any element may be rotated -8° (stamp) or +6° (stamp-alt) to read as a hand-pressed mark. The `stamp-mark` variant is a black rectangle with green text and green border. Used as approval seals, "CONTACT US" badges, and editorial stamps.

**Collage piece** (`{components.collage-piece}`) — Free-positioned panel with 3px black border and small rotation. Backgrounds rotate across pieces: green, white-cream, khaki-dark, black-inverted. Used in collage compositions where multiple pieces scatter across the slide with overlap.

**Tape** (`{components.tape}`) — Translucent white rectangle layered at random angle over collage pieces to suggest physical taped-down paper. Always semi-transparent, always at a sharp angle (-40° to +35°).

**Ribbon bar** (`{components.ribbon-bar}`) — Solid green color block with cream text — used as eyebrow strips, accent bars, and inline section labels. Read as a printed ribbon glued onto the page.

**Drop cap** (`{components.drop-cap}`) — Oversized green Bebas Neue initial that opens an editorial paragraph. Floated left, line-height 0.8, body text wraps around.

**Inline highlight** (`{components.inline-highlight}`) — Black-on-khaki marker swipe applied inline inside body paragraphs to lift a phrase. The print equivalent of a marker pen.

**RSVP field** (`{components.rsvp-field}`) — Form-field row pattern with a Bebas Neue green label paired with hand-script Caveat "writing" over a 2px black underline. The system's "filled-by-hand" form pattern.

**Ledger row** (`{components.ledger-row}`) — Horizontal data row pattern with date | title | edition | track | nr columns. Header row has 1.5px black underline; body rows have 1px hairline dividers. Each row may contain a color-coded chip (`{components.chip}`) tagging its category.

**Chip** (`{components.chip}`) — Mono-font color block (JetBrains Mono if used, else default mono) tagging a row category. Fill colors: green, plus the categorical-palette extension on slides that pull from the broader stamp palette.

**Divider stub** (`{components.divider-stub}`) — A short 4px solid horizontal rule (60–80px wide), centered, used as visual breath above/below a hero title or statement. White on green surfaces, green on black surfaces.

**Hand-script element** — Any text in Caveat. The system signal for "human voice" — attributions, side notes, captions, RSVP-field fills, closing-slide sign-offs.

## Do's and Don'ts

### Do
- Keep the SVG grain overlay (`{components.grain-overlay}`) on every slide at 0.07 opacity. It is the texture that anchors the entire deck to the printed-paper register.
- Use Bebas Neue uppercase with 0.02–0.04em tracking for every display, headline, statement, statistic, numeral, and eyebrow label.
- Reach for `{colors.green}` as the default headline color for primary section headlines. Green-on-khaki is the system's loudest editorial signal.
- Use the paper-on-paper offset pattern (`{components.card-offset}`) on hero callouts and RSVP-style cards — a green slab behind a white card via `::before`.
- Apply small rotations (-8° stamps, -5° to +5° collage pieces) to elements meant to read as physical artifacts. Rotation should always feel intentional.
- Use drop caps (`{components.drop-cap}`) to open editorial body columns. They are the system's editorial fingerprint.
- Mix the three faces — Bebas Neue display + Space Grotesk body + Caveat hand-script — within a single composition. Three-face contrast is the typographic rhythm.
- Set inline highlights inside body paragraphs in black-on-khaki (`{components.inline-highlight}`), mimicking a marker swipe.
- Pair every quote / statement with a Caveat hand-script byline below. The script attribution grounds the quote as a human voice.
- Layer translucent tape pieces (`{components.tape}`) at sharp angles over collage compositions to suggest physical taped-down paper.

### Don't
- Don't round any corner. Border-radius is 0 system-wide on every element.
- Don't use blurred `box-shadow`. All depth comes from the offset color block, rotation, and the grain overlay.
- Don't substitute another display face for Bebas Neue. The condensed industrial tracked-uppercase voice is the entire system identity.
- Don't use Bebas Neue in sentence case. Bebas always renders uppercase in this system; lowercase Bebas reads as wrong.
- Don't substitute another script face for Caveat. The casual ballpoint voice is part of the system; Lobster, Pacifico, etc. land elsewhere.
- Don't introduce a third brand color. Khaki + green + black + cream is the system. Adding blue or red breaks the earth-and-forest palette. The chip palette extension (orange / pink / blue / red) is reserved for categorical chip tags inside tabular ledgers — not for general accents.
- Don't use green-on-khaki for inline highlights. Inline marker swipes are black-on-khaki; green inline reads as a typo.
- Don't tilt elements more than ±8°. Beyond that, hand-placed becomes broken.
- Don't put body text larger than 18px. The zine column-density register depends on small body type (13–16px). Modern 20px+ body reads as overscaled.
- Don't use pure white (#FFFFFF) for cards. The cream (`{colors.white}` #F4EFE6) maintains the paper-on-paper register; pure white reads as digital.

## Responsive Behavior

The system targets `100vw × 100vh` and uses `clamp()` throughout for fluid scaling. A single media query at `max-width: 768px` reflows multi-column layouts to single-column, removes inter-column border rules and replaces them with bottom-borders, and reduces slide padding to 32px.

### Scaling Behavior
- Display headlines scale from 48px at minimum to 140–160px at maximum.
- Body text scales from 13px to 16–18px.
- Padding scales from 32px (mobile) to 60–80px (desktop).
- Borders, tape sizes, and stamp rotations are fixed — they do not scale with viewport.

### Presenter Behavior
- Slides advance via `ArrowRight`, `ArrowDown`, `Space`, `Enter`, `PageDown`, or a click on the right half of the viewport.
- Slides reverse via `ArrowLeft`, `ArrowUp`, `PageUp`, or a click on the left half.
- The active slide carries the `.active` class; inactive slides are at opacity 0 with `translateY(20px)`.
- Touch swipe horizontal advances/reverses on mobile.
- The nav hint at bottom-center fades in on `body:hover` (0.4s opacity).

### Print Behavior
No `@media print` rule is defined. The deck is web/viewport-first.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin | Chinese | Weight mapping |
|---|---|---|---|
| Display / Headline / Statement / Title / Number / Drop-cap / Label-eyebrow | Bebas Neue (400) | **思源宋体 Noto Serif SC** | 900 |
| Body / Body-md / Label-spaced | Space Grotesk (400 / 600) | **思源宋体 Noto Serif SC** | 400 (body), 600 (label) |
| Hand-script (Caveat) — Latin only | Caveat (400 / 600) | *(no CJK substitute)* | n/a |

### Mixed-Content Strategy

**Strategy A — single CJK family (思源宋体 Noto Serif SC) carries every typeset role.** Bebas Neue's condensed-industrial-uppercase voice has no Chinese sans equivalent that preserves the heavy poster weight without reading as a clichéd kanji-style display. Noto Serif SC at weight 900, however, carries genuine print-press weight that maps to the zine register: the deep serif strokes echo letterpress and woodblock printing, which is *closer* to the system's mid-century-activist-poster aesthetic than any Chinese sans would be. Pairing Latin Bebas + Chinese Noto Serif SC reads as "translated edition of the same zine," not as two competing systems. For body, the same family at weight 400 sits comfortably at small sizes (13–16px) and preserves the magazine column density.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&display=swap" rel="stylesheet">
```

Then append `'Noto Serif SC'` to the appropriate font stacks:
```css
/* Display roles */
font-family: 'Bebas Neue', 'Noto Serif SC', sans-serif;
/* Body roles */
font-family: 'Space Grotesk', 'Noto Serif SC', sans-serif;
```

### Universal CJK Adjustments

- Line-height: body 1.75–1.85, display 1.15–1.25
- Letter-spacing: 0 on CJK
- Text-transform: no uppercase on CJK
- Full-width punctuation
- No period on display headlines
- Pangu spacing (盘古之白): `使用 Claude` not `使用Claude`
- One font per sentence

### Aesthetic Notes for This System

- **The 0.02–0.04em positive tracking that defines Bebas display must drop to 0** on CJK. Tracked Chinese characters look broken — the spacing visually divides each character into a separate word. The compression-and-tracking signature of Bebas does not transfer; lean on weight 900 alone to carry the display voice.
- **Display line-height must open from 0.85–0.95 to 1.15–1.25.** Bebas's tight line-height is a Latin-display convention; CJK characters fully occupy their em-box and need vertical breathing room.
- **Drop caps need re-thinking.** A Bebas drop cap floats left of body text; a Noto Serif SC drop cap at the same size (`clamp(48px, 6vw, 80px)`) in `{colors.green}` works visually but lacks the editorial-tradition resonance — Chinese typography has historically not used drop caps. Either retain the treatment as a Western-editorial nod, or replace with a green vertical sidebar (3px wide, green fill) running alongside the opening paragraph.
- **Inline highlights, ribbon bars, and stamp marks all translate cleanly** — they are color-block treatments, not glyph-dependent.
- **Hand-script Caveat is the system's "human voice" — and has no Chinese equivalent that preserves the ballpoint-cursive personality.** Treat Caveat moments as Latin-only: attributions in Latin, side notes in Latin even on otherwise-Chinese slides, RSVP form fills in Latin. The contrast between Chinese typeset body and Latin handwritten margin notes can actually deepen the zine voice (it reads as "translator's annotation," which fits the small-press register).
- **Editorial body sizes (13–16px) still apply** — Noto Serif SC at this size reads as dense magazine column text, which is correct for the zine register.

### Known CJK Gap

The system's three-face contrast (Bebas display + Space Grotesk body + Caveat hand-script) is a Latin-typographic argument; collapsing it to a single CJK serif loses one rhythm and gains another. The decision to use a serif (Noto Serif SC) rather than a sans (Noto Sans SC) is deliberate — the zine's mid-century printed-press lineage maps better to Chinese serif tradition than to Chinese geometric sans. A deck that mixes Chinese and English will need to accept that the English Bebas voice and the Chinese Serif voice are different registers; this is unavoidable in any heavy-poster CJK adaptation.

## Iteration Guide

1. Every new slide carries the SVG grain overlay at 0.07 opacity. Removing the grain breaks the zine voice immediately.
2. Any new headline uses Bebas Neue uppercase, weight 400, tracking 0.02–0.04em. For the primary slide moment reach for `{typography.headline}` in `{colors.green}`; for splits or columns where the headline pairs with body, use `{colors.black}`.
3. Any new body uses Space Grotesk at 13–16px (or 14–18px for lead body). Line-height 1.6–1.7. Don't enlarge body beyond 18px.
4. Any new eyebrow label uses `{typography.label-eyebrow}` (Bebas Neue, 14–18px, 0.2em tracking) in `{colors.green}` for the most-emphasized eyebrow; switch to `{typography.label-spaced}` (Space Grotesk weight 600, 0.25em tracking) for secondary labels.
5. Any new card uses a 3px solid black border on white-cream or khaki background. For hero callouts, add the 12px-offset green slab via `::before` (`{components.card-offset}`).
6. Any new editorial column may carry a drop cap — green Bebas Neue, floated left, line-height 0.8. Drop caps are the editorial fingerprint.
7. Any new statement / quote slide pairs a Bebas Neue uppercase quote with a Caveat hand-script byline. The byline is not optional.
8. Any collage composition uses 3px-bordered collage pieces at small rotations (-5° to +5°), with translucent tape pieces at sharp angles overlapping the joints. Cycle backgrounds: green, white-cream, khaki-dark, black-inverted.
9. Any tabular ledger uses the `{components.ledger-row}` pattern with header underline at 1.5px and body row dividers at 1px hairline. Categorical tags use mono-font `{components.chip}` in green or the categorical chip palette.
10. Status / approval stamps use `{components.stamp-mark}` — black background, green text, green 2px border, rotated -8°. Reserve for moments that earn a stamp; overuse degrades the signal.

## Known Gaps

- The system loads three Google Fonts (Bebas Neue, Caveat, Space Grotesk) from a CDN. Bebas Neue is single-weight (400 only); attempting to use a heavier weight will fall back. Self-hosting is recommended for production.
- The grain overlay is an inline SVG data URI with `feTurbulence` — rendering will vary slightly across browsers, especially older Safari and Firefox versions.
- The paper-on-paper offset block depends on a `::before` pseudo-element with `z-index: -1`. Cards must have `position: relative` and the parent must not clip overflow, or the offset slab will be cut off.
- The chip color extension on ledger rows uses red / pink / orange / blue / green — pulled in only for categorical tagging inside tables. These colors are not part of the general system palette and should not appear elsewhere in a slide composition.
- The Caveat hand-script face has a strong cultural register (casual American handwriting). It does not pair well with non-Latin scripts; a CJK or Cyrillic deck would need a different hand-script substitution.
- The `body:hover` fade-in on the nav hint does not trigger on touch devices, which means mobile users may never see the nav hint. Treat the hint as desktop-only chrome.
- The closing slide uses a `{colors.black}` background with `{colors.bg}` (khaki) text. The grain overlay still applies but is much less visible at 0.07 opacity over black — the print register is weaker on the closing slide than on khaki-background slides.
- The form-field RSVP card uses hand-drawn underscores (`_________`) as the "blank line" — these are character-based, not rendered as actual `<input>` underlines, and will not align perfectly across system fonts.
