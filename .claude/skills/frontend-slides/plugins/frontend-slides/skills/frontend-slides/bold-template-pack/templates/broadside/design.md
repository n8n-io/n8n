---
version: alpha
name: Broadside
description: A protest-poster editorial system built on massive Barlow type and a single fire-orange environment color. The aesthetic is "ink on fire" — dark slides for documentation, orange slides for declaration. Display type is enormous (13vw, roughly 187px at 1440 width) in weight 900 lowercase, treating words as graphic elements rather than reading copy. The cultural reference is broadside printing, SPACE10 reports, and Wim Crouwel grids reinterpreted with one loud color and zero decoration.

colors:
  ink-black: "#111111"
  ink-black-alt: "#1A1A18"
  fire-orange: "#E85D26"
  cream: "#F0ECE5"
  cream-muted: "#888880"
  cream-hint: "#505048"
  border-dark: "#282826"
  ink-on-orange-muted: "rgba(17, 17, 17, 0.75)"
  ink-on-orange-hint: "rgba(17, 17, 17, 0.55)"
  ink-on-orange-faint: "rgba(17, 17, 17, 0.40)"
  ink-on-orange-border: "rgba(17, 17, 17, 0.20)"

color-aliases:
  c-bg: ink-black
  c-bg-alt: ink-black-alt
  c-bg-light: ink-black            # Broadside collapses "light" → dark; there are no cream slides
  c-bg-orange: fire-orange
  c-fg: cream
  c-fg-2: cream-muted
  c-fg-3: cream-hint
  c-accent: fire-orange
  c-border: border-dark

typography:
  display:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "13vw"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: -0.04em
  h1:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "7.5vw"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.03em
  h2:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "4.5vw"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  h3:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "2.8vw"
    fontWeight: 600
    lineHeight: 1.2
  lead:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "1.6vw"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "1.2vw"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "0.9vw"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.72vw"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.14em
    textTransform: uppercase
  stat-value:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "5.5vw"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.04em
  quote-mark:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "10vw"
    fontWeight: 900
    lineHeight: 0.6
  quote-text:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "3.8vw"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  fadelist-item:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "7.5vw"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.03em
  fadelist-title:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "10.5vw"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.04em

spacing:
  pad-x: "5.5vw"
  pad-y: "5.5vh"
  gap-lg: "3.5vh"
  gap-md: "2vh"
  gap-sm: "1vh"

canvas:
  width: 100vw
  height: 100vh

motion:
  ease-slide: "cubic-bezier(0.77, 0, 0.175, 1)"
  dur-slide: "0.8s"
  ease-enter: "cubic-bezier(0.16, 1, 0.3, 1)"
  dur-enter: "0.5s"

