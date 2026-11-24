---
version: alpha
name: Mat
description: A warm, material-tactile presentation system inspired by a high-end product landing page. Dark forest green is the dominant environment, warmed by a low atmospheric wood-brown glow from the bottom-right corner of every dark slide. Cream type floats directly on the field; warm orange acts as the single accent. The typeface stack pairs Bricolage Grotesque (a heavy, rounded grotesque) for display with DM Sans for body and DM Mono for labels — the result reads as industrial-design portfolio meets boutique product launch, never tech demo.

colors:
  bg-dark: "#232E26"
  bg-dark-alt: "#2E3D30"
  bg-cream: "#EDE6D0"
  bg-cream-alt: "#E4DAC4"
  ink-cream: "#F0E8D2"
  ink-cream-2: "rgba(240, 232, 210, 0.58)"
  ink-cream-3: "rgba(240, 232, 210, 0.3)"
  ink-dark: "#1E2820"
  ink-dark-2: "rgba(30, 40, 32, 0.6)"
  ink-dark-3: "rgba(30, 40, 32, 0.3)"
  accent-orange: "#C07030"
  border-on-dark: "rgba(240, 232, 210, 0.12)"
  border-on-cream: "rgba(30, 40, 32, 0.14)"
  wood-glow: "#7A4E24"

color-aliases:
  c-fg: ink-cream
  c-fg-light: ink-dark
  c-bg: bg-dark
  c-bg-light: bg-cream
  c-accent: accent-orange

typography:
  display:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 12vw
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: -0.03em
  h1:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 7vw
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: -0.025em
  h2:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 4vw
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.02em
  h3:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 2.4vw
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.01em
  lead:
    fontFamily: "DM Sans, Noto Sans SC, sans-serif"
    fontSize: 1.5vw
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "DM Sans, Noto Sans SC, sans-serif"
    fontSize: 1.05vw
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "DM Sans, Noto Sans SC, sans-serif"
    fontSize: 0.82vw
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Mono, monospace"
    fontSize: 0.7vw
    fontWeight: 400
    letterSpacing: 0.12em
    textTransform: uppercase
  stat-value:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 5.5vw
    fontWeight: 800
    lineHeight: 1.0
    letterSpacing: -0.025em
  quote-text:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 3.4vw
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  quote-mark:
    fontFamily: "Bricolage Grotesque, Noto Sans SC, sans-serif"
    fontSize: 8vw
    fontWeight: 800
    lineHeight: 0.6

spacing:
  pad-x: 5.5vw
  pad-y: 5.5vh
  gap-lg: 4.5vh
  gap-md: 2.8vh
  gap-sm: 1.4vh

canvas:
  width: 100vw
  height: 100vh

components:
  kicker:
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "{typography.label.fontSize}"
    letterSpacing: 0.12em
    textTransform: uppercase
    color: "{colors.accent-orange}"
  rule:
    width: 32px
    height: 1px
    background: "{colors.accent-orange}"
  bullet-marker:
    content: "—"
    color: "{colors.accent-orange}"
    fontFamily: "{typography.label.fontFamily}"
    description: "Em-dash prefix in warm orange; emerges in mono face. The system's standard list mark; never a bullet, never a checkmark."
  info-card:
    background: "{colors.bg-cream}"
    color: "{colors.ink-dark}"
    padding: "{spacing.gap-md} calc({spacing.pad-x} * 0.8)"
    maxWidth: 28vw
    description: "Cream inset box embedded on a dark green field. The signature material-contrast component; carries a heading and a body block, no border, no shadow."
  chrome-band:
    borderBottom: "1px solid {colors.border-on-dark}"
    paddingBottom: "{spacing.gap-sm}"
    description: "Label-pair on top of a 1px rule; suppressed on cover/quote/end slide types."
  foot-band:
    borderTop: "1px solid {colors.border-on-dark}"
    paddingTop: "{spacing.gap-sm}"
    description: "Label-pair under a 1px rule; mirrors the chrome band."
  stat-cell:
    borderRight: "1px solid {colors.border-on-dark}"
    padding: "{spacing.gap-md} {spacing.pad-x} {spacing.gap-md} 0"
    description: "A vertically-divided cell containing a large numerical value (with optional inline orange-emphasis em-span) and a one-line label. Last cell has no right border."
  bar-fill:
    width: "100%"
    background: "{colors.ink-cream-3}"
    description: "Vertical bar in muted cream; gets the orange accent (.accent variant) when it's the highlighted data point."
  compare-divider:
    width: 1px
    background: "{colors.border-on-dark}"
    description: "A 1px-wide vertical column (not a border) used to split a before/after comparison; subtle, not loud."
  image-placeholder:
    background: "rgba(240, 232, 210, 0.06)"
    border: "1px solid {colors.border-on-dark}"
    color: "{colors.ink-cream-3}"
    description: "Hairline-bordered void with centered mono label until photography is available."
  atmospheric-glow:
    selector: ".slide.dark::before"
    position: "bottom-right ellipse, 55% wide × 70% tall"
    gradient: "radial-gradient(ellipse at 70% 80%, rgba(122, 78, 36, 0.28) 0%, rgba(80, 50, 20, 0.14) 40%, transparent 70%)"
    description: "The wood-brown atmospheric glow that lives on every dark slide via ::before. Non-optional on dark surfaces; defines the warmth of the system."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Mat is a **material-tactile presentation system** built around a single environmental premise: a deep forest-green surface warmed from the bottom-right corner by a low wood-brown glow. The atmosphere does the heavy lifting — before any content lands, the slide already feels like a workbench in afternoon light. Cream type floats directly on the green field; there are no cards, no panels, no frames. Where the system needs to break the green, it does so with a single cream inset box (the info-card) that reads as a piece of warm paper laid on the dark surface.

