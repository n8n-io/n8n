---
version: alpha
name: Vellum
description: An essay-pinned-to-a-wall presentation system — a single monochromatic field of deep periwinkle (#2A3870) with warm chartreuse-yellow type (#E8D85C) floating centered on it, every slide. Italic Cormorant Garamond carries every headline at all sizes — the italic serif is the personality, against the bold colorfield. DM Sans handles body in a quiet supporting role. Courier Prime mono provides the typed annotation voice — appearing as a "pin-note" attribution sitting in the bottom-left corner of every slide. The mood is gallery exhibition wall meets archive folder — quiet, monochromatic, deeply still. One color, two warm typefaces, zero motion.

colors:
  navy: "#2A3870"
  navy-alt: "#343F80"
  navy-deep: "#1F2858"
  navy-mid: "#34407A"
  yellow: "#E8D85C"
  yellow-2: "rgba(232,216,92,0.62)"
  yellow-3: "rgba(232,216,92,0.32)"
  emphasis-yellow: "#F5E168"
  teal: "#3A7878"
  border: "rgba(232,216,92,0.20)"

color-aliases:
  c-bg: navy
  c-bg-alt: navy-alt
  c-bg-light: navy
  c-fg: yellow
  c-fg-2: yellow-2
  c-fg-3: yellow-3
  c-fg-light: yellow
  c-emphasis: emphasis-yellow
  c-accent: teal
  c-border: border

typography:
  display:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 11vw
    fontWeight: 400
    fontStyle: italic
    lineHeight: 0.92
    letterSpacing: -0.01em
  h1:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 7vw
    fontWeight: 400
    fontStyle: italic
    lineHeight: 0.95
    letterSpacing: -0.01em
  h2:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 4vw
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.05
  h3:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 2.4vw
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1.15
  quote-text:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 3.2vw
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.25
  quote-mark:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 7vw
    fontWeight: 400
    fontStyle: italic
    lineHeight: 0.6
    color: "{colors.teal}"
  stat-value:
    fontFamily: "Cormorant Garamond, Noto Serif SC, Georgia, serif"
    fontSize: 5.5vw
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1
    letterSpacing: -0.02em
  lead:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.5vw
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.05vw
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 0.85vw
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: 0.72vw
    fontWeight: 400
    letterSpacing: 0.06em
  pin-note:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: 1.15vw
    fontWeight: 500
    lineHeight: 1.5
    color: "{colors.teal}"
    letterSpacing: 0.01em
  bar-val:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: 1.1vw
    fontWeight: 400
    lineHeight: 1

spacing:
  pad-x: 6vw
  pad-y: 6vh
  gap-lg: 5vh
  gap-md: 3vh
  gap-sm: 1.5vh

canvas:
  width: 100vw
  height: 100vh

components:
  pin-annotation:
    position: "absolute bottom-left, padding ~0.9 * pad-y from bottom and 1 * pad-x from left"
    typography: "{typography.pin-note}"
    color: "{colors.teal}"
    maxWidth: "22vw"
    description: "The system's signature element — a small stack of Courier Prime mono lines in dusty teal, sitting in the bottom-left of every slide. Holds slide counter (e.g., '03 / 09'), a short pinned label, and an optional second pin note. Functions as the 'tag stuck to the wall.'"
  kicker:
    typography: "{typography.label}"
    color: "{colors.teal}"
    description: "Small Courier Prime mono label in dusty teal, sits above a headline as a section marker."
  rule:
    width: 28px
    height: 1px
    background: "{colors.teal}"
    description: "A 28px hairline accent rule in dusty teal, used as a small kicker separator."
  chrome-bar:
    borderBottom: "1px solid {colors.border}"
    paddingBottom: "{spacing.gap-sm}"
    marginBottom: "{spacing.gap-md}"
    description: "Top chrome bar — mono label left, mono counter right, low-opacity hairline rule beneath."
  foot-bar:
    borderTop: "1px solid {colors.border}"
    paddingTop: "{spacing.gap-sm}"
    marginTop: "{spacing.gap-md}"
    description: "Bottom chrome bar — mirror of chrome-bar."
  bullet-list-numbered:
    listStyle: "none"
    counter: "list-counter"
    markerFontFamily: "{typography.label.fontFamily}"
    markerColor: "{colors.teal}"
    markerSize: "{typography.label.fontSize}"
    description: "Numbered list using CSS counters — the counter renders in Courier Prime mono at label size in dusty teal, with a 2em column for the number and 0.5em gap to the body."
  pin-stat:
    borderRight: "1px solid {colors.border}"
    padding: "{spacing.gap-md}"
    description: "Vertically-arranged centered stat (italic serif numeral above mono label), separated from neighbors by a single 1px low-opacity hairline. Last stat in row drops the border."
  pin-stat-val:
    typography: "{typography.stat-value}"
    color: "{colors.yellow}"
    description: "Large italic serif stat numeral (5.5vw italic Cormorant Garamond), centered in a pin-stat tile."
  pin-stat-label:
    typography: "{typography.caption}"
    fontFamily: "{typography.label.fontFamily}"
    color: "{colors.yellow-2}"
    description: "Small mono caption beneath a pin-stat numeral."
  compare-panel-dark:
    background: "{colors.navy-deep}"
    description: "Left compare panel — a slightly deeper navy to create internal contrast against the standard navy field."
  compare-panel-light:
    background: "{colors.navy-mid}"
    borderLeft: "1px solid {colors.border}"
    description: "Right compare panel — a slightly lighter navy with a hairline left-border, creating the two-shade panel pair."
  bar-fill-default:
    background: "{colors.yellow-3}"
    description: "Default chart bar fill — yellow at 32% opacity (the tier-3 muted color)."
  bar-fill-accent:
    background: "{colors.yellow}"
    description: "Highlighted chart bar — full yellow."
  chart-baseline:
    height: 1px
    background: "{colors.border}"
    description: "1px hairline baseline beneath chart bars."
  img-placeholder:
    background: "rgba(42,56,112,0.12)"
    border: "1px dashed {colors.border}"
    description: "Image slot — translucent navy fill with a dashed yellow-low-opacity border, centered mono label inside."
  quote-mark:
    typography: "{typography.quote-mark}"
    color: "{colors.teal}"
    description: "A 7vw italic Cormorant Garamond opening quote glyph in dusty teal, sitting centered above a centered pull-quote. The teal color is the system's only large-graphic accent."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Vellum is a **monochromatic essay-on-a-wall** presentation system. The visual premise is severe and tender at once: every slide is the same deep periwinkle navy field (`{colors.navy}` — #2A3870), with warm chartreuse-yellow type (`{colors.yellow}` — #E8D85C) floating centered on it. There is no alternate surface. There is no light/dark theme. There is no second background color. The field is the constant; the type and a single small annotation in the bottom-left corner are everything else.

The typographic premise is **italic serif as personality**. Cormorant Garamond runs every headline at every scale — display through h3, quote-text, stat-value — in italic at weight 400. The italic serif at large scale against the bold periwinkle field reads as gallery wall text: personal, considered, slightly intimate. DM Sans steps in for body and lead paragraphs in a quiet supporting role; the body is meant to recede so the italic serif headlines lead the eye. Courier Prime monospace plays the most distinctive role: it carries the "pin-note" — a small stack of typed-attribution lines that sits in the bottom-left corner of every slide. The pin-note in dusty teal looks like a typewriter label pinned to the wall beside the framed essay; it's the system's signature.

The color philosophy is **one field, two accents**. The field is `{colors.navy}`. Type is `{colors.yellow}` at full opacity for primary, 62% for secondary, 32% for tertiary. The first accent is `{colors.emphasis-yellow}` (#F5E168) — a brighter yellow used only for `<em>` emphasis inside italic headlines and for small accent text. The second accent is `{colors.teal}` (#3A7878) — a dusty desaturated teal used only for: the large quote-mark glyph, the pin-note text, kickers, the 28px accent rule, and list counter markers. The teal is the only non-yellow visible color in the system, and it appears in carefully limited contexts.

Depth is **flat and centered**. There are no drop shadows. No rounded corners. No gradients. Borders are 1px hairlines at 20% yellow opacity — barely visible, present mostly as faint structural marks rather than dividers. The compare layout is the single exception: it uses two slightly-different navy shades (`{colors.navy-deep}` and `{colors.navy-mid}`) to create a visible split panel, but even there, the difference is subtle. Animation is set to zero duration — slides do not transition. The system is, by design, completely still.

**Density philosophy: sparse and centered.** Vellum slides are pinned essays — each slide holds a small amount of content, centered in the canvas with significant breathing room above, below, and to the sides. A statement slide is one short headline centered on the field. A cover is a kicker, a display title, a lead sentence, and the pin-note in the corner — that's it. A list slide is four numbered rules in a 60% width column at center. The system reads as broken when crowded; the empty navy field around the content is structural, not negative space. It's wall.

**Key Characteristics:**
- Single monochromatic field — `{colors.navy}` (deep periwinkle) — on every slide. No light theme, no inversion.
- Italic Cormorant Garamond at weight 400 for every headline, every numeral, every featured serif moment.
- DM Sans for body and lead paragraphs; Courier Prime mono for chrome labels and the pin-note signature.
- Yellow type (`{colors.yellow}`) is the primary; brighter `{colors.emphasis-yellow}` is the only `<em>` color inside headlines.
- Dusty teal (`{colors.teal}`) is the second accent — used only for the large quote-mark glyph, the pin-note text, kickers, the 28px rule, and list counter markers.
- The pin-annotation (Courier Prime mono lines in dusty teal in the bottom-left corner of every slide) is the system's signature element.
- Content is centered on every slide — text-align center on most layouts, with content occupying 55–80% of canvas width.
- Hairline 1px borders at 20% yellow opacity for chrome separators; otherwise no borders, no shadows, no elevation.
- Zero motion — slide transitions and entrance animations are set to 0 duration. The system is meant to be still.
- Italic is structural, not decorative: serif italic at display scale is the system's identity, never the upright roman.

## Colors

### Palette

- **Navy** (`{colors.navy}` — #2A3870): Deep periwinkle field. The single surface across every slide. Slightly warmer than midnight, slightly cooler than ultramarine — sits in a contemplative blue register.
- **Navy Alt** (`{colors.navy-alt}` — #343F80): A slightly lifted navy for adjacent-surface differentiation. Rarely used in practice.
- **Navy Deep** (`{colors.navy-deep}` — #1F2858): The darker compare-panel shade. Used only on the left side of compare layouts to create internal panel contrast.
- **Navy Mid** (`{colors.navy-mid}` — #34407A): The lighter compare-panel shade. Used only on the right side of compare layouts.
- **Yellow** (`{colors.yellow}` — #E8D85C): The warm chartreuse-yellow primary text color. Warm, slightly green-biased — reads as aged vellum or chartreuse silk against the navy field.
- **Yellow 2** (`{colors.yellow-2}` — rgba(232,216,92,0.62)): Secondary text — yellow at 62% opacity. Used for lead paragraphs and descriptions.
- **Yellow 3** (`{colors.yellow-3}` — rgba(232,216,92,0.32)): Tertiary text — yellow at 32%. Used for muted captions, chart axis labels, default chart bars.
- **Emphasis Yellow** (`{colors.emphasis-yellow}` — #F5E168): Brighter yellow. Used only for `<em>` emphasis inside italic headlines (the `<em>` renders as roman non-italic in this brighter shade — see Signature Treatments) and for small accent text labels.
- **Teal** (`{colors.teal}` — #3A7878): Dusty desaturated teal. The system's second accent. Used only for: the large quote-mark glyph, the pin-note text, kicker labels, the 28px accent rule, list counter markers, and the bullet-list marker. The teal is the system's color signature beyond the yellow/navy binary.
- **Border** (`{colors.border}` — rgba(232,216,92,0.20)): Hairline border color — yellow at 20% opacity. Used on chrome bars, stat dividers, image placeholders.

### Defaults

- **Default surface**: `{colors.navy}` — every slide.
- **Default primary text color**: `{colors.yellow}`.
- **Default secondary text color**: `{colors.yellow-2}` (yellow at 62% opacity).
- **Default tertiary text color**: `{colors.yellow-3}` (yellow at 32%).
- **Default emphasis color (inside headlines)**: `{colors.emphasis-yellow}` — applied to `<em>` tags inside `display`, `h1`, `h2` (the emphasis renders roman non-italic in this brighter yellow, providing the system's `<em>` mechanism).
- **Default kicker / pin-note / accent rule color**: `{colors.teal}`.
- **Default large-graphic accent color**: `{colors.teal}` — used for the quote-mark glyph specifically.
- **Default border**: `{colors.border}` — yellow at 20% opacity. Hairline only.

There is no semantic mapping between colors. Teal is not "warning," yellow is not "highlight." Yellow is just the type; teal is the annotation voice; emphasis-yellow is just the emphasis flag. The palette is small enough that semantic roles aren't necessary.

## Typography

### Font Family

Vellum runs **three families** in carefully separated roles:

- **Cormorant Garamond** (`{typography.display.fontFamily}`) — an old-style serif with a beautifully expressive italic axis. Carries every headline (display through h3), every numeral (stat-value), every featured serif moment, the quote-text, and the quote-mark glyph. The headline tokens specify `fontStyle: italic` — italic is the default presentation, not an emphasis variant. Weight is 400 (regular) on display/h1/h2/quote-text; weight 500 on h3. Italic Cormorant Garamond at display scale against the periwinkle field is the system's defining visual moment.
- **DM Sans** (`{typography.body.fontFamily}`) — a clean humanist grotesque. Carries body, lead paragraphs, and bullet body text. DM Sans recedes behind the personality type — it's the substance, not the voice.
- **Courier Prime** (`{typography.label.fontFamily}`) — a typewriter-style monospace. Carries every chrome label, every slide counter, the pin-note in the bottom-left corner of every slide, list counter markers, and stat labels. Mono is the "typed-note voice" — it gives the system its archival/exhibition register.

The emotional split: italic serif for the personal essay voice (headlines, quotes); sans for the supporting substance (body); mono for the typed annotation (pin-notes, chrome). The mix of italic-serif + typed-mono is unusual and is the system's most distinctive typographic combination.

### Type Scale

| Token | Size | Family | Weight | Style | Use |
|---|---|---|---|---|---|
| `{typography.display}` | 11vw | Cormorant Garamond | 400 | italic | Cover hero at maximum scale |
| `{typography.h1}` | 7vw | Cormorant Garamond | 400 | italic | Chapter or statement headline |
| `{typography.quote-mark}` | 7vw | Cormorant Garamond | 400 | italic | Decorative opening quote glyph (in teal) |
| `{typography.stat-value}` | 5.5vw | Cormorant Garamond | 400 | italic | Large italic serif stat numeral |
| `{typography.h2}` | 4vw | Cormorant Garamond | 400 | italic | Primary slide headline |
| `{typography.quote-text}` | 3.2vw | Cormorant Garamond | 400 | italic | Pull-quote body |
| `{typography.h3}` | 2.4vw | Cormorant Garamond | 500 | italic | Sub-headline, compare panel title |
| `{typography.lead}` | 1.5vw | DM Sans | 400 | upright | Lead paragraph, intro sentence |
| `{typography.pin-note}` | 1.15vw | Courier Prime | 500 | upright | Pin-annotation text (in teal), bar-val accent |
| `{typography.bar-val}` | 1.1vw | Courier Prime | 400 | upright | Chart bar value label |
| `{typography.body}` | 1.05vw | DM Sans | 400 | upright | Default body paragraph |
| `{typography.caption}` | 0.85vw | DM Sans | 400 | upright | Caption, secondary text |
| `{typography.label}` | 0.72vw | Courier Prime | 400 | upright | Chrome label, slide counter, kicker, stat-label |

### Defaults

- **Default size for a primary section headline**: `{typography.h2}` (4vw).
- **Default size for a chapter or statement headline**: `{typography.h1}` (7vw).
- **Default size for a cover hero**: `{typography.display}` (11vw).
- **Default size for body paragraph**: `{typography.body}` (1.05vw).
- **Default size for a lead sentence**: `{typography.lead}` (1.5vw).
- **Default size for any chrome label, kicker, or mono metadata**: `{typography.label}` (0.72vw).
- **Default size for the pin-note**: `{typography.pin-note}` (1.15vw).
- **Default size for a statistical numeral**: `{typography.stat-value}` (5.5vw italic).
- **Default headline weight**: 400 italic.
- **Default headline color**: `{colors.yellow}`.

When unsure between sizes, lean larger. Vellum is sparse — the headline often is the slide, so it should be sized to anchor the empty field around it.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every headline is italic Cormorant Garamond at weight 400** (h3 is the exception at weight 500, still italic). Roman (non-italic) serif at display scale does not exist in this system except as `<em>` emphasis.
- **An `<em>` tag inside an italic headline (`display`, `h1`, `h2`) renders as upright roman Cormorant Garamond at weight 600 in `{colors.emphasis-yellow}`.** This is the system's emphasis mechanism — the inversion of italic to roman, plus the color shift, is non-negotiable. It is opposite the conventional "italic for emphasis" pattern; here, italic is the default and roman is the emphasis.
- **Every slide carries a pin-annotation in the bottom-left corner.** The pin-annotation is a stack of Courier Prime mono lines in `{colors.teal}` — typically a slide counter (e.g., "03 / 09") plus 1–2 short pin notes (label, attribution, or phrase). The pin-annotation is positioned absolute at `bottom: ~0.9 * pad-y`, `left: pad-x`, with max-width 22vw. A slide without a pin-annotation reads as a different system.
- **The pin-note typography uses Courier Prime at weight 500 in `{colors.teal}`** with letter-spacing 0.01em. Substituting any other face or color breaks the annotation register.
- **Kickers use Courier Prime mono at label size in `{colors.teal}`.** Sans kickers, italic kickers, or yellow kickers break the kicker convention.
- **The large quote-mark glyph (7vw italic Cormorant Garamond) renders in `{colors.teal}`, not yellow.** The teal quote mark is the only place a large-scale graphic is colored teal; everywhere else teal appears in small text (label-size).
- **Bullet-lists use a numbered counter rendered in Courier Prime mono at label size in `{colors.teal}`** — never bullet dots, never em-dashes. The numbered convention is the system's list signature.
- **Content is centered** on every layout (text-align: center, items aligned center on flex columns). Left-aligned headlines break the gallery-wall pinned-essay register.

### Typography Principles

The face ladder is fixed: italic serif (Cormorant Garamond italic) for headlines, numerals, quotes, and any personality moment; sans (DM Sans) for body and lead; mono (Courier Prime) for chrome, pin-notes, kickers, and list counters. Crossing the rails (e.g., using italic serif for body, or sans for headlines) breaks the gallery-wall register.

Italic is structural, not emphatic. Headlines default to italic; emphasis is achieved by switching to roman at weight 600 in `{colors.emphasis-yellow}`. This inverted pattern is the system's most distinctive typographic move.

Line-height runs tight at display scale (0.92 on display, 0.95 on h1) and opens to 1.5–1.65 on body. Letter-spacing on display is slightly negative (–0.01em); body and label are nearly neutral. Mono labels carry 0.06em tracking; pin-notes carry 0.01em (tighter than chrome labels).

Bold within body is not used. Underline is not used. Emphasis inside body text is achieved by the same roman-in-emphasis-yellow pattern as inside headlines — switch font-style from italic to upright at a heavier weight in the brighter yellow.

## Layout

### Canvas System

Vellum targets `100vw × 100vh` — full viewport. Each `.slide` flexes to fill the viewport exactly, and slides sit side-by-side in a horizontal strip. All sizes use viewport-relative units (`vw`, `vh`) so layout scales fluidly.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 6vw | Horizontal slide padding |
| `{spacing.pad-y}` | 6vh | Vertical slide padding |
| `{spacing.gap-lg}` | 5vh | Between major content sections |
| `{spacing.gap-md}` | 3vh | Between related elements |
| `{spacing.gap-sm}` | 1.5vh | Between tightly coupled elements |

Quote slides use 1.2× pad-y and 1.4× pad-x to give the centered quote extra breathing room. Compare layouts override slide padding to 0 because each panel carries its own internal padding.

### Chrome Frame

Standard slides carry chrome and foot bars (1px hairlines at 20% yellow opacity with mono labels). Chromeless layouts include cover, statement, quote, end, and any slide where the content is meant to float without structural framing — most of the deck.

The system's universal chrome element is the **pin-annotation in the bottom-left corner**, present on every slide regardless of whether the slide carries chrome/foot bars. The pin-annotation is the system's persistent identification mark.

### Content Centering

Every slide layout centers its content. Cover, statement, quote, end use `align-items: center; justify-content: center` with `text-align: center`. List, stats, chart use a centered body container at 60–80% width. Compare splits into two equal panels with each panel's content vertically centered.

Content rarely fills more than 70% of the canvas width or 60% of the canvas height. The remaining navy field is the pinned-wall context.

## Depth and Elevation

Vellum is **completely flat**. There are no drop shadows. No rounded corners. No gradients. No elevation system whatsoever.

What looks like differentiation comes from:
- **Color shifts within the navy family** — `{colors.navy-deep}` and `{colors.navy-mid}` on compare panels create a subtle two-shade pairing.
- **Hairline borders at 20% yellow opacity** — visible but quiet structural marks.
- **Opacity tiers in yellow** — the three opacity tiers (full, 62%, 32%) provide enough text-color contrast to create hierarchy without introducing additional colors.

The system is intentionally still. There is no motion (slide and entrance animation durations are set to 0). There is no shadow elevation. Slides are meant to be read like pages in a folio — one at a time, with no transition.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0 | Everything except navigation dots |
| 50% (circle) | Nav dots (deck-stage chrome only, not slide content) |

Vellum has **no rounded chrome**. Cards, panels, stat tiles, image placeholders, compare panels — all strict rectangles. The only round shapes are the deck navigation dots, which are part of the deck-stage UI rather than slide content.

### Border Weights

- **1px solid** in `{colors.border}` (yellow at 20% opacity) — the universal hairline. Used on chrome bars, foot bars, stat dividers, chart baselines, compare-panel left edges.
- **1px dashed** in `{colors.border}` — used on the image placeholder frame (the dashed border marks "this is a slot").
- **1px solid** at slightly higher opacity (rgba(232,216,92,0.18)) — used on the compare panel left/right divider.

There are no heavier borders in the system. Every line is 1px.

### Decorative Element Types

**Italic display headline** — Cormorant Garamond italic at weight 400, 4–11vw, centered on the slide in `{colors.yellow}`. The headline is the dominant visual element of every content slide.

**Pin-annotation** — a stack of 1–3 Courier Prime mono lines in `{colors.teal}`, positioned absolute at the bottom-left corner of every slide. Lines typically include a slide counter (e.g., "04 / 09"), a short typed label, and an optional second pin phrase. Lines stack with 0.3vh gap, max-width 22vw. This is the system's signature.

**Teal quote-mark glyph** — a 7vw italic Cormorant Garamond `"` in `{colors.teal}`, centered above a centered pull-quote. The only large-scale teal element in the system.

**Kicker** — Courier Prime mono at label size (0.72vw) in `{colors.teal}`, with 0.1em letter-spacing. Sits above a headline.

**28px accent rule** — a 28px × 1px horizontal bar in `{colors.teal}`. Used as a small kicker separator or chapter accent.

**Numbered list** — uses CSS `counter-reset: list-counter; counter-increment: list-counter` to render numbers in Courier Prime mono at label size in `{colors.teal}`, with a 2em column for the number and 0.5em gap to the body text (DM Sans lead).

**Pin-stat** — a centered column containing an italic serif stat numeral (5.5vw) above a mono caption in muted yellow. In a row, pin-stats are separated by single 1px hairlines at 20% yellow opacity; the last stat in row drops the border.

**Compare panel pair** — two side-by-side panels filling the slide. Left panel: `{colors.navy-deep}` background. Right panel: `{colors.navy-mid}` background with a 1px left-border. Each panel contains a small mono compare-label in `{colors.yellow-2}`, an italic h3, an italic lead, and a numbered list.

**Image placeholder** — a 1px-dashed rectangle in `{colors.border}` with a faint navy interior, centered Courier Prime mono label, minimum 28vh height. The dashed border is the "slot" indication.

**Chart bar** — a flat vertical rectangle in `{colors.yellow-3}` (default) or `{colors.yellow}` (accent). Bar values render in Courier Prime mono (`{typography.bar-val}`).

## Do's and Don'ts

### Do

- Fill every slide with `{colors.navy}` — the monochromatic field is the constant. There is no light alternate.
- Render every headline in italic Cormorant Garamond at weight 400, in `{colors.yellow}`. The italic serif at display scale is the system's identity.
- Place a pin-annotation in the bottom-left corner of every slide — Courier Prime mono in `{colors.teal}`, 1.15vw, max-width 22vw. The pin-annotation is the system's persistent signature.
- Use `<em>` inside headlines as upright roman (non-italic) at weight 600 in `{colors.emphasis-yellow}`. This italic-to-roman emphasis pattern is non-negotiable.
- Color kickers, list counter markers, the 28px rule, and the large quote-mark glyph in `{colors.teal}`. Teal is the second accent and appears only in those specific contexts.
- Center content on every slide. Text-align center, items aligned center. Left-aligned headlines break the pinned-essay register.
- Use Courier Prime mono for chrome labels, slide counters, pin-notes, list counter markers, and bar values. Mono is the typed-annotation voice.
- Number bullet lists with Courier Prime mono counters in `{colors.teal}`. Bullet dots and em-dashes do not exist in this system.
- Leave generous empty navy field around every content block. Sparse is the correct register.
- Pad slides with `{spacing.pad-x}` 6vw and `{spacing.pad-y}` 6vh, increasing 1.2–1.4× on quote slides.

### Don't

- Don't introduce a second background color. The navy field is the single surface. Even compare layouts use two near-identical navy shades, not contrasting backgrounds.
- Don't render headlines in upright roman. Italic at display scale is the default; roman appears only as the `<em>` emphasis mechanism.
- Don't add drop shadows, rounded corners, or gradients. The system is severely flat.
- Don't use yellow on the quote-mark glyph or as a kicker color. Those moments are teal; substituting yellow flattens the teal-as-accent role.
- Don't use bullet dots or em-dashes. Lists are numbered with Courier Prime mono counters in teal.
- Don't motion the slides. The deck is intentionally still — slide transitions and entrance animations are both 0 duration.
- Don't omit the pin-annotation. It is on every slide — chromeless or chromed — and removing it breaks the system's signature.
- Don't introduce a third typeface. The three families (Cormorant Garamond italic, DM Sans, Courier Prime) are the entire stack.
- Don't render small text in italic serif. Italic is for display scale only; body and caption stay upright sans.
- Don't crowd slides edge-to-edge. The empty navy field is structural — sparse content centered with breathing room above and below is the register.

## Responsive Behavior

Vellum targets a 1920×1080 viewport and uses viewport-relative units (`vw`, `vh`) throughout, so layout scales fluidly between 1280×720 and 2560×1440. There are no media queries and no fixed-pixel sizes except deck-chrome dots and the pin-annotation positioning offsets (which are pad-relative and scale with the slide padding).

### Scaling Behavior

- Display headline scales: 11vw → ~211px at 1920px viewport, ~141px at 1280px.
- Body text scales: 1.05vw → ~20px at 1920px, ~13px at 1280px.
- Pin-annotation positioning is relative to `pad-y` and `pad-x`, so it scales with slide padding.

### Presenter Behavior

The deck is JS-driven, but slide transitions are zero-duration (the system is intentionally still). Slides sit side-by-side and navigate via the deck-stage's translateX, but the user perceives instant cuts rather than animated transitions. There is no entrance animation system — `[data-anim]` attributes have no associated keyframes because animation durations are 0.

Nav dots and a slide counter sit fixed at the bottom of the viewport.

### Print Behavior

There is no embedded print stylesheet. Static export depends on the deck container being unwound for sequential page rendering.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face (default) | Chinese face | Weight | Notes |
|---|---|---|---|---|
| Display / h1 / h2 / quote-text / stat-value | Cormorant Garamond italic 400 | 霞鹜文楷 LXGW WenKai (LXGW WenKai TC) | 400 | LXGW WenKai's hand-written kaiti warmth mirrors Cormorant's italic personality — the only CJK face on CDN that carries an italic-like personal register. |
| h3 | Cormorant Garamond italic 500 | 霞鹜文楷 LXGW WenKai | 400 | Single-weight kaiti; the visual step from h2 to h3 must come from size, not weight. |
| Quote-mark glyph (7vw, teal) | Cormorant Garamond italic 400 | LXGW WenKai 400 or `「`/`『` in NSC | 400 | For Chinese quotes, replace `"` with `「` (full-width corner bracket) in LXGW WenKai or NSC at the same teal color. |
| Body / lead | DM Sans 400 | 思源宋体 / Noto Serif SC | 400 | The system body switches from sans to serif in CJK to preserve the literary register — DM Sans beside kaiti reads as a textbook in Chinese. |
| Pin-note / kicker / chrome label / list counter | Courier Prime 400–500 | Courier Prime + Noto Sans Mono CJK SC fallback | 400–500 | Pin-notes are usually in Latin; if Chinese appears, fall back to Noto Sans Mono CJK SC. The teal color is preserved. |

### Mixed-Content Strategy

This template uses **Strategy C (literary)**: keep the Latin face for English glyphs and let the CJK fallback in only when a Chinese character appears, via a stacked `font-family`. Cormorant Garamond italic is Vellum's defining brand identity — replacing it with a kaiti for every headline strips the system of its italic-serif-against-periwinkle moment. Letting Latin stay in Cormorant italic while Chinese drops into LXGW WenKai preserves both registers.

```css
font-family: 'Cormorant Garamond', 'LXGW WenKai TC', 'Noto Serif SC', Georgia, serif;  /* headlines */
font-family: 'DM Sans', 'Noto Serif SC', system-ui, sans-serif;                         /* body */
font-family: 'Courier Prime', 'Noto Sans Mono CJK SC', 'Courier New', monospace;        /* pin-note / chrome */
```

**Warning — baseline mismatch at display sizes.** Cormorant Garamond italic's optical center sits below LXGW WenKai's optical center, especially at 11vw display and 7vw h1. A phrase like `Vellum 羊皮纸` will show the Chinese characters floating slightly high relative to the italic Latin baseline. Mitigations:
- Add `font-feature-settings: "palt"` on the Chinese segment to tighten metrics.
- Wrap CJK in a `<span lang="zh">` with a `vertical-align: -0.05em` adjustment on display tokens (display, h1, h2, quote-text, stat-value). The italic Latin's slope makes the baseline mismatch more visible than in upright pairings, so the offset may need to be slightly larger than in non-italic systems.
- For pure-CJK headlines (no Latin), the issue disappears entirely.

### Loading

Add to `<head>` (Google Fonts hosts LXGW WenKai TC, Noto Serif SC, and Courier Prime):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@400;500&family=Courier+Prime:wght@400;700&family=LXGW+WenKai+TC&family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

LXGW WenKai TC is the Traditional Chinese cut on Google Fonts; it includes the full CJK Unified Ideographs range and renders Simplified Chinese cleanly. Noto Serif SC carries body text in Simplified Chinese with proper hinting. The Cormorant italic axis stays as-is for Latin.

### Universal CJK Adjustments

Apply on any element rendering Chinese content (typically scope via `:lang(zh)` or `<span lang="zh">`):

- **Line-height**: body 1.75–1.85 (Vellum's 1.65 DM Sans-default is close, but bump for CJK strokes); display 1.15–1.25 (looser than Latin 0.92–1.05 because CJK glyphs at 7–11vw need vertical breathing).
- **Letter-spacing**: 0 on CJK. Vellum's negative tracking (-0.01 to -0.02em) on display Latin is wrong for Chinese — CJK glyphs are pre-spaced; negative tracking causes overlap.
- **Text-transform**: no uppercase on CJK. Vellum doesn't use uppercase on Latin either (italic serif is sentence case throughout), so this is just confirming no parent rule attempts it.
- **Full-width punctuation**: use `，。：；！？` (full-width) not `,.:;!?` (half-width). For Chinese quotes, replace `"…"` with `「…」` or `『…』` (full-width corner brackets) — these are the conventional Chinese quote glyphs and match the teal quote-mark treatment of the system.
- **No period on display headlines**: Chinese headlines drop the terminal `。` — the headline's visual closure is enough.
- **Pangu spacing (盘古之白)**: insert a thin space between CJK and adjacent Latin/numerals. Write `使用 Claude` not `使用Claude`; `2024 年` not `2024年`. This is editorial convention in good Chinese typography and matches Vellum's careful gallery-wall register.
- **One font per sentence**: don't mix LXGW WenKai and Noto Serif SC inside a single line. Use one or the other for the entire run; switching mid-sentence creates a metric jolt that's especially visible in this sparse, centered layout.

### Aesthetic Notes for This System

LXGW WenKai is an excellent match for Vellum's gallery-essay register. The kaiti's hand-written warmth is closely related to Cormorant Garamond italic's intimate personal voice — both faces read as personal, considered, slightly intimate. Against the deep periwinkle field in warm chartreuse-yellow, LXGW WenKai at 7–11vw display reads as **handwritten chartreuse on a gallery wall** — arguably more poetic in Chinese than the original Cormorant treatment in English. The kaiti's stroke modulation pairs naturally with the yellow's warmth.

The `<em>` emphasis mechanism (italic → upright roman in `{colors.emphasis-yellow}` at weight 600) does not translate to CJK because LXGW WenKai has no separate italic/roman pair. The CJK equivalent for emphasis is to switch to **NSC 700 in `{colors.emphasis-yellow}`** — a heavier weight + brighter color creates the same "this is the moment" signal. Keep the upright-not-italic inversion logic by ensuring the emphasis weight differs visibly from the kaiti regular.

The pin-annotation (Courier Prime mono in teal, bottom-left corner) is the system's signature and works without modification in mixed-script decks. For pure-Chinese pin-notes, fall back to Noto Sans Mono CJK SC — the typewriter texture is partially preserved (mono spacing) but the typewriter character is lost. Consider keeping pin-notes in Latin (dates, slide counters, studio names) even on Chinese decks; this is conventional in Chinese gallery exhibition design and feels deliberate rather than incomplete.

The numbered-list convention (Courier Prime counters in teal) translates directly — use `01.` `02.` `03.` numerals from Courier Prime rather than Chinese numerals (`一、` `二、`) to preserve the typed-annotation register. The teal color and 2em column width are unchanged.

### Known CJK Gap

- LXGW WenKai has only a single weight (regular). The system's h3 (weight 500 italic) cannot step up in weight in CJK — the visual hierarchy step must come from size alone (h2 4vw → h3 2.4vw). For decks that need stronger sub-headline emphasis, consider NSC 500 as an h3 alternate.
- LXGW WenKai has no italic axis. Vellum's defining italic-as-default convention is impossible to reproduce in CJK — the upright kaiti is the closest analogue, which sacrifices the system's italic register for an alternate "handwritten warmth" register. This is the largest aesthetic loss in CJK adaptation.
- The italic-to-roman `<em>` emphasis mechanism does not exist in CJK. Substitute with NSC 700 in `{colors.emphasis-yellow}` for the equivalent "emphasis flag" effect.
- LXGW WenKai TC's Traditional-cut glyphs may render a small number of characters with Traditional forms (e.g., 設 instead of 设). For pure Simplified Chinese decks, prefer `font-family: 'Noto Serif SC'` as the primary CJK face and reserve LXGW WenKai for accent moments (cover title, chapter titles).
- The teal quote-mark glyph (`"` at 7vw in `{colors.teal}`) does not exist in CJK conventions. Use `「` or `『` (full-width corner bracket) at the same 7vw size in teal — this is the correct Chinese equivalent and preserves the system's "teal quote moment" signal.
- Baseline mismatch at display sizes (see Mixed-Content Strategy) is more pronounced in italic-Latin + upright-CJK pairings than in upright-upright pairings. Per-deck tuning is required for mixed-script covers.

## Iteration Guide

1. Any new headline uses italic Cormorant Garamond at weight 400 in `{colors.yellow}`. Italic is the default, not the emphasis.
2. Any emphasized phrase inside a headline switches to upright roman at weight 600 in `{colors.emphasis-yellow}`. The italic-to-roman inversion is the system's `<em>` mechanism.
3. Every new slide must include a pin-annotation in the bottom-left corner. The pin-annotation contains 1–3 lines of Courier Prime mono in `{colors.teal}`: typically a slide counter plus one or two short typed phrases.
4. Any new kicker, list counter marker, or 28px accent rule uses `{colors.teal}`. Teal is the second accent and is reserved for these specific elements.
5. Any new list is numbered with Courier Prime mono counters in teal. Dot and dash bullets do not exist in this system.
6. Any new layout centers its content. Text-align center, items aligned center. Left-aligned layouts break the gallery register.
7. Any new background introduces a system break — there is only one surface color, `{colors.navy}`. Compare layouts use slight navy variants but do not introduce a different hue.
8. Any new font is forbidden. Cormorant Garamond, DM Sans, Courier Prime are the entire stack.
9. Any new chart, table, or data display uses 1px hairlines at 20% yellow opacity. No heavier borders, no shadows, no rounded chrome.
10. Content density should be low and centered. If a slide feels crowded, remove content rather than adjusting padding or shrinking text.

## Known Gaps

- The three font families (Cormorant Garamond, DM Sans, Courier Prime) load from Google Fonts. If fonts fail, fallbacks are Georgia (for the italic serif), system-ui (for sans), and Courier New (for mono). The system loses much of its character without Cormorant italic — Georgia italic substitutes acceptably but with different proportions.
- Chinese fallbacks (Noto Serif SC, Noto Sans SC) are wired into the stacks but Noto Serif SC has no true italic — Chinese italic headlines will fall back to upright Noto Serif SC, losing the system's defining italic moment.
- The `.light` class is preserved for backwards compatibility but renders identically to `.dark` (both use the navy field). The `.light` token aliases (`--c-bg-light`, `--c-fg-light`) are pointed at the dark tokens.
- Animation durations are set to 0 — the system is intentionally still. The animation keyframes and `[data-anim]` infrastructure exist in the engine but are no-ops in Vellum. Re-enabling motion would require changing `--dur-slide` and `--dur-enter` in the token block.
- The pin-annotation positioning uses `bottom: calc(var(--pad-y) * 0.9)` which is just slightly inside the pad-y boundary; at very small viewports the pin-note may approach the slide edge.
- The compare panel uses two near-identical navy shades (`{colors.navy-deep}` and `{colors.navy-mid}`) — at low-contrast displays or in heavy ambient light, the panel split may be hard to perceive.
- The teal accent color (`{colors.teal}` — #3A7878) is desaturated and may read as a muted blue rather than a teal on some displays.
- The system has no light theme, no inversion, and no alternate surface. Decks that require a "reset" slide (a different color background to break a long sequence) must either accept the monochromatic limitation or step outside the design system.