components:
  slide-chrome:
    layout: "flex row, justify space-between"
    paddingBottom: "{spacing.gap-sm}"
    borderBottom: "1px solid {colors.border-dark}"
    marginBottom: "{spacing.gap-md}"
    description: "Top chrome bar carrying section label on left, slide number/meta on right. Suppressed on cover, chapter, quote, and end slides."
  slide-foot:
    layout: "flex row, justify space-between"
    paddingTop: "{spacing.gap-sm}"
    borderTop: "1px solid {colors.border-dark}"
    marginTop: "{spacing.gap-md}"
    description: "Bottom chrome bar, mirrors top chrome. Same suppression rules."
  rule:
    width: 36px
    height: 2px
    background: "{colors.fire-orange}"
    description: "Stub accent rule. On orange slides this flips to {colors.ink-black}."
  rule-full:
    width: "100%"
    height: 2px
    background: "{colors.border-dark}"
  kicker:
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "{typography.label.fontSize}"
    letterSpacing: 0.14em
    textTransform: uppercase
    color: "{colors.fire-orange}"
    description: "Eyebrow above headlines. Orange on dark; dark-ink-at-55%-opacity on orange."
  tag:
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "{typography.label.fontSize}"
    letterSpacing: 0.14em
    textTransform: uppercase
    color: "{colors.fire-orange}"
    border: "1px solid {colors.fire-orange}"
    padding: "0.3em 0.8em"
    description: "Bordered mono tag. On orange slides flips to dark ink with 40%-opacity dark border."
  broadside-num:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "1.1vw"
    fontWeight: 500
    letterSpacing: 0.1em
    color: "rgba(17, 17, 17, 0.45)"
    description: "Catalogue-style slide number, typically anchored top-left on orange slides. On dark slides, color shifts to {colors.cream-hint}."
  stat-card:
    borderTop: "1px solid {colors.border-dark}"
    padding: "{spacing.gap-md} {spacing.gap-md} {spacing.gap-md} 0"
    description: "Top-border-only data card. Big orange numeral above body label above mono note."
  bullet-marker:
    content: "/"
    color: "{colors.fire-orange}"
    fontFamily: "IBM Plex Mono, monospace"
    fontWeight: 700
    description: "Slash glyph rendered via ::before on every bullet item. Orange on dark, dark-at-45%-opacity on orange."
  compare-panel-left:
    paddingRight: "calc({spacing.pad-x} * 0.55)"
    borderRight: "1px solid {colors.border-dark}"
  compare-panel-right:
    paddingLeft: "calc({spacing.pad-x} * 0.55)"
  compare-panel-orange:
    background: "{colors.fire-orange}"
    description: "Right-half panel filled with fire orange — the 'after' or payoff side in compare layouts."
  bar-track:
    height: "30vh"
    borderLeft: "1px solid {colors.border-dark}"
    description: "Vertical bar chart container. Bars are cream-hint by default; one bar per chart gets the .accent class for fire orange."
  bar-fill:
    background: "{colors.cream-hint}"
  bar-fill-accent:
    background: "{colors.fire-orange}"
  img-placeholder:
    height: "55vh"
    background: "rgba(255, 255, 255, 0.04)"
    border: "1px dashed {colors.border-dark}"
    textTransform: uppercase
    letterSpacing: 0.12em
    description: "Dashed-border placeholder shown when no image is wired. Same 55vh footprint as a real img."
  fadelist-stack:
    description: "Vertical stack of three display-weight words, opacities 1.0 / 0.5 / 0.22 top-to-bottom. The SPACE10 'before/during/after' treatment."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Broadside is a **protest-poster editorial system**. The defining premise: type is so large it stops behaving as text and starts behaving as graphic primitive. Display sizes at `13vw` (`{typography.display}`) put a single word at roughly 187px on a 1440-wide screen — wide enough that the eye scans letterforms before reading. This is the system's primary expressive instrument.

The typeface stack is monolithic. **Barlow** carries every text role from `{typography.display}` down to `{typography.body}` — there is no serif companion, no script accent, no secondary display face. The expressive range is achieved entirely through weight (400 to 900) and size, not face contrast. **IBM Plex Mono** is the only secondary face and it appears only in chrome: slide numbers, kickers, labels, tags, captions, and the bullet-list slash markers. **Noto Sans SC** sits in every font-family stack as the CJK fallback at matching weights. The voice is uniform, heavy, and lowercase — *Broadside does not use uppercase headlines.* That is a meaningful inversion of the brutalist norm.

The palette functions in two distinct registers. The **dark register** uses near-black canvas `{colors.ink-black}` with cream text `{colors.cream}` and `{colors.fire-orange}` as the singular accent — the orange is used only for emphasis (kickers, accent stats, bullet markers, the leading bar). The **orange register** flips the relationship entirely: `{colors.fire-orange}` becomes the full slide background, and the same dark `#111111` ink is used for headlines and body. There is no light/cream slide variant — the `.light` class is intentionally aliased to dark in the source. Cover and chapter slides default to the orange register; content slides default to dark.

Depth is **flat**. There are no drop shadows, no elevation tokens, no soft surfaces. Hierarchy is constructed entirely from type weight, type size, and 1px hairline dividers. The `slide-chrome` and `slide-foot` borders, the `stat-card` top borders, and the `compare-panel` divider are the system's only depth signals. Everything sits on a single plane.

**Density philosophy: low to medium.** Broadside is built for negative space. A correctly composed slide pairs one massive display moment with a 1–2 line caption and nothing else. Bullet lists are explicitly capped at three items — the system prizes density of impact over density of information. A slide that feels broken in this system is one where four columns of body copy compete for attention; the correct density is one statement, one rule, breathing room. Cover, chapter, and quote slides take this furthest, suppressing chrome entirely and leaving the type alone in the field.