The typeface stack is a deliberate three-voice pairing. **Bricolage Grotesque** at weights 700 and 800 is the display workhorse — heavy, rounded, with a slightly mechanical character that suits product writing without feeling tech-startup. **DM Sans** at weight 400 is the body voice, neutral enough to let the display type breathe. **DM Mono** at weight 400 handles all labels, kickers, metadata, and chrome — anything structural that needs to read as a tag rather than a sentence. Display type is **always mixed case** in this system, never uppercase; the uppercase work is reserved for mono labels.

The palette is intentionally narrow. **Dark forest green** is the dominant surface (`{colors.bg-dark}`), with a slightly lighter alternate available for layered regions. **Warm cream** is the primary text color on dark and the secondary surface color when a slide flips light. **Warm orange** (`{colors.accent-orange}`) is the single accent — it appears only as small inline marks: kicker text, bullet em-dashes, the `<em>` inside a stat numeral, the opening quote glyph, the single highlighted bar in a chart. Orange is never a background and never a large headline color; it's the structural emphasis dot of the system.

Depth is minimal and atmospheric, not stacked. There are no drop shadows. There are no rounded corners on any structural element. The only depth signal is the wood-brown radial glow that sits behind every dark slide via a `::before` pseudo-element. Region separation comes from **thin 1px hairline rules** in low-opacity cream — for chrome bands, foot bands, stat cell dividers, compare panel splits, and chart baselines. Nothing about this system is loud.

**Density philosophy: medium-sparse.** Mat reads as elegant when the slide breathes — generous left and right padding (`{spacing.pad-x}` at 5.5vw), one main typographic moment, and one secondary block of supporting copy. Cramming three columns of bullets onto a slide breaks the system; the warm green field needs negative space to do its atmospheric work. The exception is the stats and compare slide types, where a clean three-up or two-up arrangement of restrained cells is correct. A slide with a single headline and one paragraph of lead copy is right in this system's lane. A slide that fills 80% of its area with type is fighting the design.

**Key Characteristics:**
- Dark forest green canvas (`{colors.bg-dark}`) with a warm wood-brown radial glow (`{components.atmospheric-glow}`) anchored to the bottom-right corner of every dark slide.
- Cream text (`{colors.ink-cream}`) floats directly on the green field with no card, panel, or frame around it.
- Bricolage Grotesque display type is **always mixed case** — never uppercase. Uppercase is reserved for DM Mono labels.
- A single accent color, warm orange (`{colors.accent-orange}`), used only as small inline emphasis (kicker, bullet marker, inline `<em>`, quote glyph, one chart bar).
- The cream **info-card** (`{components.info-card}`) is the signature material-contrast component — a warm paper rectangle inset on the dark field.
- Bullet lists use an em-dash prefix in warm orange via DM Mono — never a dot, never a check.
- Thin 1px hairline rules in low-opacity cream are the only divider language. No heavy borders, no shadows.
- The system has one light slide variant (cream background with dark green text) used as a tonal inversion within a deck, never as the default.

