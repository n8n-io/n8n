---
version: alpha
name: Grove
description: A quiet, editorial-serif presentation system in the register of a well-bound monograph or boutique brand book. Playfair Display at weight 400 (never bold) carries every headline, italicized in terracotta coral for accent emphasis as the signature move. Jost weight 300 carries every paragraph as the "good paper" body face. JetBrains Mono at weight 300 holds labels, kickers, and the thin chrome bars. The palette pairs a deep forest green canvas (#192b1b) with warm cream text (#d4cfbf) and a single terracotta coral accent (#c8524a). Generous negative space, hairline 1px borders, and a near-invisible serif watermark numeral give it the calm authority of a literary journal.

colors:
  bg: "#192b1b"
  bg-alt: "#1e3221"
  bg-light: "#e8e4d6"
  bg-light-alt: "#dedad0"
  fg: "#d4cfbf"
  fg-2: "rgba(212, 207, 191, 0.6)"
  fg-3: "rgba(212, 207, 191, 0.32)"
  fg-light: "#192b1b"
  fg-light-2: "rgba(25, 43, 27, 0.58)"
  fg-light-3: "rgba(25, 43, 27, 0.33)"
  accent: "#c8524a"
  border: "rgba(212, 207, 191, 0.12)"
  border-light: "rgba(25, 43, 27, 0.14)"
  watermark-dark: "rgba(212, 207, 191, 0.06)"
  watermark-light: "rgba(25, 43, 27, 0.06)"

color-aliases:
  fg-light: bg
  fg-light-canonical: "fg-light shares hex #192b1b with bg — the green is reused as both surface and primary text-on-light"

typography:
  display:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "10vw"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.01em
  h1:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "5.5vw"
    fontWeight: 400
    lineHeight: 1.1
  h1-statement:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "min(4.5vw, 7.5vh, 88px)"
    fontWeight: 400
    lineHeight: 1.15
  h2:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "3.2vw"
    fontWeight: 400
    lineHeight: 1.2
  h3:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "2vw"
    fontWeight: 400
    lineHeight: 1.3
  quote-text:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "3.2vw"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.01em
    fontStyle: italic
  quote-mark:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "8vw"
    fontWeight: 400
    lineHeight: 0.6
  stat-value:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "4.5vw"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.02em
  grove-num:
    fontFamily: "'Playfair Display', 'Noto Serif SC', Georgia, serif"
    fontSize: "18vw"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.03em
  lead:
    fontFamily: "'Jost', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "1.45vw"
    fontWeight: 300
    lineHeight: 1.65
  body:
    fontFamily: "'Jost', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "1.05vw"
    fontWeight: 300
    lineHeight: 1.75
  body-list-emph:
    fontFamily: "'Jost', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "max(1.4vw, 17px)"
    fontWeight: 300
    lineHeight: 1.6
  caption:
    fontFamily: "'Jost', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "0.82vw"
    fontWeight: 300
    lineHeight: 1.55
  label:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.7vw"
    fontWeight: 300
    letterSpacing: 0.12em
  kicker:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.7vw"
    fontWeight: 300
    letterSpacing: 0.14em
    textTransform: uppercase
  chapter-num:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.7vw"
    fontWeight: 300
    letterSpacing: 0.2em
    textTransform: uppercase
  stat-label:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.7vw"
    fontWeight: 300
    letterSpacing: 0.12em
    textTransform: uppercase

spacing:
  pad-x: "8vw"
  pad-y: "6.5vh"
  pad-quote-x: "calc(8vw * 1.1)"
  pad-quote-y: "calc(6.5vh * 1.2)"
  gap-lg: "4.5vh"
  gap-md: "2.8vh"
  gap-sm: "1.4vh"
  rule-short: "36px"

motion:
  ease-slide: "cubic-bezier(0.77, 0, 0.175, 1)"
  dur-slide: "0.9s"
  ease-enter: "cubic-bezier(0.16, 1, 0.3, 1)"
  dur-enter: "0.7s"
  stagger-delays: "0 / 0.08s / 0.18s / 0.3s / 0.44s / 0.6s / 0.78s"

canvas:
  width: 100vw
  height: 100vh

components:
  slide-chrome:
    description: "Thin top bar separating slide content from the page edge. A flex space-between row holding mono label text on each side, separated below by a 1px hairline in {colors.border} (or {colors.border-light} on light slides). Pads with {spacing.gap-sm} above the rule, then {spacing.gap-md} below before content starts."
    border: "1px solid {colors.border}"
    typography: "{typography.label}"
  slide-foot:
    description: "Matching bottom bar. Flex space-between row holding section name and 'NN / TT' counter, with 1px hairline border-top. The chrome and foot together frame every content slide; cover, chapter, quote, and end slides hide both."
    border: "1px solid {colors.border}"
    typography: "{typography.label}"
  grove-num:
    description: "Massive serif digit placed in the background at very low opacity (6%) as compositional texture. Sits absolutely at right: {spacing.pad-x}, bottom: -0.15em, with pointer-events disabled. The system's signature wallpaper element on chapter and section moments."
    fontSize: "18vw"
    color: "{colors.watermark-dark} on dark / {colors.watermark-light} on light"
  grove-stat:
    description: "Stat card: large Playfair value in {colors.accent}, mono uppercase label beneath, 1px border-bottom hairline. No background fill — the card is defined by the rule and the type ratio alone."
    valueColor: "{colors.accent}"
    valueSize: "4.5vw"
    labelTypography: "{typography.stat-label}"
    borderBottom: "1px solid {colors.border}"
  bullet-list:
    description: "Two-column grid list (2em / 1fr) where the bullet is a coral em-dash glyph rendered in JetBrains Mono, not a CSS bullet. The em-dash is the system's bullet language."
    bulletGlyph: "—"
    bulletColor: "{colors.accent}"
    bulletFont: "'JetBrains Mono', monospace"
  rule-coral:
    width: "{spacing.rule-short}"
    height: "1px"
    background: "{colors.accent}"
    description: "A 36px-wide 1px-tall terracotta coral rule. The compositional beat between a kicker and the headline that follows."
  rule-full:
    width: "100%"
    height: "1px"
    background: "{colors.border} on dark / {colors.border-light} on light"
    description: "Full-width hairline divider. Used between stacked sections inside a slide."
  kicker:
    typography: "{typography.kicker}"
    color: "{colors.accent}"
    description: "Mono uppercase eyebrow in coral, placed above an h1/h2 headline."
  chapter-num:
    typography: "{typography.chapter-num}"
    color: "{colors.accent}"
    marginBottom: "{spacing.gap-md}"
  quote-mark:
    typography: "{typography.quote-mark}"
    color: "{colors.accent}"
    description: "Massive Playfair opening-quote glyph in coral, placed above the italic quote body."
  img-placeholder:
    background: "{colors.bg-alt} on dark / {colors.border-light} on light"
    color: "{colors.fg-3} on dark / {colors.fg-light-3} on light"
    typography: "{typography.label}"
    minHeight: "30vh"
    description: "Image-region marker — solid darker-than-background fill with a mono caption stating the placeholder text. Use this in place of <img> until a real image is available."
  nav-dots:
    position: "fixed"
    placement: "bottom: 24px, horizontally centered"
    dotSize: "5px"
    dotBackground: "rgba(255, 255, 255, 0.22)"
    activeBackground: "rgba(255, 255, 255, 0.8)"
    activeTransform: "scale(1.4)"
    description: "Small white dots at the bottom of the viewport indicating slide position. The fixed counter (#slide-counter) is intentionally disabled — the slide-foot already shows NN / TT."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Grove is a **quiet, editorial-serif presentation system** in the register of a literary monograph or boutique brand book. The foundational premise is restraint: every slide carries one focused content moment surrounded by deep negative space, anchored by thin 1px chrome bars at top and bottom and supported by a small library of compositional beats (coral kicker, 36px coral rule, italic-coral accent, em-dash bullet, near-invisible watermark numeral).

The typographic stack runs four faces, each in a single specific weight:

- **Playfair Display at weight 400** carries every headline, every quote, every stat figure, and every watermark numeral. **Bold serif is not permitted** — the no-bold rule is the system's most important typographic commitment. Italicized Playfair in `{colors.accent}` coral is the signature accent move: `<em>` inside any headline switches to italic coral.
- **Jost at weight 300** carries every paragraph and bullet body. The light weight is the "good paper" feel — it sits back and lets the serif lead.
- **JetBrains Mono at weight 300** carries every label, kicker, footline, slide counter, and stat caption. Always uppercase, always with at least 0.12em letter-spacing.
- **Noto Serif SC / Noto Sans SC at weight 300–500** are loaded as Chinese fallbacks for every role. The deck is built bilingually-aware — Chinese characters render through the Noto cuts when present in the content.

The palette is a tight two-surface system with one accent. Dark slides use `{colors.bg}` (a deep forest green) with `{colors.fg}` (warm cream — never pure white) for body text. Light slides flip to `{colors.bg-light}` (warm parchment) with `{colors.fg-light}` (the same forest green now used as text). The single accent is **terracotta coral** (`{colors.accent}` — #c8524a), used only in small, deliberate places: the italic emphasis inside headlines, the 36px rule under a kicker, the em-dash bullet, the stat figure, the chapter ordinal, and the opening quote mark. Coral is the system's accent voice; using it as a surface fill or for body paragraphs shatters the editorial discipline.

Depth is **flat and air-based**. There are no drop shadows, no gradients, no blur, no glow. The only "depth" devices are 1px hairline borders (the chrome bars, the stat-card divider, the compare-panel separator) and the watermark numeral at 6% opacity. The whole system reads as printed ink on linen paper, not as a digital surface.

The system carries a built-in **motion vocabulary**: slide-to-slide transitions use a sharp `cubic-bezier(0.77, 0, 0.175, 1)` pan at 0.9s; element entrances stagger via `[data-anim]` and `[data-delay]` attributes (fade-up / fade-in / reveal-right / reveal-left / scale-in) with a spring-y `cubic-bezier(0.16, 1, 0.3, 1)` curve at 0.7s and delays of 0 / 0.08 / 0.18 / 0.3 / 0.44 / 0.6 / 0.78s. Animation is part of the system identity; new slides should use the animation attribute stack rather than authoring custom transitions.

**Density philosophy: sparse and breathing.** Grove reads as elegant when slides are quiet — one headline, one supporting paragraph, three stats in a row, two columns of text-and-image. The 8vw horizontal and 6.5vh vertical padding is generous by design. A slide that crowds 6 elements into the canvas breaks the system; a slide with one headline, one lede, and one accent rule reads as authoritative. Reach for fewer, larger elements. The system rewards silence around the type, not density of content.

**Key Characteristics:**
- Playfair Display at weight 400 — never bold — for every serif moment. Italic in `{colors.accent}` is the headline accent.
- Jost weight 300 for every body paragraph. Lighter weight is the system's "good paper" voice.
- JetBrains Mono weight 300 uppercase with 0.12em–0.2em letter-spacing for every label, kicker, footline, counter, and caption.
- Dark slides on `{colors.bg}` deep forest green with `{colors.fg}` warm cream text. Light slides on `{colors.bg-light}` parchment with `{colors.fg-light}` green text.
- One accent color: `{colors.accent}` terracotta coral. Used only for italic headline emphasis, the 36px coral rule, em-dash bullets, stat figures, chapter ordinals, and the quote mark.
- 1px hairline borders only (`{colors.border}` on dark, `{colors.border-light}` on light). No thick borders, no shadows, no gradients.
- Em-dash glyph rendered in JetBrains Mono coral is the system's universal bullet.
- A massive serif watermark numeral (`{components.grove-num}` at 18vw, 6% opacity) sits in the bottom-right corner of chapter and section slides as compositional texture.
- A staggered fade / reveal animation system (`[data-anim]` + `[data-delay]`) is built-in; new content should use it rather than appearing without entrance.

## Colors

### Palette
- **BG / Deep Forest** (`{colors.bg}` — #192b1b): The dominant dark canvas. A deep, considered forest green — grounded, editorial, the Grove base. The default slide background.
- **BG Alt** (`{colors.bg-alt}` — #1e3221): A slightly lighter forest green for secondary dark surfaces. Used as the `{components.img-placeholder}` fill on dark slides, where it reads as a tonal step up from the canvas without leaving the green family.
- **BG Light / Parchment** (`{colors.bg-light}` — #e8e4d6): The warm parchment surface used on light slides. Reads as good-quality paper stock, not as digital white.
- **BG Light Alt** (`{colors.bg-light-alt}` — #dedad0): A slightly cooler parchment for secondary light surfaces. Available for tonal separation between adjacent light regions.
- **FG / Warm Cream** (`{colors.fg}` — #d4cfbf): Primary text color on dark surfaces. Warm cream — never pure white. The off-white temperature is essential to the printed-ink feel.
- **FG-2** (`{colors.fg-2}` — rgba(212,207,191,0.6)): Secondary / muted text on dark. Used for ledes, captions, and supporting copy that needs to recede from primary.
- **FG-3** (`{colors.fg-3}` — rgba(212,207,191,0.32)): Tertiary / hint text on dark. Near-invisible — used for image-placeholder captions and the faintest metadata.
- **FG Light** (`{colors.fg-light}` — #192b1b): Primary text on light surfaces. **Shares its hex with `{colors.bg}`** — the deep forest green is used both as the dark canvas and as the dark text-on-light color. This is the system's primary surface-text inversion device.
- **FG Light 2** (`{colors.fg-light-2}` — rgba(25,43,27,0.58)): Secondary muted text on light.
- **FG Light 3** (`{colors.fg-light-3}` — rgba(25,43,27,0.33)): Tertiary text on light.
- **Accent / Terracotta Coral** (`{colors.accent}` — #c8524a): The single warm note. Used sparingly: italic emphasis inside headlines, the 36px coral rule under a kicker, the em-dash bullet, the stat figure, the chapter ordinal, the opening quote mark, and nav-dot active state. Never used as a surface fill, never used for body paragraphs.
- **Border** (`{colors.border}` — rgba(212,207,191,0.12)): Hairline divider on dark slides. 12% cream — visible as a structural line but never loud.
- **Border Light** (`{colors.border-light}` — rgba(25,43,27,0.14)): Hairline divider on light slides. 14% forest green.

### Defaults
- **Default slide background**: `{colors.bg}` (deep forest green) for the deck's dominant tonal register. Reach for `{colors.bg-light}` (parchment) when the content wants a literal "page" feel — typically for quote slides, lighter chapters, or contrast.
- **Default primary text color on dark surface**: `{colors.fg}` (warm cream).
- **Default primary text color on light surface**: `{colors.fg-light}` (deep forest green — same hex as the dark surface).
- **Default secondary / muted text**: `{colors.fg-2}` on dark, `{colors.fg-light-2}` on light. Use the `.muted` utility class.
- **Default headline color**: matches the surface's primary text color. Headlines never appear in coral except for the italic `<em>` accent inside them.
- **Default body color**: matches the surface's primary text color.
- **Default border color**: `{colors.border}` on dark, `{colors.border-light}` on light — both at 1px solid hairline weight.
- **Default kicker / chapter-num color**: `{colors.accent}` (terracotta coral). The mono uppercase kicker is the only chrome element that takes the accent color.
- **Default rule color** for the short 36px compositional rule under a kicker: `{colors.accent}`. The full-width section divider rule uses `{colors.border}` instead.

The palette is intentionally minimal. The dark forest / light parchment / terracotta coral triad is the entire color vocabulary. Introducing a fourth color (a navy, a yellow, a second accent) breaks the system's editorial restraint.

## Typography

### Font Family
The system loads four families from Google Fonts:

- **Playfair Display** at weights 400 and 500 (italic and roman). **Only weight 400 is used in published slides.** Weight 500 is loaded but reserved; bold serif (weight 700) is explicitly not permitted by the system rules.
- **Jost** at weights 200, 300, 400, 500. **Only weight 300 is used.** The light weight is the system's body voice.
- **JetBrains Mono** at weights 300 and 400. **Only weight 300 is used.** The light mono is the chrome voice.
- **Noto Serif SC / Noto Sans SC** at weights 300–500, loaded as the Chinese fallback chain for every role.

The four-family stack is strict by role: Playfair for every serif moment (display, headlines, quotes, stat figures, watermark), Jost for every body paragraph and bullet, JetBrains Mono for every label / kicker / footline / counter / caption.

### Display, Body, and Chrome Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.grove-num}` | 18vw | Playfair | 400 | Watermark ordinal numeral, 6% opacity, absolute bottom-right |
| `{typography.display}` | 10vw | Playfair | 400 | Cover hero title |
| `{typography.quote-mark}` | 8vw | Playfair | 400 | Opening quotation glyph |
| `{typography.h1}` | 5.5vw | Playfair | 400 | Chapter title, statement headline |
| `{typography.stat-value}` | 4.5vw | Playfair | 400 / coral | Stat-card numeric value |
| `{typography.h2}` | 3.2vw | Playfair | 400 | Routine slide headline |
| `{typography.quote-text}` | 3.2vw | Playfair | 400 italic | Quote body |
| `{typography.h3}` | 2vw | Playfair | 400 | Sub-headline, compare-panel title |
| `{typography.lead}` | 1.45vw | Jost | 300 | Lead paragraph |
| `{typography.body-list-emph}` | max(1.4vw, 17px) | Jost | 300 | List-slide body / bullets — emphasized for legibility |
| `{typography.body}` | 1.05vw | Jost | 300 | Standard body paragraph |
| `{typography.caption}` | 0.82vw | Jost | 300 | Captions, footnotes, chart sources |
| `{typography.label}` | 0.7vw | JetBrains Mono | 300 / 0.12em | Chrome label, mono metadata |
| `{typography.kicker}` | 0.7vw | JetBrains Mono | 300 / 0.14em / UPPER | Eyebrow above a headline |
| `{typography.chapter-num}` | 0.7vw | JetBrains Mono | 300 / 0.2em / UPPER | Chapter ordinal label |
| `{typography.stat-label}` | 0.7vw | JetBrains Mono | 300 / 0.12em / UPPER | Mono label beneath a stat figure |

### Defaults
- **Default size for a routine slide headline**: `{typography.h2}` (3.2vw).
- **Default size for a chapter or statement headline**: `{typography.h1}` (5.5vw). For statement-class moments specifically, use `{typography.h1-statement}` which caps at `min(4.5vw, 7.5vh, 88px)` to prevent overflow on short viewports.
- **Default size for a cover hero title**: `{typography.display}` (10vw).
- **Default size for a body paragraph**: `{typography.body}` (1.05vw) in Jost weight 300.
- **Default size for a lede / introductory paragraph**: `{typography.lead}` (1.45vw).
- **Default size for a kicker / eyebrow**: `{typography.kicker}` (0.7vw) in JetBrains Mono uppercase 0.14em with `{colors.accent}` color.
- **Default size for a stat-card figure**: `{typography.stat-value}` (4.5vw) in Playfair coral.
- **Default weight for every serif element**: 400.
- **Default weight for every body / Jost element**: 300.
- **Default weight for every mono / JetBrains element**: 300.

When the body text on a list-style slide reads too small at 1.05vw on typical laptop viewports, the system bumps it to `{typography.body-list-emph}` (max of 1.4vw or 17px). Reach for the emphasized size whenever a slide's primary content moment is a body paragraph or bulleted list — the default 1.05vw is calibrated for projector viewing, not laptop reading.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Playfair element runs at weight 400.** Bold serif (weight 700) is not used anywhere in the system. This is the system's most important typographic rule.
- **An `<em>` tag inside any Playfair headline (h1, h2, h3, or quote) renders as italic in `{colors.accent}` coral.** This is the signature Grove accent — the way you add emphasis to a headline is to italicize a word in coral. The em-style switch is automatic via CSS.
- **The opening quote mark on a quote slide is rendered as a massive Playfair glyph at 8vw in `{colors.accent}` coral.** A quote without the oversized coral quote-mark is broken.
- **The quote body is always italic.** Roman-style quote text is not in the system.
- **Every kicker / chapter-num / footline / label / caption is JetBrains Mono uppercase with at least 0.12em letter-spacing.** Mono in sentence case or without tracking reads as code, not chrome.
- **Bullet glyphs are em-dashes (`—`) rendered in JetBrains Mono `{colors.accent}` coral.** Never bullets (`•`), never hyphens (`-`), never asterisks. The em-dash is the system's bullet language.
- **Every chrome bar (top and bottom) carries a 1px solid `{colors.border}` rule (or `{colors.border-light}` on light slides).** The hairline rule is what makes the chrome read as a "frame around the page" rather than a banner.

### Typography Principles
The Playfair-400 / Jost-300 / JetBrains-Mono-300 weight commitment is the system's voice. Switching any of those weights breaks the editorial register. There is no weight ladder — each face has exactly one weight.

Italics are reserved for two specific roles: the coral accent inside headlines (via `<em>`) and the quote body. Italic body paragraphs are not used. Underline is not used. Emphasis in body text is communicated by the `.accent` color utility (changes color to coral), not by italic or bold.

## Layout

### Canvas System
The system targets a fluid viewport — each `.slide` is `100vw × 100vh` with `padding: {spacing.pad-y} {spacing.pad-x}` (6.5vh / 8vw). Slides sit side-by-side in a horizontal `#deck` flex strip and translate via `transform: translateX(...)` with the `{motion.dur-slide}` / `{motion.ease-slide}` transition. Only one slide is `is-active` at a time; non-active slides hold their content invisible (`[data-anim]` is `opacity: 0`) until the active class triggers the entrance animations.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 8vw | Horizontal slide padding |
| `{spacing.pad-y}` | 6.5vh | Vertical slide padding |
| `{spacing.pad-quote-x}` | 8.8vw | Slightly wider horizontal padding on quote slides |
| `{spacing.pad-quote-y}` | 7.8vh | Slightly taller vertical padding on quote slides |
| `{spacing.gap-lg}` | 4.5vh | Between major content sections |
| `{spacing.gap-md}` | 2.8vh | Between related elements |
| `{spacing.gap-sm}` | 1.4vh | Between tightly coupled elements |

### Chrome Anatomy
Every content slide carries a **slide-chrome** at the top — a thin flex space-between row holding two mono labels separated below by a 1px hairline border — and a **slide-foot** at the bottom — a matching row with section name + "NN / TT" counter, separated above by a matching hairline.

The chrome and foot are hidden on cover, chapter, quote, and end slides — those are the deck's chromeless emotional moments. Every other slide carries the frame.

### Border-Radius
**Zero structural radius.** No rounded cards, no rounded buttons, no rounded image placeholders. The only round shapes in the system are the 5px nav-dots (50% radius — fully circular) at the bottom of the viewport.

## Depth and Elevation

### Flat, No Shadows
The system uses **zero box-shadow, zero text-shadow, zero blur, zero gradient**. Depth is communicated entirely through:

1. **1px hairline borders** — the chrome bars at top and bottom, the stat-card divider, the compare-panel separator, the section-divider rule.
2. **Opacity layers in text color** — primary (`{colors.fg}`), muted (`{colors.fg-2}`), hint (`{colors.fg-3}`). The three-step opacity ladder is the system's text-elevation device.
3. **The watermark numeral** at 6% opacity — a massive Playfair digit sitting in the bottom-right corner of chapter and section slides as compositional texture, not as UI.

The absence of shadow is itself the elevation language. Adding `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` shatters the printed-ink feel.

### Watermark Numeral
The `{components.grove-num}` element is a Playfair digit at 18vw / 6% opacity, positioned absolutely at `right: {spacing.pad-x}, bottom: -0.15em`. It reads as a faint background texture, never as content. Use it on chapter / section / statement slides where the empty bottom-right would otherwise feel un-anchored. It is part of the depth language even though it appears as a decorative element.

## Shapes and Treatment

### Border Weight and Style
- **1px solid `{colors.border}`** — the universal hairline on dark slides. Chrome bar borders, stat-card bottoms, compare-panel separators, full-width section dividers.
- **1px solid `{colors.border-light}`** — the matching hairline on light slides.
- **1px solid `{colors.accent}`** — the 36px-wide coral rule (`{components.rule-coral}`) used as the compositional beat between a kicker and the headline that follows.

Borders are never thicker than 1px. Never dashed, never dotted. The 1px hairline is the system's structural rhythm.

### Decorative Element Types

**Slide Chrome Bar** (`{components.slide-chrome}`) — Thin top bar with mono labels on each side, separated below by a 1px hairline. The system's universal "you are reading a page" frame.

**Slide Foot Bar** (`{components.slide-foot}`) — Matching bottom bar with section name + counter, separated above by 1px hairline.

**Coral Rule** (`{components.rule-coral}`) — A 36px-wide 1px terracotta coral horizontal rule. The compositional beat that sits between a kicker (above) and a headline (below). Use it once per slide where a kicker leads into a primary headline — do not stack multiple coral rules.

**Full Rule** (`{components.rule-full}`) — Full-width 1px hairline divider in `{colors.border}` / `{colors.border-light}`. Used as a section break inside a slide body.

**Kicker** (`{components.kicker}`) — Mono uppercase eyebrow in coral, placed above an h1 or h2 headline. Often paired with a coral rule below it.

**Chapter Number** — A mono uppercase ordinal in coral (`{typography.chapter-num}`) above the chapter title. Sets the chapter's identity at chapter-opener slides.

**Em-Dash Bullet** (`{components.bullet-list}`) — A two-column grid list (2em / 1fr) where the bullet is a coral em-dash glyph rendered in JetBrains Mono. Never use a true bullet (`•`); always the em-dash.

**Grove Stat** (`{components.grove-stat}`) — A vertical stack: large Playfair coral value (4.5vw) on top, mono uppercase label beneath, 1px border-bottom hairline. No background fill — the card is defined by the rule + the type, not by a containing box.

**Quote Mark** (`{components.quote-mark}`) — Massive Playfair opening-quote glyph at 8vw in coral, placed above the italic quote body. Always present on a quote slide.

**Watermark Numeral** (`{components.grove-num}`) — Playfair digit at 18vw / 6% opacity in the bottom-right corner. Compositional texture only, never UI.

**Image Placeholder** (`{components.img-placeholder}`) — A solid `{colors.bg-alt}` (on dark) or `{colors.border-light}` (on light) fill marking where a real `<img>` will go. Holds a mono caption like "[ image ]" in `{colors.fg-3}`.

**Nav Dots** (`{components.nav-dots}`) — Fixed 5px circular dots at the bottom of the viewport indicating slide position. Inactive: 22% white. Active: 80% white at 1.4× scale.

## Do's and Don'ts

### Do
- Run every serif moment in Playfair Display weight 400. Never bold.
- Use `<em>` inside any Playfair headline to switch a word to italic terracotta coral — this is the system's signature accent move.
- Run every paragraph in Jost weight 300. The lighter weight is the system's body voice.
- Run every label, kicker, chapter-num, footline, counter, and stat-caption in JetBrains Mono weight 300, uppercase, with at least 0.12em letter-spacing.
- Default slide background to `{colors.bg}` (deep forest green). Use `{colors.bg-light}` (parchment) on quote slides and any moment that wants a literal "page" feel.
- Pair the kicker with the 36px coral rule as a single compositional unit above the slide's primary headline.
- Use the em-dash glyph (`—`) in coral as the universal bullet. Never use round bullets or hyphens.
- Apply the `{components.grove-num}` watermark numeral to chapter and section-opener slides — the bottom-right corner needs that anchor.
- Use the built-in `[data-anim]` + `[data-delay]` animation stack (fade-up / fade-in / reveal-right / reveal-left / scale-in, with delays 0–6) for every new content element. Animation is part of the system identity, not optional polish.
- Keep slides spacious — one headline + one supporting paragraph + one accent rule is the rhythm. Reach for fewer elements at larger sizes.

### Don't
- Don't use bold serif. Playfair at weight 700 is not in this system. Bold serif breaks the editorial voice.
- Don't introduce a fourth typeface beyond Playfair, Jost, JetBrains Mono, and Noto SC. The four-family stack is the entire typographic identity.
- Don't use coral as a surface fill or for body paragraphs. Coral is the accent voice: italic emphasis, kicker, rule, em-dash bullet, stat figure, quote mark, chapter ordinal. That's the entire coral vocabulary.
- Don't use box-shadow, gradient, blur, or any rgba shadow. The system is flat.
- Don't use thick borders (2px+). The 1px hairline is the system's structural rhythm.
- Don't round any corners. The only round shape is the 5px nav-dot.
- Don't use round bullets, hyphens, or asterisks for list items. The em-dash in coral is the only bullet glyph.
- Don't put a kicker without a coral rule below it. The kicker → rule → headline triad is one unit.
- Don't render mono text in sentence case or without letter-spacing. Mono is always uppercase chrome with 0.12em+ tracking.
- Don't omit the slide-chrome and slide-foot on content slides. The thin frame at top and bottom is what makes the slide read as a page.
- Don't crowd the canvas. Grove rewards silence around the type. If a slide feels full, remove a supporting element rather than shrinking type.

## Responsive Behavior

The system uses **vw / vh units throughout** — every size, padding, gap, and rule is proportional to the viewport. The same composition renders correctly on a 1280×720 laptop, a 1920×1080 monitor, and a 2560×1440 display without breakpoints.

### Scaling Behavior
- Display headline scales linearly with viewport width (10vw → 192px at 1920, 128px at 1280).
- Body text scales similarly (1.05vw → 20.16px at 1920, 13.44px at 1280) — except on list-slide body, where the `max(1.4vw, 17px)` floor prevents the text from going unreadable on smaller viewports.
- Padding, gaps, and grove-num all scale proportionally with vw/vh.
- The 1px hairline borders are fixed-pixel and do not scale, which means at larger viewports they appear proportionally finer. This is by design.

### Presenter Behavior
- Slides advance via right/down arrow / space / page-down (handled by the deck JavaScript).
- Slides reverse via left/up arrow / page-up.
- The horizontal `#deck` strip translates via `transform: translateX(-N * 100vw)` between slides, with the `{motion.dur-slide}` sharp deceleration curve at 0.9s.
- Each slide carries an `is-active` class that triggers the staggered entrance animations on its `[data-anim]` elements.
- Bottom nav-dots reflect current slide position; clicking a dot jumps to that slide.

### Animation
The `[data-anim]` + `[data-delay]` system is built-in:
- `fade-up`: opacity 0 → 1, translateY 28px → 0
- `fade-in`: opacity 0 → 1
- `reveal-right`: clip-path inset(0 100% 0 0) → inset(0 0 0 0)
- `reveal-left`: clip-path inset(0 0 0 100%) → inset(0 0 0 0)
- `scale-in`: opacity 0 → 1, scale 0.94 → 1

All entrance animations use `{motion.ease-enter}` at `{motion.dur-enter}` (0.7s). Stagger delays: 0 / 0.08s / 0.18s / 0.3s / 0.44s / 0.6s / 0.78s.

### Print / Export
The system has no `@media print` rule. Print export will inherit the horizontal-strip layout and is unlikely to paginate cleanly. Treat Grove as a screen-first system; PDF export requires a dedicated print stylesheet.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Chinese Face | Weight | Why |
|---|---|---|---|
| Display / h1 / h2 / h3 (Playfair roles, 2–10vw) | 霞鹜文楷 LXGW WenKai | 400 | Literary, hand-set warmth that mirrors Playfair Display at weight 400 — never bold, exactly the Grove rule |
| Quote text / mark (8vw mark, 3.2vw text) | 霞鹜文楷 LXGW WenKai | 400 | The same literary warmth carries the italic-quote moment; Chinese has no italic so the face does the expressive work |
| Stat figure (4.5vw, coral) | 霞鹜文楷 LXGW WenKai | 400 | Keeps stat figures in the Playfair register; the coral color carries the accent |
| Watermark numeral (18vw) | 霞鹜文楷 LXGW WenKai | 400 | The 6%-opacity watermark works at this scale with LXGW WenKai's open letterforms |
| Body / lede (Jost roles, 1.05–1.45vw) | 思源宋体 Noto Serif SC | 300–400 | Mincho body voice — calm, literary, sits back like Jost weight 300 |
| Label / kicker / chapter-num (JetBrains Mono roles) | 思源等宽 Noto Sans Mono CJK SC | 300–400 | Preserves the typewriter-chrome quality for kickers and footlines |

### Mixed-Content Strategy

Use **Strategy C** — keep Playfair Display as the Latin serif and let CJK glyphs fall through to LXGW WenKai. Playfair Display weight 400 (never bold) is the system's most important typographic commitment; replacing it with a CJK serif wholesale would break the monograph / boutique-brand-book register that defines Grove. The system already loads Noto Serif SC / Noto Sans SC as fallbacks per its existing font stack — the change is to add LXGW WenKai as the preferred CJK display face ahead of Noto Serif SC:

```css
/* Playfair roles (display, h1, h2, h3, quote, stat, watermark) */
font-family: 'Playfair Display', 'LXGW WenKai TC', 'Noto Serif SC', Georgia, serif;
/* Jost roles (lead, body, caption) */
font-family: 'Jost', 'Noto Serif SC', system-ui, sans-serif;
/* JetBrains Mono roles (label, kicker, chapter-num, stat-label) */
font-family: 'JetBrains Mono', 'Noto Sans Mono CJK SC', monospace;
```

(Note: the system currently lists `'Noto Sans SC'` in the Jost stack — for Grove's literary register, swap to `'Noto Serif SC'` instead. The Mincho body voice is closer to Jost weight 300's "good paper" feel than the Hei sans face.)

Baseline mismatch at display sizes (5.5–10vw) is mild — LXGW WenKai and Playfair Display both sit at similar optical baselines, so mixed-script headlines like `A Quiet 山林` read cleanly. The `<em>` italic-coral accent rule is the more delicate piece (see Known CJK Gap below).

### Loading

Replace the existing Noto-only fallback with an LXGW WenKai + Noto Serif SC + Noto Sans Mono CJK pair:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&family=Noto+Serif+SC:wght@300;400;500&family=Noto+Sans+Mono+CJK+SC:wght@300;400&display=swap" rel="stylesheet">
```

LXGW WenKai TC is the version hosted on Google Fonts (covers both traditional and simplified glyphs).

### Universal CJK Adjustments

These adjustments apply to **every CJK block** in this system, regardless of size or role:

- **Loosen line-height by 0.05–0.08.** CJK glyphs are full-width squares with more visual weight than Latin letterforms; line-heights tuned for Latin (1.0–1.1 on display, 1.65–1.75 on body) read as cramped in Chinese. Bump display to 1.15–1.25 and body to 1.7–1.85.
- **Remove negative letter-spacing on CJK headlines.** Playfair Display uses -0.01em to -0.03em tracking, which collides Chinese glyphs into each other. For CJK runs, set `letter-spacing: 0` — or a tiny positive `0.02em` if the headline feels visually packed.
- **Never `text-transform: uppercase` on CJK text.** Chinese has no case; the CSS property does nothing on Han glyphs but will silently break any mixed-script line where the JetBrains Mono portion was meant to be capitalized.
- **Use Chinese full-width punctuation** (`，。：；！？「」『』（）`) inside Chinese sentences, not the Latin equivalents (`,.:;!?""''()`). Mixing punctuation systems within one sentence reads as a typesetting error.
- **No period (。) at the end of CJK headlines.** Chinese headlines follow the same rule as Latin — title-style lines drop terminal punctuation. Body paragraphs keep their 。
- **Apply Pangu spacing (盘古之白) at the boundary between CJK and Latin runs.** A space (or 0.25em margin) belongs between a Chinese character and an adjacent Latin word or digit, e.g. `2026 年 5 月` not `2026年5月`. Either type the spaces manually or use a `pangu.js`-style auto-spacer.
- **One font per sentence.** Don't switch between LXGW WenKai and Noto Serif SC inside the same sentence — pick the face that matches the role (display = LXGW WenKai, body = Noto Serif SC) and commit to it for the whole run.

### Aesthetic Notes for This System

Grove's whole voice is "literary monograph / boutique brand book" with a single accent of terracotta coral. The Chinese equivalent of that quiet authority is **LXGW WenKai for every serif moment** (its hand-set warmth is the closest Chinese analog to Playfair Display at weight 400) and **Noto Serif SC at weight 300–400 for body** (the Mincho calm that matches Jost weight 300's reticence). Avoid running Chinese body in Noto Sans SC — the geometric sans tips the system from "good paper" to "modern app."

The em-dash bullet glyph in DM Mono coral works in Chinese without modification — the em-dash character itself is the same Unicode glyph (—) and reads as a deliberate mark in front of a Chinese list item. Keep the bullet column in Noto Sans Mono CJK SC at weight 300 coral, exactly mirroring the Latin pattern.

The watermark numeral (18vw, 6% opacity) is particularly effective in Chinese — render a Chinese ordinal character (e.g., 「三」or 「五」) instead of a Western digit. At 6% opacity it reads as faint compositional texture, and the Han glyph's denser visual weight at that scale balances the slide better than a thin Western numeral would.

### Known CJK Gap

The system's signature `<em>` italic-coral treatment is the hardest piece to translate: **Chinese has no italic concept** — slanted Han glyphs read as broken, not as emphasis. The current Grove CSS depends on the browser's default `<em>` styling (italic) plus a CSS color rule for the coral. In Chinese, the italic does nothing visually, so the emphasis collapses to "just coral text inside a headline." That's not bad — coral inside an LXGW WenKai headline still reads as a deliberate accent — but the system loses one of its two emphasis dimensions (color + slant) and is left with only color.

To compensate, two options: (1) accept color-only emphasis on Chinese headlines and let the coral carry the weight, or (2) switch the `<em>` portion to a different face inside Chinese headlines — e.g., **站酷小薇体 (ZCOOL XiaoWei)** — to provide a face-based contrast that approximates the slant contrast of Latin italic. Add to the CSS:

```css
.h1 em, .h2 em, .h3 em, .quote-text em {
  color: var(--c-accent);
  font-family: 'Playfair Display', 'ZCOOL XiaoWei', 'LXGW WenKai TC', serif;
  font-style: italic; /* Latin renders italic; CJK ignores */
}
```

This gives the Latin portion italic-coral and the CJK portion face-shift-coral. Test on a per-deck basis — for many Grove decks, color-only emphasis is sufficient.

## Iteration Guide

1. Any new headline is Playfair Display weight 400. Pick the size from the headline ladder (10vw display / 5.5vw h1 / 3.2vw h2 / 2vw h3) — do not invent a new size.
2. Any new emphasis inside a headline uses `<em>` and renders as italic coral automatically. Do not author a manual color/italic style.
3. Any new body paragraph is Jost weight 300 at 1.05vw (or 1.45vw for lede, or `max(1.4vw, 17px)` on list-style slides).
4. Any new label / kicker / footline / counter / caption is JetBrains Mono weight 300 uppercase with at least 0.12em letter-spacing.
5. Any new chrome line (top bar, bottom bar, section divider, stat-card border) is a 1px solid hairline in `{colors.border}` (dark) or `{colors.border-light}` (light). No thicker borders.
6. Any new bullet list uses the `{components.bullet-list}` pattern (two-column grid, em-dash in coral mono). Do not author a different bullet style.
7. Any new accent moment uses `{colors.accent}` terracotta coral. The accent is for italic headline emphasis, the 36px rule, em-dashes, stat figures, quote marks, chapter ordinals, and the kicker text. Nothing else.
8. Any new chapter or section-opener slide carries a `{components.grove-num}` watermark numeral in the bottom-right corner.
9. Any new content element gets a `[data-anim]` attribute (fade-up, fade-in, reveal-right, reveal-left, or scale-in) plus a `[data-delay]` (0–6) for staggered entrance. Do not author custom transitions.
10. When in doubt, add space rather than content. Grove's editorial register is silence, not density.

## Known Gaps

- The four Google Fonts (Playfair Display, Jost, JetBrains Mono, Noto Serif SC / Noto Sans SC) are loaded via `<link>`. Offline rendering will fall back to Georgia, system-ui, monospace, and system serif/sans for the Noto roles — which preserves the rough character but loses the typographic identity. Self-hosting recommended for offline / print reliability.
- The system loads Playfair weight 500 and Jost weights 200/400/500 — these are not used in the published CSS but are available. Using them would break the system's single-weight commitment.
- The `<em>` italic-coral treatment relies on the CSS rule `.h1 em, .h2 em, .h3 em { color: var(--c-accent); }` — note that the actual italic property is NOT set in the rule (the comment block is empty). The italic comes from the browser's default `<em>` styling. If a stylesheet override removes the default italic, the coral accent will lose its italic character.
- The grove-num watermark uses 18vw font-size — on extremely wide viewports (3000px+) this becomes very large and may push the slide-foot area. The CSS positions it at `bottom: -0.15em` to absorb some overflow, but very tall numerals at very wide viewports may need adjustment.
- The vertical sidebar component (`.grove-sidebar`) is loaded in the CSS but explicitly disabled (`display: none !important`). It was a chapter-tab decoration that read as clutter; the slide-chrome bar provides the section name already.
- The fixed slide-counter (`#slide-counter`) is also disabled — the slide-foot bar already shows "NN / TT" so the fixed counter was a duplicate.
- The CSS has a few empty rule blocks (`.h1 em { }`, `.grove-stat-val em { }`, `.quote-text { ... }`) which appear to be leftover stubs from earlier iterations. They are inert and can be removed without effect.
- The deck is built bilingually-aware (Chinese fallbacks via Noto Serif SC / Noto Sans SC) but no actual Chinese content is in the published source — the bilingual support is structural, not active.
- The image-placeholder component is a layout reservation, not a real image. Replacing the placeholder div with an `<img>` requires manually matching the parent's flex behavior and background.