**Key Characteristics:**
- Massive Barlow display type at weight 900 in **lowercase** — never uppercase on display elements.
- Two-register color system: dark slides with cream text, or orange slides with dark ink. No cream/white slides exist.
- `{colors.fire-orange}` is both accent (on dark) and environment (on orange) — never a secondary color, always *the* color.
- Single-typeface system on Barlow + IBM Plex Mono for chrome only. No serif, no script, no third face.
- 1px hairline dividers (`{colors.border-dark}` on dark; `rgba(17,17,17,0.2)` on orange) provide all hierarchy structure.
- Mono kickers, mono tags, mono catalogue numbers — the chrome voice is always IBM Plex Mono uppercase.
- Bullet lists use `/` glyph in mono as the marker, capped at three items per list.
- Flat plane — no shadows, no rounded surfaces, no gradient backgrounds.
- `{spacing.pad-x}` of 5.5vw + `{spacing.pad-y}` of 5.5vh creates a generous frame; type fills the remaining space.

## Colors

### The Two Registers
Broadside operates on a binary surface system. Every slide is either **dark** (near-black background, cream text, orange as singular accent) or **orange** (fire-orange background, dark-ink text, dark-ink as the muted-emphasis tone). There is no cream/paper register — the `.light` class is aliased to dark in the source. Choose one register per slide and commit to it.