## Colors

### Palette

- **Dark Forest Green** (`{colors.bg-dark}` — #232E26): The dominant environment. Default background for every slide unless a deliberate light-slide variant is chosen. The green is muted enough that cream type sits on it without vibration.
- **Slightly Lighter Green** (`{colors.bg-dark-alt}` — #2E3D30): A tonal step-up reserved for layered or recessed surfaces within a dark slide. Available but used sparingly.
- **Warm Cream** (`{colors.bg-cream}` — #EDE6D0): The light-slide background and the fill color of the info-card inset. Reads as warm paper, not white — the warmth is essential to the system's material identity.
- **Deeper Cream** (`{colors.bg-cream-alt}` — #E4DAC4): A secondary cream tone for image placeholders on light slides.
- **Cream Ink** (`{colors.ink-cream}` — #F0E8D2): Primary text color on every dark surface. Slightly warmer than the background cream — chosen so headlines feel like they're carved into the green rather than printed on it.
- **Cream Ink at 58% / 30%** (`{colors.ink-cream-2}`, `{colors.ink-cream-3}`): Secondary and tertiary text on dark. Used for muted lead copy and barely-there metadata respectively.
- **Dark Ink** (`{colors.ink-dark}` — #1E2820): Primary text color on cream surfaces (info-card body, light slide). A very dark forest green, never pure black.
- **Dark Ink at 60% / 30%** (`{colors.ink-dark-2}`, `{colors.ink-dark-3}`): Muted and tertiary text on cream.
- **Warm Orange** (`{colors.accent-orange}` — #C07030): The single accent. A burnt copper-orange that nods to wood, leather, and oxidized metal. Never a background, never a large headline color.
- **Wood Glow** (`{colors.wood-glow}` — #7A4E24): The radial atmospheric glow color, applied only at 0.28 and 0.14 alpha inside the bottom-right corner gradient. Never used as a flat fill.

### Defaults

- **Default surface background**: `{colors.bg-dark}` (forest green). The system is dark-default; cream slides are an intentional tonal break, not a routine choice.
- **Default headline color on dark**: `{colors.ink-cream}`. Headlines never appear in orange.
- **Default headline color on cream**: `{colors.ink-dark}`.
- **Default body text color on dark**: `{colors.ink-cream-2}` (the 58% cream — the `.muted` helper).
- **Default body text color on cream**: `{colors.ink-dark-2}`.
- **Default border / divider color**: `{colors.border-on-dark}` on dark; `{colors.border-on-cream}` on cream. Always 1px, never thicker.
- **Default kicker color**: `{colors.accent-orange}`. The kicker is the system's eyebrow label and is the most consistent place orange shows up.
- **Default inline emphasis color**: `{colors.accent-orange}`. An `<em>` inside a stat value, a quote attribution, or a chart label resolves to orange.
- **Default atmospheric treatment for dark slides**: the wood-brown radial glow (`{components.atmospheric-glow}`) is always on. It is part of the dark surface itself.

Orange functions as a punctuation color: it tells the eye where the structural emphasis lives without ever competing for surface area. If two orange elements end up adjacent on the same slide, one of them is wrong.

## Typography

### Font Family

The system runs on three Google Fonts plus CJK fallback. **Bricolage Grotesque** carries every display, h1, h2, h3, stat numeral, and quote text — its rounded, heavy character at weights 700–800 is the defining voice. **DM Sans** at weight 400 carries every paragraph, lead, caption, and bullet item — neutral, readable, lets the display type lead. **DM Mono** at weight 400 carries every label, kicker, chrome tag, footer text, bullet em-dash, and chart label — anything that needs to read as a structural marker rather than prose. **Noto Sans SC** is the CJK fallback for all sans roles; **Noto Serif SC** is not used.

A subtle but load-bearing rule: **the bullet em-dash before each list item renders in DM Mono in warm orange**, not in the body face. The mono shape is what makes the dash feel like a deliberate mark and not a stray punctuation glyph.

Italics are not used for typographic decoration in this system. The `<em>` tag is repurposed as an **orange inline emphasis** — `<em>` inside a stat value or a quote attribution switches to `{colors.accent-orange}` and stays upright (font-style: normal). There is no italicized face anywhere.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | 12vw | Bricolage Grotesque | 800 | Cover or opening hero display — massive, line-broken into 1–2 words per line |
| `{typography.h1}` | 7vw | Bricolage Grotesque | 800 | Chapter-opening or closing headline |
| `{typography.h2}` | 4vw | Bricolage Grotesque | 700 | Primary content-slide headline |
| `{typography.stat-value}` | 5.5vw | Bricolage Grotesque | 800 | Large numerical figure inside a stat cell |
| `{typography.quote-mark}` | 8vw | Bricolage Grotesque | 800 | Decorative opening quotation glyph in warm orange |
| `{typography.quote-text}` | 3.4vw | Bricolage Grotesque | 600 | Pull-quote body text |
| `{typography.h3}` | 2.4vw | Bricolage Grotesque | 600 | Sub-headline or region heading |
| `{typography.lead}` | 1.5vw | DM Sans | 400 | Lead paragraph or large bullet item |
| `{typography.body}` | 1.05vw | DM Sans | 400 | Body paragraph and info-card body |
| `{typography.caption}` | 0.82vw | DM Sans | 400 | Image caption, tagline, fine print |
| `{typography.label}` | 0.7vw | DM Mono | 400 | Kicker, chrome tag, footer label, metadata, chart label |

### Defaults

- **Default primary section headline**: `{typography.h2}` (4vw).
- **Default opening or cover display**: `{typography.display}` (12vw) on a cover; `{typography.h1}` (7vw) on a chapter or closing moment.
- **Default body paragraph size**: `{typography.body}` (1.05vw). Reach for `{typography.lead}` (1.5vw) when the paragraph is the single supporting block under a large headline.
- **Default label / kicker size**: `{typography.label}` (0.7vw).
- **Default weight for any display element**: 700 (h2) or 800 (display, h1, stat-value).
- **Default weight for body**: 400.
- **Default headline letter-spacing**: negative — display at -0.03em, h1 at -0.025em, h2 at -0.02em. The negative tracking is essential.

When unsure, default to `{typography.h2}` for the primary text moment paired with one `{typography.lead}` paragraph as supporting copy — that pairing is the system's most reliable rhythm.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **All display, h1, h2, h3 text is mixed case** — never uppercase. Uppercase display type does not exist in this system. If text is in Bricolage Grotesque, it is sentence case.
- **All labels, kickers, chrome text, footers, and metadata are DM Mono uppercase with 0.12em positive tracking.** Mono in sentence case does not exist here.
- **The kicker is always warm orange.** When a slide carries a kicker (eyebrow label above a headline), its color is `{colors.accent-orange}` regardless of surface.
- **Bullet lists use an em-dash prefix in DM Mono colored warm orange.** Never a dot, never a check, never a numeral.
- **The `<em>` tag inside a stat numeral renders in warm orange and stays upright.** It is the mechanism for highlighting a unit suffix or a key digit inside a number.
- **Headlines on dark surfaces are cream; headlines on cream surfaces are dark ink.** Headlines are never orange.
- **All Bricolage display type uses negative letter-spacing.** Default tracking on display reads as untreated; the negative is what gives the type its compressed, premium-product character.

### Typography Principles

The rhythm of the system is **heavy mixed-case display + light mixed-case body + small uppercase mono label**. Switching any of those three modes (e.g., uppercasing the display, or making the body the same weight as the display) breaks the editorial register. Bricolage at 700–800 sits next to DM Sans at 400 — the weight gap is deliberate and wide. Do not use intermediate Bricolage weights (400, 500) for display moments; they read as undecided.

Italics are not used. Underline is not used. The only emphasis mechanism inside body copy is the orange `<em>` inline. The only structural emphasis is the kicker and the bullet em-dash.

## Layout

### Canvas System

Mat is **viewport-fluid by design**. All sizes use `vw` and `vh` units so the layout scales linearly with the viewport. The slide container is `100vw × 100vh` and the deck is a horizontal flex strip that translates left/right by full viewport widths. There is no fixed canvas dimension; the same composition renders correctly on any 16:9-ish viewport.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 5.5vw | Slide horizontal padding; the breathing room on left and right edges |
| `{spacing.pad-y}` | 5.5vh | Slide vertical padding |
| `{spacing.gap-lg}` | 4.5vh | Between major content sections |
| `{spacing.gap-md}` | 2.8vh | Between related elements (headline → lead, stat → label) |
| `{spacing.gap-sm}` | 1.4vh | Between tightly related elements (label pair in chrome band) |

The horizontal padding is generous — content occupies roughly the middle 89% of the viewport. Pushing content closer to the edges breaks the system's editorial spaciousness.

### Chrome Frame

Most slide types carry a **chrome band** (`{components.chrome-band}`) at the top and a **foot band** (`{components.foot-band}`) at the bottom. Each is a `flex space-between` row of two DM Mono labels (typically a section name on the left and a slide-position or section number on the right) separated from the body by a 1px hairline rule. Cover, quote, and end-style slides suppress both bands entirely — those moments are chromeless by convention.

### Navigation Chrome

A row of nav-dots is fixed center-bottom (5px circles in low-opacity white) and a slide counter sits bottom-right (10px DM Mono in `rgba(255,255,255,0.25)`, format `01 / 09`). These are presentation chrome, not part of the design language proper — they're consistent across all template families in this library.

## Depth and Elevation

### Atmospheric Glow (Primary Depth Mechanism)

The system's only depth treatment is the **bottom-right wood-brown radial glow** that lives on every dark slide via `::before`. The pseudo-element occupies 55% width × 70% height anchored to the bottom-right corner, with a radial gradient from `rgba(122,78,36,0.28)` to `rgba(80,50,20,0.14)` to transparent. The glow sits at `z-index: 0`; all slide content sits at `z-index: 1`. This is the depth — there are no drop shadows, no elevation cards, no glow effects on text.

### Hairline Rules (Structural Separation)

Where the system needs to separate regions, it uses **1px hairline rules in low-opacity cream** (`{colors.border-on-dark}` at 12% opacity) on dark surfaces, or low-opacity dark ink (`{colors.border-on-cream}` at 14% opacity) on cream. These rules appear under chrome bands, above foot bands, between stat cells, between compare panels, and as the chart baseline. Hairlines never go thicker than 1px, never colored.

### No Shadows

There are no `box-shadow` declarations on any structural element. The info-card sits on the dark field with no shadow — its material contrast is the cream-on-green tonal jump, not elevation. Adding a shadow to any component breaks the system's flat material-photography aesthetic.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0px | Every structural element — info-card, image placeholders, stat cells, compare panels, bars |
| 50% | Nav-dot circles only |

The system has **no rounded corners** on any composed content. Cards, panels, and image frames are all strict rectangles. The only round shapes are the navigation UI dots.

### Border Weights

- **1px solid hairline** — the universal structural border. Used for chrome bands, foot bands, stat cell dividers, compare panel splits, chart baselines, and image placeholder outlines. Color is `{colors.border-on-dark}` on dark surfaces and `{colors.border-on-cream}` on cream.
- No other border weights exist. A 2px border breaks the system; a 3px border belongs to a different design family.

### Decorative Element Types

**Kicker** — A small DM Mono uppercase tag in warm orange with 0.12em positive tracking, placed above a headline as an eyebrow label. The most consistent appearance of orange in the system. Typically 0.7vw size.

**Rule** — A 32px-wide × 1px-tall horizontal accent line in warm orange. Used as a small underline-style separator between a kicker and a headline, or beneath a chapter number. Decorative, not structural.

**Bullet em-dash** — The list marker for every bullet list. Renders as `—` in DM Mono colored warm orange, prepended to the list item via the marker column of a CSS grid (`grid-template-columns: 1.4em 1fr`). The bullet voice of the system.

**Info-card** — A cream inset rectangle (`{components.info-card}`) placed on a dark slide. Carries a heading (h3-scale, dark ink) and a body block (body-scale, muted dark ink). The single most distinctive component in the system — used to puncture the green field with a piece of warm paper. Has no border, no shadow, no rounded corners; the tonal jump alone defines the edge.

**Stat cell** — A vertically-divided cell containing a large numerical value (`{typography.stat-value}`) above a one-line label (`{typography.body}` in muted cream). Cells line up in groups of three with a 1px right border separating each (last cell has no right border). The numerical value supports an inline `<em>` in orange for unit suffixes (e.g., the suffix in `4.7k`).

**Quote mark** — An oversized opening quotation glyph at `{typography.quote-mark}` size in warm orange. Sits above the quote text as a typographic ornament. Used only inside the quote slide type.

**Compare divider** — A 1px-wide vertical CSS column (not a border) between two side-by-side panels. Subtle by design — the contrast between the two panels does the visual work, not the divider.

**Image placeholder** — A void rectangle with a 1px hairline border, 6% cream background, and centered DM Mono label reading the placeholder name. Used until real photography is dropped in. The placeholder color is intentionally close to the background — image regions should not announce themselves.

## Do's and Don'ts

### Do
- Use the dark forest green (`{colors.bg-dark}`) as your default slide background. The system is dark-first; cream slides are a tonal break, not the default.
- Apply the wood-brown atmospheric glow to every dark slide. It is part of the surface, not an optional flourish.
- Pair Bricolage Grotesque display in mixed case with DM Mono labels in uppercase. The case contrast between the two faces is the system's typographic rhythm.
- Set headlines in cream (`{colors.ink-cream}`) on dark and dark ink (`{colors.ink-dark}`) on cream. Headlines never carry the orange accent.
- Use warm orange (`{colors.accent-orange}`) as the kicker color, the bullet em-dash color, and the inline `<em>` color. Orange is the punctuation, never the surface.
- Use the cream info-card (`{components.info-card}`) when a slide needs a piece of warm paper inset on the green field — the system's signature material-contrast move.
- Keep slides medium-sparse. One primary headline, one supporting paragraph, optionally one list of 3–5 short bullets is the right density.
- Use 1px hairline rules in low-opacity cream or dark ink for every structural divider. Borders never go thicker.
- Use the em-dash prefix in DM Mono for every bullet list. Never substitute a dot, check, or numeral.
- Render the `<em>` inside a numerical value in warm orange, font-style normal — that's how unit suffixes and emphasis digits read in this system.

### Don't
- Don't uppercase any Bricolage display, h1, h2, or h3 text. Display type is always mixed case. Uppercase is exclusively for DM Mono labels.
- Don't introduce a second accent color. The system has one accent (warm orange) and it cannot share that role.
- Don't add drop shadows, blur shadows, or elevation effects on any component. Depth is the atmospheric glow only.
- Don't round any corner on a structural element. Cards, panels, image frames, bars — all strict rectangles. Only the nav-dot circles are round.
- Don't fill a slide with three columns of bullets or stack five regions vertically. Mat reads as broken when crowded.
- Don't use orange as a background fill. Orange is inline-only.
- Don't use a serif face anywhere. There is no serif in this system; the rounded grotesque carries every editorial moment.
- Don't add a border around the info-card. The tonal jump between cream and forest green defines the edge — a border breaks the flat material reading.
- Don't use italic letterforms. The `<em>` tag is repurposed as an orange inline color switch and stays upright.
- Don't increase border weights above 1px. A 2px border breaks the hairline language of the system.

## Responsive Behavior

Mat targets a fluid `100vw × 100vh` viewport and uses `vw`/`vh` units for every typographic size, padding, and gap. The same composition renders correctly across 1280×720, 1920×1080, and 2560×1440 displays without breakpoints. Because all sizes are viewport-relative, content scales linearly — at wider viewports, both text and padding grow proportionally, so the visual density stays constant.

### Presenter Behavior
- Arrow Right / Arrow Down / Space advance to the next slide.
- Arrow Left / Arrow Up move back.
- Home jumps to the first slide; End jumps to the last.
- Touch swipe (horizontal) advances or reverses on mobile.
- Mouse wheel advances with a 1000ms debounce to prevent accidental multi-skip.
- Slides translate horizontally as a single flex strip with a 0s transition (the deck is configured for instant navigation, not animated transitions — the `--dur-slide` token is set to `0s`).

### Print Behavior
The template does not declare a `@media print` rule. To produce a PDF, use the browser's screenshot or printing tool; multi-slide PDF export requires manually triggering each slide.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Chinese Face | Weight | Why |
|---|---|---|---|
| Display / h1 / h2 / h3 / stat-value (Bricolage roles, 2.4–12vw) | 思源宋体 Noto Serif SC | 700 | Mincho heavy weight provides the structural mass that Bricolage 700–800 provides in Latin, while preserving the warm material register |
| Quote text / quote mark (3.4vw / 8vw) | 思源宋体 Noto Serif SC | 600–700 | Same Mincho voice for editorial moments |
| Lead / body / caption (DM Sans roles, 0.82–1.5vw) | 思源宋体 Noto Serif SC | 400 | Mincho body voice — calm and material; pairs with the wood-glow warmth |
| Info-card body / heading | 思源宋体 Noto Serif SC | 400 / 600 | Maintains the warm-paper-on-green contrast in Chinese |
| Label / kicker / chrome / footer (DM Mono roles, 0.7vw) | 思源宋体 Noto Serif SC | 500 with 0.05em letter-spacing | Replaces DM Mono — Chinese has no monospace tradition that reads as editorial chrome |

### Mixed-Content Strategy

Use **Strategy A** — switch the entire face stack to Noto Serif SC across all roles, replacing Bricolage Grotesque (display), DM Sans (body), and DM Mono (labels). Mat's identity does not depend on the specific Latin faces; it depends on the **dark forest green canvas with wood-brown atmospheric glow**, the **single warm orange accent**, the **cream info-card inset**, and the **1px hairline divider language**. Going all-Mincho in Chinese preserves every one of those identity markers cleanly without the baseline wobble that Strategy C would introduce on a viewport-fluid system. Stack:

```css
/* Bricolage roles (display, h1, h2, h3, stat-value, quote) */
font-family: 'Bricolage Grotesque', 'Noto Serif SC', sans-serif;
/* DM Sans roles (lead, body, caption) */
font-family: 'DM Sans', 'Noto Serif SC', sans-serif;
/* DM Mono roles (label, kicker, chrome, footer) */
font-family: 'DM Mono', 'Noto Serif SC', monospace;
```

The system's source currently lists `'Noto Sans SC'` as the CJK fallback — for Mat's material-tactile register, **swap to `'Noto Serif SC'`**. The Mincho face's warm letterforms match the wood-glow / forest-green atmosphere better than the geometric Noto Sans SC, which reads as too modern-clinical for this system.

### Loading

Replace the existing Noto Sans SC link with Noto Serif SC:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

These adjustments apply to **every CJK block** in this system, regardless of size or role:

- **Loosen line-height by 0.05–0.08.** CJK glyphs are full-width squares with more visual weight than Latin letterforms; line-heights tuned for Latin (0.88–1.1 on display, 1.5–1.65 on body) read as cramped in Chinese. Bump display to 1.0–1.2 and body to 1.7–1.85.
- **Remove negative letter-spacing on CJK headlines.** Bricolage display uses -0.025em to -0.03em tracking, which collides Chinese glyphs into each other. For CJK runs, set `letter-spacing: 0` — or a tiny positive `0.02em` if the headline feels visually packed.
- **Never `text-transform: uppercase` on CJK text.** Chinese has no case; the CSS property does nothing on Han glyphs but will silently break any mixed-script line where the DM Mono label portion was meant to be capitalized. (This matters here — every DM Mono label, kicker, chrome-band, and footer is `text-transform: uppercase`.)
- **Use Chinese full-width punctuation** (`，。：；！？「」『』（）`) inside Chinese sentences, not the Latin equivalents (`,.:;!?""''()`). Mixing punctuation systems within one sentence reads as a typesetting error.
- **No period (。) at the end of CJK headlines.** Chinese headlines follow the same rule as Latin — title-style lines drop terminal punctuation. Body paragraphs keep their 。
- **Apply Pangu spacing (盘古之白) at the boundary between CJK and Latin runs.** A space (or 0.25em margin) belongs between a Chinese character and an adjacent Latin word or digit, e.g. `2026 年 5 月` not `2026年5月`. Either type the spaces manually or use a `pangu.js`-style auto-spacer.
- **One font per sentence.** Don't switch between Noto Serif SC weight 400, 500, and 700 inside the same sentence — pick the weight that matches the role (headline = 700, body = 400, label = 500) and commit to it for the whole run.

### Aesthetic Notes for This System

Mat's whole voice is "industrial-design portfolio meets boutique product launch" — dark forest green with a wood-brown glow, cream type floating on the field, warm orange as the single accent. In Chinese, the system's identity does not depend on the Bricolage / DM Sans / DM Mono trio; it depends on the **environmental atmosphere** (the radial wood-glow on every dark slide), the **single-accent discipline** (orange only as kicker, em-dash bullet, inline emphasis), and the **cream info-card** as the signature material-contrast move. All of these translate without modification.

The bullet em-dash in orange works in Chinese identically — the em-dash character (—) is the same glyph in any script, and the orange Noto Serif SC at weight 500 prepended to a Chinese list item reads as a deliberate mark exactly as it does in Latin. Keep the bullet column in Noto Serif SC at weight 500 (replacing DM Mono); the warmth of the Mincho face matches the system's material-tactile register better than a sans-serif chrome face would.

The Bricolage rule "always mixed case, never uppercase" is interesting in Chinese — since Chinese has no case, the rule is automatically satisfied. But the system's uppercase rule for labels (DM Mono at 0.12em tracking) doesn't translate; in Chinese, labels should be **Noto Serif SC weight 500 with 0.05em positive tracking**, no `text-transform`. The positive tracking carries the chrome quality through weight and spacing alone.

The `<em>` inline-orange rule (for unit suffixes inside stat numerals) works in Chinese — a Chinese unit character like 「万」or 「亿」 inside `<em>` renders in warm orange and stays upright, exactly mirroring the Latin pattern. Use it the same way: `4.7<em>万</em>` for `4.7 万 (47k)`.

### Known CJK Gap

The Bricolage Grotesque "heavy, rounded grotesque with mechanical character" is one of Mat's most distinctive typographic moves in Latin — it's what gives the system its industrial-product-page voice. Chinese has no exact equivalent: Noto Serif SC at weight 700 provides structural mass but reads as more traditional / literary than Bricolage's rounded modernity. The Chinese rendering loses some of the industrial-design quality, partially compensated by the wood-glow atmosphere and the warm orange accent doing more of the personality work. For decks where the industrial register is critical (e.g., a product launch deck specifically about hardware or material design), consider supplementing Noto Serif SC with **思源黑体 Noto Sans SC at weight 800** for the largest display moments only (cover, hero) — the geometric heaviness of Noto Sans SC at 800 reads closer to Bricolage Grotesque 800 than Noto Serif SC does. Use sparingly to preserve the literary-material register elsewhere.

## Iteration Guide

1. Any new component sits on the dark surface as cream text; no card, panel, or frame wraps it unless it's the info-card move (cream-on-green tonal contrast).
2. Any new headline uses Bricolage Grotesque in mixed case, weight 700 (h2) or 800 (display/h1). Never reach for weight 500 on display.
3. Any new structural divider is a 1px hairline rule in low-opacity cream or dark ink. Never use a thicker or colored border.
4. Any new label, eyebrow, tag, or metadata text uses DM Mono uppercase with 0.12em tracking. Mono in mixed case does not exist here.
5. Any new bullet list uses the em-dash prefix in DM Mono colored warm orange. The marker face and color are non-negotiable.
6. Any new accent moment (a highlighted number, an emphasis word, a kicker) uses warm orange. Don't introduce a second accent.
7. Any new dark slide carries the atmospheric glow on `::before`. If you make a custom slide layout, replicate the pseudo-element or the slide will read flat.
8. If a slide needs a piece of warm paper to anchor it (a CTA, a summary, an attribution block), use the info-card. Don't invent a parallel card pattern.
9. Tonal break slides (cream backgrounds) are used once per deck for emphasis, not as a routine alternative to dark. The system reads as dark-default.

## Known Gaps

- The `--c-bg-dark-alt` (#2E3D30) variable is defined for a slightly lighter green surface but is not actively used in any selector. It's reserved for future layered-region work.
- The atmospheric glow is hardcoded to the bottom-right corner via the `::before` pseudo-element. Repositioning it requires editing the CSS rule directly; there's no token for glow position or intensity.
- The system loads four Google Fonts (Bricolage Grotesque, DM Sans, DM Mono, Noto Sans SC) — render parity depends on those fonts loading. The CJK fallback stack covers Chinese, but Japanese and Korean glyphs fall back to system serif/sans.
- The slide-transition duration is set to `0s` (instant). The `--ease-slide` and `--dur-slide` tokens exist for animation but are inert; if a deck needs animated transitions, the duration value must be raised.
- The vertical bar chart uses inline `style="height: XX%"` declarations on each bar fill. There is no data-binding layer; bar heights must be computed manually.
- The `.split-center` image region is fixed at 52vh height. Tall portrait imagery may need a layout-level override.
- Nav dots and slide counter use hardcoded `rgba(255,255,255,...)` values that don't adapt to the cream-slide variant — on cream slides, the white dots read as washed-out.
