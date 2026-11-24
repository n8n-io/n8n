---
version: alpha
name: Capsule
description: A playful editorial system built on pill-shaped containers, a sun-bleached cream canvas, and a nine-color candy palette. Bodoni Moda serif headlines pair with Space Grotesk body to suggest a literary magazine that took a holiday at a 1970s ice-cream parlor. Every container that holds text is a pill (border-radius 9999px) outlined with a 2px ink stroke, casting a soft 6–12px offset shadow. The aesthetic is "Memphis-meets-editorial" — confident typography, generous bordered shapes, and decorative floating pills as atmospheric wallpaper.

colors:
  cream: "#F5F5F0"
  ink: "#1A1A1A"
  outline: "#1E1E1E"
  white: "#FFFFFF"
  coral: "#E85D4E"
  lime: "#C4D94E"
  lavender: "#C5B5E0"
  sky: "#8BB4F7"
  violet: "#A06CE8"
  yellow: "#F2D160"
  peach: "#F5B895"
  mint: "#A8E6CF"
  shadow: "rgba(26, 26, 26, 0.08)"

color-aliases:
  bg: cream
  fg: ink
  outline: outline                  # same hue family as ink; reserved for stroke role

typography:
  display:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(3rem, 8vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.02em
  closing-display:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: -0.03em
  headline:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.02em
  section-headline:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(1.8rem, 3.5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.01em
  quote-display:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(1.6rem, 3.5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  card-headline:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
  stat-number:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.03em
  orbit-numeral:
    fontFamily: "Bodoni Moda, serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.55
  subtitle:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(0.8rem, 1.5vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.15em
    textTransform: uppercase
  pill-text-md:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.12em
    textTransform: uppercase
  pill-text-sm:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.1em
    textTransform: uppercase
  label:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
    textTransform: uppercase
  mini-label:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.08em
    textTransform: uppercase

spacing:
  pad-lg: "3rem 4rem"
  pad-md: "2rem"
  gap-xl: "4rem"
  gap-lg: "3rem"
  gap-md: "2rem"
  gap-sm: "1.5rem"
  gap-xs: "0.75rem"
  card-pad: "2.5rem 2rem"
  pill-pad-lg: "1.5rem 3.5rem"
  pill-pad-md: "1rem 2.5rem"
  pill-pad-sm: "0.4rem 1.2rem"
  pill-pad-xs: "0.35rem 1rem"

canvas:
  width: 100vw
  height: 100vh

components:
  pill:
    borderRadius: 9999px
    border: "2px solid {colors.outline}"
    fontFamily: "Space Grotesk, sans-serif"
    fontWeight: 500
    letterSpacing: 0.02em
    whiteSpace: nowrap
    description: "The universal container shape. Any text container — chip, button, label, statement-highlight, stat tile, card, bar — is a pill with 2px outline. Background can be any palette accent or white."
  pill-card:
    background: "{colors.white}"
    border: "2px solid {colors.outline}"
    borderRadius: "2rem"
    padding: "{spacing.card-pad}"
    boxShadow: "8px 8px 0 {colors.shadow}"
    description: "Larger pill-shaped card (slightly squared corners at 2rem rather than full pill) for content blocks. Always white background, always shadowed."
  stat-pill:
    background: "{colors.white}"
    border: "2px solid {colors.outline}"
    borderRadius: "2rem"
    padding: "2rem 1.5rem"
    boxShadow: "6px 6px 0 {colors.shadow}"
    description: "Stat tile — pill-shaped white card containing a colored stat number, label, and a tiny accent bar."
  bar-track:
    height: 36px
    background: "{colors.cream}"
    border: "2px solid {colors.outline}"
    borderRadius: 9999px
    overflow: hidden
    description: "Horizontal bar chart track shaped as a pill. Fills use the candy palette."
  bar-fill:
    height: "100%"
    borderRadius: 9999px
    borderRight: "2px solid {colors.outline}"
    description: "Inner bar pill with the value label printed at right edge inside the fill."
  accent-line:
    width: 60px
    height: 4px
    background: "{colors.coral}"
    borderRadius: 9999px
    description: "Pill-shaped 60×4 accent rule. Default color coral; closing-context variant uses 80×4."
  card-icon:
    width: 60px
    height: 60px
    borderRadius: "50%"
    border: "2px solid {colors.outline}"
    fontFamily: "Bodoni Moda, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    description: "Circular pill icon (60px) used as a card mark. Background is an accent color; contains a 1–3 character Roman numeral or letter."
  step-node:
    width: 56px
    height: 56px
    borderRadius: "50%"
    border: "2px solid {colors.outline}"
    background: "{colors.white}"
    fontFamily: "Bodoni Moda, serif"
    fontSize: "1.3rem"
    fontWeight: 700
    boxShadow: "4px 4px 0 {colors.shadow}"
    description: "Circular pill node (56px) used as a timeline step or sequence marker. Step accent color appears as filled-pill class on the node."
  orbit-center:
    width: 160px
    height: 160px
    borderRadius: "50%"
    background: "{colors.lime}"
    border: "2px solid {colors.outline}"
    fontFamily: "Bodoni Moda, serif"
    fontSize: "2.5rem"
    fontWeight: 700
    description: "Large circular pill (160px) used as the gravitational anchor of an orbit composition. Default fill lime; small satellite pills orbit around it."
  diagram-node:
    borderRadius: 9999px
    border: "2px solid {colors.outline}"
    padding: "1rem 2rem"
    boxShadow: "6px 6px 0 {colors.shadow}"
    background: "{colors.white}"
    description: "Flow-diagram node — pill-shaped container with shadow. Connected by 50×4 ink connectors with triangular arrowheads."
  diagram-connector:
    width: 50px
    height: 4px
    background: "{colors.outline}"
    description: "Solid 50×4 ink bar with a triangular arrowhead at the right end, connecting two diagram nodes inline."
  visual-frame:
    borderRadius: "2rem"
    border: "2px solid {colors.outline}"
    boxShadow: "12px 12px 0 {colors.shadow}"
    description: "Large image/illustration frame — slightly squared pill (2rem radius) with thicker 12px offset shadow. Often filled with a tri-stop linear gradient and a dot-pattern overlay."
  grain-overlay:
    position: fixed
    inset: 0
    pointerEvents: none
    zIndex: 9999
    opacity: 0.04
    mixBlendMode: multiply
    backgroundImage: "fractalNoise SVG"
    description: "Subtle film-grain noise overlay applied to the entire viewport at 4% opacity in multiply blend mode. Always present, never absent."
  radial-glow:
    description: "Soft radial gradient wash anchored to a corner or center of a slide background. Uses one of the candy palette colors at 6–15% opacity, blended into the cream canvas. Provides atmospheric warmth without changing the surface color."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Capsule is a **playful editorial system** whose defining structural premise is the **pill**: every text container is a pill, every icon is a pill, every bar is a pill, every node in a diagram is a pill. The `border-radius: 9999px` rule applies to virtually all UI elements, with larger panels softening to a 2rem radius. Combined with the 2px ink outline that wraps every shape, the result is a system where containers feel inflated, friendly, and graphically distinct — a nod to Memphis design and late-70s ice-cream-parlor signage without abandoning editorial discipline.

The typeface stack is a deliberate two-face conversation. **Bodoni Moda** — a high-contrast didone serif — carries every display moment, every section headline, every stat numeral, every card title, every quote. Bodoni's tall capitals and thin-thick stroke contrast give the headlines their editorial weight and a touch of fashion-magazine glamour. **Space Grotesk** — a contemporary geometric sans — carries every body paragraph, every label, every pill text, every subtitle. The serif/grotesk pairing creates the system's primary typographic rhythm: glamorous serif statements + clean grotesk supporting structure.

The palette runs nine colors plus three neutrals. The canvas is `{colors.cream}` — a warm sun-bleached off-white that signals "magazine paper" rather than "screen white." The ink is `{colors.ink}`, used for body text, headlines, and the universal outline. The seven candy accents — `{colors.coral}`, `{colors.lime}`, `{colors.lavender}`, `{colors.sky}`, `{colors.violet}`, `{colors.yellow}`, `{colors.peach}`, plus `{colors.mint}` — are interchangeable. They fill pills, color stat numbers, fill bar charts, and float as decorative atmosphere. There is no semantic mapping: no color means "warning," none means "success." Each accent is chosen for compositional balance, not meaning.

Depth comes from **soft hard-offset shadows** at 4px, 6px, 8px, and 12px in a low-opacity ink color (`{colors.shadow}` = `rgba(26, 26, 26, 0.08)`). Unlike a true brutalist shadow, these are slightly transparent — they read as "lifted" rather than "stamped." Combined with the 2px outline, every pill feels like it's floating just above the cream canvas. There is no use of blurred drop shadows; the offset is always solid, always to the bottom-right.

**Density philosophy: medium-high atmospheric.** Capsule slides feel populated. The system is built around the idea that decorative floating pills should orbit the actual content as wallpaper — small colored pills tilted at 5–25° rotations across the slide background, each containing a single uppercase word. These atmospheric pills are non-functional; they are typographic confetti. A correctly composed slide pairs one or two substantive content blocks (a pill-card, a stat grid, a diagram) with 5–8 floating decorative pills around the edges. A slide that feels broken in Capsule is one with empty corners or unrelieved cream space — the candy palette wants to participate even where the content doesn't strictly require it.

**Key Characteristics:**
- Universal pill geometry — `border-radius: 9999px` for small containers, 2rem for larger cards/frames.
- 2px solid `{colors.outline}` stroke wraps every pill, icon, and card.
- Bodoni Moda serif for every display/headline/stat; Space Grotesk sans for every body/label/pill text.
- Sun-bleached cream canvas `{colors.cream}` with soft radial glows in candy accent colors at 6–15% opacity for background atmosphere.
- Hard-offset shadows in low-opacity ink (`{colors.shadow}`) at 4/6/8/12px offsets, always solid, always bottom-right.
- Nine-color candy accent palette used interchangeably — no semantic mapping.
- Decorative floating pills tilted at 5–25° rotations populate slide backgrounds as atmospheric wallpaper.
- A persistent fractal-noise grain overlay (4% opacity, multiply blend) sits over the entire viewport at all times.
- Full-screen vertical nav-dot column at right, mono slide counter at bottom-right.

## Colors

### Canvas & Ink
- **Cream** (`{colors.cream}` — #F5F5F0): The canvas. Warm sun-bleached off-white. Used as default slide background, default bar-track interior, and any neutral region that wants paper warmth without being pure white.
- **Ink** (`{colors.ink}` — #1A1A1A): The primary text color. Used for headlines, body, and (under the alias `outline`) the universal stroke.
- **Outline** (`{colors.outline}` — #1E1E1E): Functionally identical to ink; reserved as the stroke color on every pill, card, icon, and frame for semantic clarity.
- **White** (`{colors.white}` — #FFFFFF): True white. Used as the default fill for pill-cards, stat-pills, diagram nodes, and any pill that needs the highest contrast against the cream canvas. White pills always carry the 2px ink outline.

### Candy Accents
- **Coral** (`{colors.coral}` — #E85D4E): Warm orange-red. The most "voice-y" of the accents; used as a default accent-line color, default pill-card icon fill on the first card in a sequence, and the most frequent stat-number color.
- **Lime** (`{colors.lime}` — #C4D94E): Vivid chartreuse-green. Pairs well with coral; default fill for orbit-center anchors and frequent stat-number color.
- **Lavender** (`{colors.lavender}` — #C5B5E0): Soft lilac-purple. Used as a calming pill fill in headers and as a frequent quote-highlight color.
- **Sky** (`{colors.sky}` — #8BB4F7): Mid-saturation cornflower blue. The default "third accent" — sits comfortably next to coral and lime in a 3-card grid.
- **Violet** (`{colors.violet}` — #A06CE8): Deeper purple. Used when a slide already has lavender as one accent and needs a second purple-family pop.
- **Yellow** (`{colors.yellow}` — #F2D160): Warm marigold. The default fill for title pills, closing pills, and any pill that should read as "important / featured."
- **Peach** (`{colors.peach}` — #F5B895): Pale apricot. The softest accent; used in floating decorative pills and circular decorative spots.
- **Mint** (`{colors.mint}` — #A8E6CF): Pale aqua-green. Used most often inside the linear-gradient visual frame and in lower-emphasis decorative pills.
- **Shadow** (`{colors.shadow}` — `rgba(26, 26, 26, 0.08)`): The universal soft hard-offset shadow color. Never use a different shadow color.

### Defaults
- **Default slide surface**: `{colors.cream}`.
- **Default headline color**: `{colors.ink}` — Bodoni serif headlines are always ink, never colored. Color appears only on stat numerals and inside accent pills.
- **Default body text color**: `{colors.ink}` rendered at opacity 0.6–0.7 to soften it against the cream canvas.
- **Default outline color**: `{colors.outline}` (≈ ink) — 2px on every pill/card/icon, no exceptions.
- **Default card fill**: `{colors.white}`.
- **Default accent-line color**: `{colors.coral}`.
- **Default title-pill fill**: `{colors.yellow}`.
- **Default closing-pill fill**: `{colors.yellow}`.
- **Default orbit-center fill**: `{colors.lime}`.
- **Default first accent in a 3- or 4-accent sequence**: coral → lime → sky → violet (rotated when more colors are needed). The sequence is the system's "Roy G. Biv"; it gives the agent a deterministic order to reach for so the candy palette doesn't feel random.
- **Default decorative pill background opacity**: full saturation (no fading). The floating pills are loud on purpose.

Accent colors have no semantic role. Choose accents based on warm/cool balance and adjacency, not meaning. When three accents appear together, pair a warm (coral/yellow/peach) with a cool (sky/lavender/violet/mint) with a neutral-bright (lime). Avoid placing two same-family accents adjacent (two purples, two greens, two warms).

## Typography

### Font Family
The system runs on a **two-face conversation**: `Bodoni Moda` (serif, weights 400–900, opsz axis) carries every display and headline; `Space Grotesk` (sans, weights 300–700) carries every body, label, and pill text. There is no third face. Both families are loaded from Google Fonts at variable-axis weights.

Bodoni Moda's high contrast and didone modulation give the system its editorial-glamour register; the thin-thick stroke contrast is most pronounced at large sizes, so display weights should always be 700+ to maintain stroke presence. Space Grotesk's geometric grotesque carries clean, modern body — it never tries to compete with the Bodoni headlines.

An inline `<em>` inside a Bodoni headline keeps Bodoni and shifts to italic. A `quote-highlight` inside a Bodoni quote body switches the wrapped word to a pill (Space Grotesk uppercase pill text on a candy fill) for visual emphasis.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | clamp(3rem, 8vw, 7rem) | Bodoni Moda | 800 | Largest cover/title display |
| `{typography.closing-display}` | clamp(2.5rem, 6vw, 5rem) | Bodoni Moda | 800 | Conclusive declarative headline |
| `{typography.headline}` | clamp(2rem, 4vw, 3.5rem) | Bodoni Moda | 700 | Primary slide headline on split or two-column layouts |
| `{typography.section-headline}` | clamp(1.8rem, 3.5vw, 3rem) | Bodoni Moda | 700 | Section-opening or centered headline above cards/charts |
| `{typography.quote-display}` | clamp(1.6rem, 3.5vw, 3rem) | Bodoni Moda | 600 | Pull-quote body |
| `{typography.card-headline}` | 1.5rem | Bodoni Moda | 700 | Card or pillar-block title |
| `{typography.stat-number}` | clamp(2rem, 3.5vw, 3rem) | Bodoni Moda | 800 | Large numerical stat figure |
| `{typography.orbit-numeral}` | 2.5rem | Bodoni Moda | 700 | Centered ordinal inside the orbit-center circle |
| `{typography.body}` | clamp(0.95rem, 1.2vw, 1.15rem) | Space Grotesk | 400 | Paragraph body |
| `{typography.body-sm}` | 0.9rem | Space Grotesk | 400 | Compact body inside a card |
| `{typography.subtitle}` | clamp(0.8rem, 1.5vw, 1.1rem) | Space Grotesk | 400 | Uppercase tracked subtitle below a display headline |
| `{typography.pill-text-md}` | 0.85rem | Space Grotesk | 600 | Text inside title/closing pills |
| `{typography.pill-text-sm}` | 0.7rem | Space Grotesk | 600 | Text inside small floating decorative pills |
| `{typography.label}` | 0.75rem | Space Grotesk | 500 | Header tag pills, attribution lines |
| `{typography.mini-label}` | 0.65rem | Space Grotesk | 500 | Mini-pill chips in a tag cluster |

### Defaults
- **Default size for the primary section headline**: `{typography.section-headline}` (clamp 1.8–3rem). For two-column or split layouts, `{typography.headline}` (clamp 2–3.5rem).
- **Default size for a cover or opening display moment**: `{typography.display}` (clamp 3–7rem).
- **Default size for paragraph body**: `{typography.body}` (clamp 0.95–1.15rem).
- **Default size for any inline label or chip**: `{typography.label}` (0.75rem).
- **Default weight for any Bodoni display element**: 700 minimum; 800 for the largest display.
- **Default weight for any Space Grotesk body element**: 400.
- **Default size for a hero stat figure**: `{typography.stat-number}` (clamp 2–3rem).

When unsure, reach for `{typography.section-headline}` for the slide's primary text moment, not `{typography.card-headline}` (which is for block-level titles within a card).

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every display, headline, stat-number, card-headline, and quote-display element is set in Bodoni Moda.** Space Grotesk does not appear in any display role.
- **Every body, subtitle, pill-text, label, and chip element is set in Space Grotesk.** Bodoni does not appear in body or chip roles.
- **Every Bodoni display element uses negative letter-spacing** (-0.01em to -0.03em). Bodoni at large sizes with default tracking reads loose.
- **Every Space Grotesk subtitle, label, pill-text, and chip element is uppercase with 0.08em+ tracking.** The uppercase + tracking is the small-text identity signal.
- **Bodoni headlines are always rendered in `{colors.ink}`, never in a candy color.** Color appears on stat numerals (e.g., `color: {colors.coral}`) but not on serif headlines. The exception is the orbit-center numeral, which sits inside a colored circular pill but the numeral itself remains ink.
- **Every pill element carries the 2px solid outline.** A pill without its 2px ink stroke breaks the system.
- **Every container with `border-radius: 9999px` or `2rem` carries either the 2px outline or sits inside an already-outlined parent.** Unoutlined rounded containers do not exist.
- **Every card or elevated pill carries a hard-offset shadow** at 4/6/8/12px in `{colors.shadow}`. Smaller pills get 4–6px; cards get 8px; visual frames get 12px.

### Typography Principles
The Bodoni-headline + Space-Grotesk-body pairing is the primary rhythm; switching either face breaks the system. Italic appears only inside pull-quote bodies via the `<em>` tag (Bodoni italic). Underline is not used. Pill-encapsulation is the system's primary emphasis mechanism: wrapping a phrase in a candy-filled pill is the equivalent of bold-italicizing it in a traditional editorial system.

Line-height tightens at scale: `{typography.display}` at 0.9, `{typography.headline}` at 1.05, body at 1.6. The tight display + open body contrast is what gives the system its editorial breathing rhythm.

## Layout

### Canvas System
The canvas is `100vw × 100vh` — full viewport with hidden overflow. Each `.slide` is absolutely positioned to fill the viewport, with one slide carrying `.active` (opacity 1) at a time. Transitions are 0.6s opacity fades via `cubic-bezier(0.4, 0, 0.2, 1)`. All sizes use rem units inside CSS `clamp()` so the layout scales fluidly.

### Padding and Gap Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-lg}` | 3rem 4rem | Default slide outer padding |
| `{spacing.gap-xl}` | 4rem | Major two-column gutter |
| `{spacing.gap-lg}` | 3rem | Section-block spacing |
| `{spacing.gap-md}` | 2rem | Standard inter-element spacing |
| `{spacing.gap-sm}` | 1.5rem | Tight card-internal spacing |
| `{spacing.gap-xs}` | 0.75rem | Inline gap between mini-pills |
| `{spacing.card-pad}` | 2.5rem 2rem | Default pillar-card padding |
| `{spacing.pill-pad-lg}` | 1.5rem 3.5rem | Title-pill / closing-pill padding |
| `{spacing.pill-pad-md}` | 1rem 2.5rem | Featured pill padding |
| `{spacing.pill-pad-sm}` | 0.4rem 1.2rem | Header-tag pill padding |
| `{spacing.pill-pad-xs}` | 0.35rem 1rem | Mini-pill chip padding |

### Atmospheric Background Layer
Every slide layers two atmospheric treatments on top of the cream canvas:
1. **Radial glows** — one to three soft `radial-gradient(ellipse at X% Y%, rgba(accent, 0.06–0.15), transparent)` washes anchored to corners or center. These tint the canvas warmly without changing its surface color.
2. **Grain overlay** — a fractal-noise SVG fixed at `inset: 0`, opacity 0.04, mix-blend-mode multiply, z-index 9999. Always present, always identical, never removed.

These are not decorative options; they are baseline canvas treatments that should appear on every slide.

### Decorative Pill Wallpaper
A signature: small decorative pills (60–160px wide, 35–90px tall) tilted at -20° to +25° rotations are placed absolutely on slide backgrounds as atmospheric typographic confetti. Each contains a single uppercase Space-Grotesk word and a candy fill. Some are circular (border-radius 50%) instead of capsule-shaped. They have no informational role — they are visual atmosphere. Typical count: 5–8 per slide on cover/closing/quote layouts; 0 on dense data layouts.

## Depth and Elevation

### Soft Hard-Offset Shadow
The system's only depth technique is a **solid hard-offset shadow** in low-opacity ink:
- **4px 4px 0** — small elevated nodes (step nodes, small pills).
- **6px 6px 0** — orbit pills, stat-pills, diagram nodes.
- **8px 8px 0** — pillar-cards, chart container.
- **12px 12px 0** — large visual frame (the most lifted element in the system).

All shadows use `{colors.shadow}` (`rgba(26, 26, 26, 0.08)`). The opacity is the key distinction from a brutalist hard shadow: at 8% the shadow reads as a soft lift rather than a stamped offset. The offset direction is always bottom-right.

### Outline-Based Depth
Most apparent depth comes from the 2px ink outline that wraps every pill against the cream canvas. The outline does much of the elevation work; the shadow adds the lift on cards and elevated pills.

### Flat Decorative Layer
Decorative floating pills and radial glows are flat — they cast no shadow. The shadow is reserved for content-bearing containers (cards, stat tiles, diagram nodes, visual frames). This visual rule separates "content" from "atmosphere" at a glance.

## Shapes and Treatment

### Border Radius
| Value | Use |
|---|---|
| 9999px (full pill) | All small pills: title pill, closing pill, decorative pills, header tags, mini chips, bar tracks, bar fills, accent lines, orbit pills, floating pills, quote highlights, diagram nodes |
| 2rem (32px) | Larger cards: pillar-cards, stat-pills, chart container, visual frame |
| 1.5rem (24px) | Inner dashed frame inside the visual frame |
| 50% (circle) | Circular pills: card-icon (60px), step-node (56px), orbit-center (160px), nav dots (10px) |
| 0 | The grain overlay; the slide itself; the candy-color gradient regions inside a visual frame |

The system has **no sharp-cornered text containers**. Every container that holds text or icon content is rounded.

### Border Weights
- **2px solid `{colors.outline}`** — the universal stroke. Used on every pill, card, icon, frame, bar track, nav dot.
- **2px dashed `{colors.outline}`** — used only on the inner frame inside the visual-frame component (a decorative interior border indicating "image placeholder").
- **4px solid ink** — used only on the timeline-line that connects sequential step nodes horizontally.

All borders are `{colors.outline}`. Colored borders do not exist in the system.

### Decorative Element Types

**Decorative floating pill** — A small (60–160px wide × 35–90px tall) pill or circle in a candy fill, tilted at -20° to +25° rotation, positioned absolutely on the slide background. Contains a single uppercase Space-Grotesk word at 0.55–0.85rem. Functions as typographic confetti / atmospheric wallpaper. Five to eight per declarative slide.

**Header tag pill** — A small (≈0.7rem text) pill in a candy fill (typically lavender) with `pill-pad-sm` padding, centered above a section headline. The system's section-tag chip.

**Title pill / closing pill** — A medium pill (`pill-pad-lg`) in `{colors.yellow}` carrying uppercase Space-Grotesk text. Placed above the largest display headline on cover and closing slides.

**Pillar-card** — A 2rem-radius white card with 2px outline and 8px offset shadow, containing a circular `card-icon` at the top, a Bodoni `card-headline`, and a Space-Grotesk body paragraph. Used in 3-card and 4-card grids.

**Stat-pill** — A 2rem-radius white card containing a colored Bodoni stat number, a small uppercase label, and a tiny 40×4 accent bar at the bottom. Sits in 3- or 4-column stat grids.

**Bar-track** — A 36px-tall horizontal pill (9999px radius) with 2px outline and cream interior. The fill is a child pill in a candy color with the value label printed at the right edge inside the fill.

**Orbit composition** — A central 160px circular pill in `{colors.lime}` carrying a Bodoni ordinal, surrounded by 4–6 small `orbit-pill` satellites in candy fills, each tilted, positioned at 8–45% / 8–45% offsets, with 6px shadows.

**Diagram-node + connector** — Pill-shaped flow node (`diagram-node`) with 6px shadow, connected to the next node by a 50×4 ink bar with a triangular arrowhead. Nodes may carry candy fills; arrows are always ink.

**Visual-frame** — A 2rem-radius large frame with 12px offset shadow, filled with a tri-stop linear gradient (typically lavender → sky → mint), overlaid with a dot-grid pattern at 0.15 opacity, with an inner dashed border indicating "image placeholder." Used for hero visual moments.

**Quote-highlight** — An inline pill in lime or sky with 2px outline, wrapped around a single phrase inside a Bodoni quote body. The system's primary inline emphasis mechanism.

**Accent line** — A 60×4 (or 80×4 on closing slides) horizontal pill in `{colors.coral}` used as a sub-headline accent rule.

## Do's and Don'ts

### Do
- Make every text container a pill — 9999px radius for small pills, 2rem radius for larger cards. The pill geometry is the system's most distinctive single trait.
- Apply the 2px `{colors.outline}` stroke to every pill, card, icon, and frame. The outline is what makes the candy palette read as graphic rather than candy.
- Set every Bodoni display element in `{colors.ink}`, never in a candy color. Color belongs on stat numerals and pill fills, not on serif headlines.
- Use Bodoni Moda for every headline/stat/card title; use Space Grotesk for every body/label/pill. The two-face split is non-negotiable.
- Render shadows as solid hard offsets at 4/6/8/12px in `{colors.shadow}` (`rgba(26,26,26,0.08)`). Never blur; never re-color.
- Populate slide backgrounds with 5–8 floating decorative pills tilted at -20° to +25° rotations on cover, closing, quote, and other declarative layouts. The wallpaper-pill treatment is a system signature.
- Layer radial-gradient accent glows (6–15% opacity) into the cream canvas on every slide for atmospheric warmth.
- Keep the grain overlay (4% opacity, multiply blend) active on every slide — it is a baseline layer, not optional decoration.
- Wrap inline emphasis phrases in `quote-highlight` pills (lime, sky, or another candy) inside Bodoni quote bodies, rather than bolding or italicizing.
- Pair warm + cool accents adjacently: coral with sky, yellow with lavender, peach with mint. Avoid two same-family accents next to each other.

### Don't
- Don't render any text container with sharp corners. Square text containers do not exist in Capsule.
- Don't render a pill, card, or icon without the 2px ink outline. The stroke is the system's identity.
- Don't render Bodoni headlines in a candy color. Headlines are always `{colors.ink}`; color lives on stat numerals and pill fills.
- Don't use blurred drop shadows. The shadow is always solid offset at 4/6/8/12px in `{colors.shadow}`.
- Don't pair Bodoni with a different sans companion. The Bodoni Moda + Space Grotesk pairing is fixed.
- Don't use uppercase on Bodoni headlines. Bodoni in this system is sentence case (or true title case for proper nouns).
- Don't use sentence case on Space Grotesk subtitles, labels, or pill text. Small Space Grotesk text is always uppercase + 0.08em tracking.
- Don't introduce a tenth accent color. The nine candy accents are the closed palette.
- Don't apply shadows to decorative floating pills. Shadows are reserved for content-bearing containers.
- Don't leave a slide's corners empty on declarative layouts. The cream canvas wants atmospheric pills or radial glows; bare corners read as broken.

## Responsive Behavior

Capsule is a viewport-fluid 1920×1080 presentation system using `clamp()` and viewport-relative units throughout. There is a single `@media (max-width: 900px)` breakpoint that collapses grid columns to single-column stacks and hides the nav-dot column; below 600px the stats grid further collapses from 2-col to 1-col. The system is otherwise responsive without breakpoints.

### Scaling Behavior
- Display headline scales from 3rem at minimum viewport to 7rem at maximum.
- Body text scales from 0.95rem to 1.15rem.
- Padding scales via `clamp` inside individual layout selectors.
- Borders, pill outlines, shadow offsets, and grain overlay are fixed and do not scale.

### Presenter Behavior
- Slides advance via `ArrowRight`, `ArrowDown`, or `Space`.
- Slides reverse via `ArrowLeft` or `ArrowUp`.
- `Home` jumps to the first slide; `End` to the last.
- Touch swipe (horizontal): swipe distance >50px advances or reverses.
- The active slide carries `.active` (opacity 1); non-active slides are opacity 0 + pointer-events none.
- Nav dots are a vertical column at the right edge; the slide counter is at bottom-right; a keyboard hint is at bottom-left.

### Print / Export
Not explicitly handled; opacity-toggling means a naïve print captures only the active slide. Export workflows should snapshot each slide individually at 1920×1080.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin font | Recommended Chinese pairing | Source |
|---|---|---|---|
| Display / Headline (Bodoni Moda 700–800) | Bodoni Moda | 站酷小薇体 ZCOOL XiaoWei | Google Fonts |
| Body / Pill text (Space Grotesk 400–600) | Space Grotesk | 悠哉字体 Yozai | cn-fontsource CDN |

### Mixed-Content Strategy

Use **Strategy A — single-font-stack with fallback**: declare the CJK font *after* the Latin font in the same `font-family` stack so Latin glyphs render in Bodoni Moda / Space Grotesk and CJK glyphs fall through to the Chinese face automatically. One CSS rule per role, no manual class switching.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Space+Grotesk:wght@300..700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/cn-fontsource-yozai-regular/font.css" rel="stylesheet">
```

```css
:root {
  --font-display: "Bodoni Moda", "ZCOOL XiaoWei", serif;
  --font-body: "Space Grotesk", "Yozai", sans-serif;
}
```

### Universal CJK Adjustments

- **Line-height**: bump CJK body line-height to ~1.7 (from 1.6) — Hanzi need more vertical breathing than Latin lowercase.
- **Letter-spacing**: zero out `letter-spacing` on Hanzi runs (negative tracking that flatters Bodoni capitals jams Hanzi strokes together). Keep tight tracking only on Latin spans.
- **Text-transform**: drop `text-transform: uppercase` on any pill/label/subtitle when content is Hanzi — Chinese has no case; forcing uppercase does nothing for Hanzi but breaks the rendering of any mixed Latin acronyms inside.
- **Punctuation**: use Chinese full-width punctuation (，。：；「」) for Chinese sentences, half-width (`,.:;""`) for Latin. Never mix half-width punctuation into a Chinese sentence.
- **No period on headlines**: Chinese headline convention omits the terminal 。 — strip it from display strings.
- **Pangu spacing**: insert a thin space (or a regular space) between adjacent Hanzi and Latin/digit runs (e.g. `2026 年`, `AI 产品`). Improves readability of mixed runs.
- **One font per sentence**: don't switch CJK families mid-sentence. Pick ZCOOL XiaoWei *or* Yozai for a given text run based on its role, never both inside one phrase.

### Aesthetic Notes

ZCOOL XiaoWei is a high-contrast literary serif-leaning Hanzi face whose thin-thick stroke modulation echoes Bodoni Moda's didone register — it gives display headlines the same editorial-glamour weight as the Latin original. Yozai is a friendly rounded Hanzi sans whose open counters and modest stroke contrast mirror Space Grotesk's geometric grotesque, so pill text, labels, and body paragraphs retain the "clean modern sans" feel rather than reverting to a stiff system Hanzi. Both pair cleanly with the candy palette: ZCOOL XiaoWei in `{colors.ink}` keeps the rule "Bodoni headlines are never colored" intact, and Yozai sits inside coral / lime / yellow pills without losing legibility against the 2px ink outline. The decorative floating pill wallpaper still works in Chinese — substitute single-character or two-character atmospheric words (愿景, 未来, 下一步) for the English uppercase confetti.

### Known CJK Gap

ZCOOL XiaoWei is a display face with limited weight axis (single weight) and a smaller glyph set than Noto family — exotic or technical Hanzi (rare surnames, classical characters, simplified-only variants outside GB2312) may fall back to system font. For Traditional Chinese decks, swap Yozai for `LXGW WenKai TC` (Google Fonts) which has fuller TC coverage and a similar friendly humanist register. The ZCOOL XiaoWei italic / heavy moments that Bodoni achieves via the opsz axis have no equivalent in the Chinese face — use scale and color to compensate when Latin would have leaned on italic Bodoni.

## Iteration Guide

1. Any new container that holds text uses the pill geometry — 9999px radius for small, 2rem radius for cards. Don't introduce a sharp-cornered text container.
2. Any new pill carries the 2px solid `{colors.outline}` stroke. Don't render an unstroked pill.
3. Any new headline uses Bodoni Moda in `{colors.ink}`. Don't color a serif headline; don't switch to Space Grotesk for display.
4. Any new card carries a `8px 8px 0 {colors.shadow}` offset shadow (4px for small nodes, 12px for the visual frame). Don't blur; don't re-color.
5. Any new accent uses the nine-color candy palette in the coral → lime → sky → violet → yellow → lavender → peach → mint default sequence. Don't introduce a tenth color.
6. Any new declarative slide (cover, closing, quote, statement) gets 5–8 floating decorative pills as atmospheric wallpaper.
7. Any new data slide gets one or two radial accent glows in the canvas background. Don't leave the cream surface flat.
8. Any inline emphasis inside a Bodoni quote body uses a `quote-highlight` pill. Don't bold; don't italicize except via the Bodoni italic axis inside `<em>`.
9. New components inherit the pill geometry + 2px outline + 4–12px shadow pattern. If a new component breaks any of these three rules, redesign it before adding it.

## Known Gaps

- Two Bodoni font axes (italic and opsz 6..96) are loaded but the template only exercises the upright axis at fixed sizes; the optical-size variation across display sizes is not explicitly opted into.
- Bar-chart values are inline-styled via `style="width: NN%"` — there is no data-binding layer.
- The decorative floating pill positions and rotations are all hand-tuned via inline style on each instance; there is no generative placement system.
- The visual-frame's tri-stop gradient (lavender → sky → mint) is a hardcoded "default" — alternate gradient combinations are valid but need to be authored per instance.
- The grain overlay uses an inline SVG data URL; replacing or removing it requires editing the markup, not a CSS variable.
- The chart-bar-fill border-right at 2px solid outline is what gives bars their pill-end-cap definition; removing it loses the pill aesthetic on bars.
- The system inherits all 9 candy accent CSS variables but only ~6 are actively used across the source — peach and mint are present in the palette but used sparingly. They are available for new compositions.
- Decorative floating pills include their text content as part of the visual identity (single uppercase Space-Grotesk words). The words are not informational; new compositions should pick neutral single-word atmospheres ("VISION", "FUTURE", "NEXT", etc.) rather than content-specific text.