### Palette
- **Ink Black** (`{colors.ink-black}` — #111111): The dark register's primary canvas, and the primary text color on orange slides. Slightly softer than pure black but reads as black. This is the universal "ink" of the system.
- **Ink Black Alt** (`{colors.ink-black-alt}` — #1A1A18): A secondary surface for the dark register, used when a region needs to feel slightly raised from the base canvas without breaking the flat plane.
- **Fire Orange** (`{colors.fire-orange}` — #E85D26): The signature. On dark slides it is the accent — kickers, accent stat values, bullet markers, the leading bar in a chart, the orange opening quote mark. On orange slides it is the entire environment. Saturation is high but the hue is warm rather than electric; it reads as protest poster, not safety vest.
- **Cream** (`{colors.cream}` — #F0ECE5): Primary text color on dark slides. Warm off-white, never pure white — the warmth softens the dark canvas and signals an editorial register.
- **Cream Muted** (`{colors.cream-muted}` — #888880): Secondary text on dark slides — supporting body, sub-headings, the muted half of a comparison.
- **Cream Hint** (`{colors.cream-hint}` — #505048): Tertiary text on dark — chart axis labels, source notes, slide numbers when not in mono context.
- **Border Dark** (`{colors.border-dark}` — #282826): The 1px divider color on dark slides. Barely visible against the canvas; provides structure without drawing attention.
- **Ink-on-orange overlays**: Dark ink at four opacities (75% / 55% / 40% / 20%) for body, hint, label, and border treatments on orange slides. These are the orange register's "muted" equivalents.

### Defaults
- **Default surface for content slides**: `{colors.ink-black}` (dark register).
- **Default surface for cover, chapter, statement-payoff, and section-divider slides**: `{colors.fire-orange}` (orange register).
- **Default headline color on dark surfaces**: `{colors.cream}`.
- **Default headline color on orange surfaces**: `{colors.ink-black}`.
- **Default body text color on dark surfaces**: `{colors.cream}`.
- **Default body text color on orange surfaces**: `rgba(17, 17, 17, 0.75)`.
- **Default accent color on dark surfaces**: `{colors.fire-orange}` — used for kickers, accent stat values, bullet markers, the lead bar in a chart, and the opening quote mark.
- **Default accent color on orange surfaces**: `{colors.ink-black}` — the dark ink itself becomes the contrast pop.
- **Default chrome border color**: `{colors.border-dark}` on dark; `rgba(17, 17, 17, 0.2)` on orange.

The orange register has no third color. When emphasis is needed on an orange slide, use weight or opacity contrast on the existing ink, not a new hue. Introducing a second accent color breaks the system.

## Typography

### Font Family
The system is monolingual on **Barlow** (with Noto Sans SC as the CJK fallback for identical role coverage). Every display, heading, lead, body, and caption token uses Barlow. The only secondary face is **IBM Plex Mono**, which is reserved entirely for chrome: slide numbers, kickers, tags, labels, captions in chart axes, bullet-list markers, image captions, and source notes. The contrast between Barlow's tight grotesque density and IBM Plex Mono's even monospace is the system's secondary typographic rhythm; the primary rhythm is Barlow's own weight and size axis.

Italic is not used. Underline is not used. The only emphasis mechanisms are weight, size, and color (orange accent on dark, or weight-only on orange).

### Display, Heading, and Body Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | 13vw | Barlow | 900 | Cover-scale display — the single dominant element on a slide where type *is* the composition |
| `{typography.fadelist-title}` | 10.5vw | Barlow | 900 | Oversized side-of-stage display in a fadelist composition |
| `{typography.quote-mark}` | 10vw | Barlow | 900 | The opening quotation glyph on a pull-quote slide |
| `{typography.h1}` | 7.5vw | Barlow | 800 | Chapter or section-opener title |
| `{typography.fadelist-item}` | 7.5vw | Barlow | 900 | Each stacked word in a three-stage fadelist treatment |
| `{typography.stat-value}` | 5.5vw | Barlow | 900 | Large data figure inside a stat card |
| `{typography.h2}` | 4.5vw | Barlow | 700 | Primary slide headline |
| `{typography.quote-text}` | 3.8vw | Barlow | 700 | Pull-quote body |
| `{typography.h3}` | 2.8vw | Barlow | 600 | Sub-headline or panel title inside a comparison |
| `{typography.lead}` | 1.6vw | Barlow | 400 | Lead paragraph, list items, prominent supporting copy |
| `{typography.body}` | 1.2vw | Barlow | 400 | Standard body paragraph |
| `{typography.caption}` | 0.9vw | Barlow | 400 | Image caption, footnote, source line |
| `{typography.label}` | 0.72vw | IBM Plex Mono | 500 | Chrome labels, kickers, tags, mono notes |

### Defaults
- **Default size for a primary content slide headline**: `{typography.h2}` (4.5vw).
- **Default size for a cover or chapter title**: `{typography.h1}` (7.5vw).
- **Default size for the single declarative display moment on a statement slide**: `{typography.display}` (13vw).
- **Default size for paragraph body**: `{typography.body}` (1.2vw); for the lead paragraph immediately following a headline, `{typography.lead}` (1.6vw).
- **Default size for any inline chrome element (label, kicker, tag, slide number, axis label)**: `{typography.label}` (0.72vw).
- **Default size for a hero numerical figure inside a stat card**: `{typography.stat-value}` (5.5vw).
- **Default weight for any Barlow display moment (h2 and above)**: 700+; for the largest display, 900.
- **Default weight for body**: 400.

When unsure, reach for `{typography.h2}` for the slide's primary text moment. `{typography.h1}` is reserved for chapter/section openers; `{typography.display}` for the rare moment where type is the entire composition.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **All Barlow display, heading, lead, and body text is set in sentence case (or true title case for proper nouns).** Uppercase Barlow at display weights does not exist in this system — it reads as a different design language entirely. The lowercase-display choice is the most distinctive single decision in Broadside.
- **All IBM Plex Mono chrome text is uppercase with at least 0.1em letter-spacing.** Mono labels, kickers, tags, slide numbers, axis labels, source notes, and bullet markers are always uppercase. The uppercase/lowercase split between Barlow body and mono chrome is the system's primary case rhythm.
- **All display tokens carry negative letter-spacing.** `{typography.display}` and `{typography.stat-value}` at -0.04em; `{typography.h1}` and `{typography.fadelist-title}` at -0.03em or -0.04em; `{typography.h2}` and `{typography.quote-text}` at -0.02em. Barlow at display weight without negative tracking reads as untreated.
- **All Barlow display elements run at weight 700, 800, or 900 — never lighter.** Lighter Barlow at display sizes loses the broadside density.
- **On orange slides, every Barlow display/h1/h2/h3 element is forced to `{colors.ink-black}`.** This is the "ink on fire" rule — cream-colored headlines on orange do not exist.
- **Every bulleted list item carries the orange `/` mono marker via `::before`.** Bullet discs, dashes, or numerals do not exist in this system.
- **Every kicker is uppercase IBM Plex Mono at `{typography.label}` size in `{colors.fire-orange}`** (or dark-ink-at-55%-opacity on orange).

### Typography Principles
The weight-900 + lowercase + negative-tracking + Barlow combination is the system's voice. Substituting uppercase, switching to weight 600, or removing the negative tracking each reads as a different system. The chrome's IBM Plex Mono uppercase + 0.14em-tracking is similarly inseparable.

Line-height collapses at scale: `{typography.display}` runs at 0.88, `{typography.h1}` at 0.9, `{typography.h2}` at 1.1, and only by `{typography.lead}` does it open to 1.5+. The compression at the top of the scale is what makes the display feel monolithic.

## Layout

### Canvas System
The canvas is `100vw × 100vh` — full viewport with hidden overflow. Slides sit side-by-side in a horizontal `#deck` flexbox; navigation translates the deck container horizontally rather than swapping `display`. All sizes are viewport-relative (`vw` / `vh`) — there is no fixed 1920×1080 grid.

### Padding and Gap Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 5.5vw | Outer horizontal padding on every slide |
| `{spacing.pad-y}` | 5.5vh | Outer vertical padding on every slide |
| `{spacing.gap-lg}` | 3.5vh | Large vertical spacing between major blocks |
| `{spacing.gap-md}` | 2vh | Standard spacing between sibling elements |
| `{spacing.gap-sm}` | 1vh | Tight spacing — kicker to headline, chrome bar inner gap |

The padding is deliberately tighter than a generic editorial system. Broadside's massive type needs the slide's edge to feel close, not distant — the type is supposed to crowd the frame.

### Chrome Frame
The system has an optional chrome frame consisting of two horizontal hairline bars: a top `slide-chrome` bar (label left, slide number right) and a bottom `slide-foot` bar (mirror). Both are 1px solid borders in `{colors.border-dark}` on dark slides, or `rgba(17, 17, 17, 0.2)` on orange. Internal padding/margin uses `{spacing.gap-sm}` and `{spacing.gap-md}`.

The chrome is **suppressed entirely** on the system's "declarative" slide types — cover, chapter, statement, quote, and end. Those slides remove all chrome and let the type occupy the whole field. Content slides (split, stats, list, compare, chart, diagram) keep the chrome.

A separate `broadside-num` element (mono, ~1.1vw, low-opacity) may also be placed independently of the chrome bar as a catalogue-style slide number anchored at the top-left of orange cover/chapter slides.

## Depth and Elevation

### Flat Plane (Only Technique)
Broadside is entirely flat. There are no drop shadows, no inner shadows, no blurred elevations, no rounded surface gradients. Every element sits on a single plane.

Hierarchy is constructed from:
- **Type weight + size contrast** — the dominant signal.
- **1px hairline dividers** — `slide-chrome`/`slide-foot` borders, `stat-card` top borders, `compare-panel` dividers, `bar-track` left border, `chart-baseline` baseline.
- **Color shift** — orange against ink, ink against cream, cream-muted against cream.
- **Negative space** — generous padding and intentional empty regions.

Introducing a `box-shadow`, a card with elevation, or a soft gradient breaks the system. The flatness is the editorial signal.

## Shapes and Treatment

### Border Radius
Border radius is **0px everywhere** except `nav-dot` (50% — the tiny navigation circles at the bottom). Cards, panels, tags, image placeholders, stat cards, chart bars — all rectangles with sharp corners.

### Border Weights
- **1px solid** — the only structural weight. Used on `slide-chrome`, `slide-foot`, `stat-card` top, `compare-panel` divider, `bar-track` left edge, `chart-baseline`, image captions, the `rule.full` divider.
- **1px dashed** — used only on `img-placeholder` to signal "no image wired".
- **2px solid** — used only on the small `rule` accent stub (36px wide) and the `chapter-rule` mark.

All borders are either `{colors.border-dark}` (dark slides), `rgba(17, 17, 17, 0.2)` (orange slides), or `{colors.fire-orange}` (the tag border on dark slides).

### Decorative Element Types

**Stub accent rule** — A 36×2px solid bar in `{colors.fire-orange}` (on dark) or `{colors.ink-black}` (on orange). Used as a visual "section break" mark above a chapter title, above a stat, or beside a kicker. Functions as Broadside's only ornament.

**Mono catalogue number** — A small IBM Plex Mono numeral anchored top-left on cover/chapter slides at low opacity (`rgba(17, 17, 17, 0.45)` on orange, `{colors.cream-hint}` on dark). Reads as a publication catalogue mark.

**Stat card** — A top-border-only data block: 1px solid border on top, no other borders, padded body containing `{typography.stat-value}` (large orange numeral on dark; dark ink on orange) above `{typography.body}` (label) above `{typography.caption}` (mono note in `{colors.cream-hint}` or dark-faint).

**Compare panel pair** — Two equal-width panels divided by a 1px vertical border. The right panel may optionally be filled with `{colors.fire-orange}` (`compare-panel-orange`) as the "after" / payoff side; the left panel remains transparent over the dark canvas.

**Vertical bar chart** — A `bar-track` container with `border-left` only (no other axes), bars dropping from the top with `cream-hint` fill, one bar per chart carrying the `.accent` class for fire orange. Axis labels in mono uppercase below the baseline.

**Fadelist** — A SPACE10-style composition: three stacked Barlow-900 words at descending opacity (1.0 / 0.5 / 0.22) paired with one oversized display title on the opposite side of the slide. Used for "before / during / after" or "past / present / future" narratives.

**Pull quote** — An oversized fire-orange `{typography.quote-mark}` glyph (with line-height 0.6 so it sits on the baseline rather than below), followed by `{typography.quote-text}` capped at ~78% of the column width, followed by a two-line `quote-attr` with name above mono role/affiliation.

**Bordered mono tag** — A small inline pill in IBM Plex Mono uppercase with a 1px solid border, padded 0.3em vertical × 0.8em horizontal. The border and text are both `{colors.fire-orange}` on dark; dark ink at 40% opacity on orange.

## Do's and Don'ts

### Do
- Set every Barlow display, heading, lead, and body element in sentence case. Lowercase display is Broadside's most distinctive single choice.
- Use IBM Plex Mono uppercase at 0.1em+ tracking for every chrome element: slide numbers, kickers, labels, tags, axis labels, source notes, bullet markers.
- Make `{colors.fire-orange}` the singular accent on dark slides — kickers, accent stat values, bullet `/` markers, the leading chart bar, the opening quote mark, the `rule` stub.
- Make orange the *full background* on cover, chapter, and declarative-payoff slides. Use it as environment, not just accent, on those slide types.
- Cap bullet lists at three items. Broadside prizes density of impact over density of information.
- Apply negative letter-spacing on every Barlow display moment — -0.04em on the largest, -0.02em on h2.
- Use 1px hairline borders (`{colors.border-dark}` on dark, `rgba(17,17,17,0.2)` on orange) for all structural division. They are the system's only hierarchy chrome.
- Suppress slide-chrome and slide-foot on cover, chapter, statement, quote, and end slides — let the type breathe edge-to-edge.
- Place the `broadside-num` catalogue number top-left on orange cover/chapter slides as a publication-style mark.
- Use the `/` mono glyph in fire orange as the bullet marker on every list item.

### Don't
- Don't uppercase Barlow at display or heading weights. Uppercase Barlow at 13vw reads as a different design system entirely.
- Don't introduce a second accent color. Orange is *the* color — adding a blue, yellow, or green accent breaks the protest-poster identity.
- Don't add drop shadows, blurred elevations, or rounded surfaces. Broadside is strictly flat — depth comes from type and 1px lines.
- Don't use cream-colored text on orange slides. The "ink on fire" rule is absolute: orange slides use `{colors.ink-black}` for headlines and body.
- Don't pair Barlow with a serif companion. The single-typeface monolith is part of the identity.
- Don't use border-radius on cards, tags, panels, or stat blocks. The only round shapes in the system are the small nav dots.
- Don't pack more than one display moment into a slide. Broadside is for one statement, one rule, breathing room — not magazine-style layered composition.
- Don't render chrome elements in Barlow. Chrome is exclusively IBM Plex Mono uppercase.
- Don't introduce a third surface register. There are two: dark and orange. A cream/paper slide does not exist.
- Don't use italic or underline. Emphasis is achieved through weight, size, or orange color only.

## Responsive Behavior

This is a viewport-fluid 1920×1080 presentation system that uses `vw`/`vh` units throughout. There are no fixed pixel breakpoints. Every typography token, padding value, and component dimension scales linearly with the viewport.

### Scaling Behavior
- Display headline (`{typography.display}`) scales from ~138px at 1066-wide viewports to ~250px at 1920-wide.
- Body text (`{typography.body}`) scales from ~13px to ~23px across the same range.
- Outer padding (`{spacing.pad-x}` 5.5vw) scales from ~59px to ~106px.
- All borders are fixed at 1px or 2px and do not scale.

### Presenter Behavior
- Slides advance via `ArrowRight`, `ArrowDown`, `Space`, or `PageDown`.
- Slides reverse via `ArrowLeft`, `ArrowUp`, or `PageUp`.
- Navigation translates the deck container horizontally with a `cubic-bezier(0.77, 0, 0.175, 1)` ease at 0.8s.
- Per-element entry animations (`data-anim="fade-up"`, `fade-in`, `reveal-right`, `reveal-left`, `scale-in`) replay every time a slide becomes `.is-active`, staggered by `data-delay` (0 through 6).
- Nav dots at bottom-center, mono slide counter at bottom-right.

### Print / Export
Not explicitly handled by the source. Each slide is a `100vw × 100vh` block; export workflows should target 1920×1080 PNG/PDF per slide.

## CJK & International Content

When using this template for Chinese (or other CJK) content, swap the Latin typeface stack for an equivalent Chinese pairing and apply universal CJK adjustments. All recommended Chinese fonts load via CDN — no install required.

### Recommended Chinese Pairing

| Role | Latin (default) | Chinese counterpart |
|---|---|---|
| Display / h1 / h2 / h3 / stat-value / quote / fadelist | Barlow 700–900 (lowercase, negative tracking) | 思源宋体 Noto Serif SC 900 |
| Lead / body / caption | Barlow 400 | 霞鹜文楷 LXGW WenKai 400 |
| Label / kicker / tag / slide number / bullet marker | IBM Plex Mono 500 (uppercase, 0.14em tracking) | 思源黑体 Noto Sans SC 500 (no transform, no tracking) |

### Mixed-Content Strategy

**Strategy A** — single CJK family per role with Latin glyph coverage built in. Use **思源宋体 Noto Serif SC** weight 900 for every display and heading role; use **霞鹜文楷 LXGW WenKai** weight 400 for body and lead text; use **思源黑体 Noto Sans SC** weight 500 for chrome (kickers, labels, slide numbers, bullet markers). All three faces ship Latin glyphs that pair cleanly with Chinese characters. The serif/handwritten/sans contrast loosely echoes Broadside's display/body/mono distinction even though the source uses Barlow throughout.

### Loading

Add to the template's `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700;900&family=Noto+Sans+SC:wght@400;500&family=LXGW+WenKai+TC&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

- **Line-height**: increase by ~15–25% from the Latin spec. Body 1.75–1.85 (up from 1.6), display 1.15–1.25 (up from the very tight 0.88–0.9 used on Barlow display). The Latin template compresses display to 0.6 on the quote-mark token; at that compression CJK characters overlap entirely. Open display to 1.0 minimum.
- **Letter-spacing**: set to 0 on every CJK run. The template's −0.02 to −0.04em negative tracking on Barlow display overlaps CJK strokes; the +0.14em positive tracking on IBM Plex Mono chrome reads as gappy on square glyphs.
- **Text transform**: don't apply `uppercase` to Chinese text — CJK has no case. Every IBM Plex Mono label, kicker, tag, slide number, and bullet marker uses `text-transform: uppercase` in the Latin original; remove for CJK runs.
- **Punctuation**: use full-width Chinese punctuation （，。：；！？「」（））.
- **No period on display headlines**: Chinese typography convention omits trailing 。 on display-scale headlines. Especially important for Broadside's massive display moments — a trailing 。 at 13vw is visually disruptive.
- **Space between CJK and Latin (盘古之白)**: insert an ASCII space between every Chinese character and adjacent Latin character or digit. Write `2024 大字海报` not `2024大字海报`.
- **One font per sentence**: 思源宋体 covers both CJK and Latin glyphs in a unified serif style for display; 霞鹜文楷 covers both for body. Don't let the browser fall back to Barlow mid-word for ASCII characters in a Chinese sentence.

### Aesthetic Notes for This System

Broadside's most distinctive single decision is **lowercase Barlow at weight 900 at 13vw display sizes**. The lowercase-display choice is what separates this system from generic brutalist decks. In CJK that signal disappears entirely — Chinese has no case. The system compensates because its identity is **80% structural + color**: the two-register surface system (dark / orange), the singular fire-orange accent, the flat plane, the 1px hairline dividers, the `/` mono bullet markers, the suppressed chrome on declarative slides, and the negative-space-as-composition philosophy all transfer cleanly.

The closest Chinese face to Barlow's "monolithic heavy grotesque" register is **思源宋体 weight 900** — but a serif heavy display rather than a sans heavy display. This is a deliberate register shift: heavy Chinese serif at protest-poster scale reads as "broadside printed-poster" (the system's actual cultural reference) more credibly than heavy Chinese sans, which reads more "corporate signage." For the body face, **霞鹜文楷 LXGW WenKai** brings a handwritten/calligraphic warmth that pairs with the editorial-protest register; if a more institutional body is needed, swap to 思源宋体 400.

Keep the chrome's "stamped metadata" voice by maintaining the small font size (0.72vw equivalent) and the orange color on kickers/labels. The IBM Plex Mono uppercase + tracked treatment loses both signals in CJK, but the orange color carries enough chrome-recognition on its own. The `/` bullet marker can stay as a Latin slash character even in Chinese contexts — it's a graphic mark, not a language element.

### Known CJK Gap

- **No CDN Chinese face matches Barlow's monolithic grotesque + lowercase identity.** Barlow's distinctive choice in this system is lowercase-display at heavy weights — and CJK has no equivalent expressive lever. The system's "protest-poster lowercase-shouting" character softens to "heavy-serif declarative." The two-register color system (dark / orange) and the singular fire-orange accent carry the protest-poster identity on their own.
- **No CDN Chinese monospace face for the chrome voice.** IBM Plex Mono's role (kickers, labels, slide numbers, `/` bullet markers) depends on monospaced rhythm + uppercase + 0.14em tracking. 思源黑体 weight 500 at 0 tracking is the closest match but loses the "catalogue mark" signal. Keep the orange color and the small font size; the color and scale do the chrome-recognition work.
- **霞鹜文楷 may not load on restricted networks.** The Google Fonts CDN serves the Traditional Chinese variant (LXGW WenKai TC) reliably; the Simplified variant is also available via cn-fontsource. Always include `'Noto Serif SC', serif` in the body stack as fallback.
- **The quote-mark glyph at 10vw with line-height 0.6 is a Latin-quote convention.** Chinese typography uses 「」 or 『』 framing rather than oversized opening-quote glyphs. For Chinese pull-quotes, consider replacing the oversized fire-orange quote-mark with a full-width 「 character at 8vw, or dropping the decorative quote glyph entirely and relying on the orange color + larger size to signal "this is a quoted passage."

## Iteration Guide

1. Every new content slide opens with a `kicker` in mono uppercase fire orange, followed by `{typography.h2}` headline in Barlow lowercase. Don't skip the kicker — it is the system's content-slide chrome signal.
2. Every cover, chapter, statement-payoff, or end slide uses the orange register. Don't use orange for content/data slides — orange is for declaration moments.
3. New stat cards use the `stat-card` top-border-only pattern with `{typography.stat-value}` in orange (on dark) or ink (on orange). Don't bottom-border or fully-border stat cards.
4. New bullet lists use the `/` mono marker in fire orange. Cap at three items.
5. New charts use the `bar-track` vertical-bar pattern with one accent bar per chart in fire orange; remaining bars in `{colors.cream-hint}`.
6. New quotes use the oversized fire-orange `{typography.quote-mark}` opening glyph, followed by `{typography.quote-text}` at max 78% width.
7. Headlines on orange slides are always `{colors.ink-black}`. There are no cream headlines on orange.
8. New tags use `tag` styling: 1px fire-orange border + fire-orange mono uppercase text on dark; dark-ink at 40% opacity on orange.
9. The system has nine canonical layout patterns — cover, chapter, statement, split, stats, quote, list, compare, end — plus fadelist, chart, and diagram extensions. New layouts should respect the chrome/no-chrome rule based on whether the slide is declarative or content-bearing.

## Known Gaps

- Broadside's `.light` slide class is intentionally overridden to dark — the source comments confirm "there are no cream/white slides." Any attempt to use `.light` will fall back to the dark register.
- Noto Sans SC is in every font stack as the CJK fallback but the system was not designed with mixed Latin/CJK headlines in mind; line-height behavior on CJK display sizes may need per-slide adjustment.
- The bullet marker glyph (`/`) is set in IBM Plex Mono via `::before` — replacing it with a different glyph requires editing CSS, not markup.
- The bar chart `bar-fill` heights are inline-styled via `style="height: NN%"` in the source; there is no data-binding layer.
- The fadelist and bar-chart layouts are not in the canonical "9 layout patterns" comment block; they are extensions added beyond the documented system.
- Image placeholders use a dashed `{colors.border-dark}` border and a mono uppercase label — replace with a real `<img src>` at the same 55vh height to maintain layout.
- The `c-fg-light` token exists in the palette (`#111111`) for "light theme primary text" but since the light theme is suppressed, this token is effectively unused in the rendered output.
- The system loads three Google Fonts families (Barlow, IBM Plex Mono, Noto Sans SC) with multiple weights — initial render requires successful font load to avoid Times New Roman fallback.
