---
version: alpha
name: Monochrome (Ivory Ledger)
description: A literary editorial system rendered in black ink on cream paper. Ultra-light geometric sans (Jost at weight 200–300) carries every headline; Lora italic serif handles quote text and insight-card titles; JetBrains Mono provides the structural chrome. There are no chromatic accents — every color in the palette is a graphite or cream tone, and "accent" simply means "darker ink." The aesthetic borrows from independent research reports, scholarly monographs, and the quietest end of contemporary editorial design — closer to a printed journal than a tech presentation.

colors:
  cream-paper: "#FAFADF"
  cream-paper-2: "#F2F2D2"
  cream-paper-3: "#F0F0D4"
  cream-warm: "#F5F0E4"
  ink-black: "#1A1A16"
  ink-graphite: "#5E5E54"
  ink-graphite-light: "#8A8A80"

color-aliases:
  c-bg: cream-paper
  c-bg-light: cream-paper
  c-bg-cream: cream-warm
  c-fg: ink-black
  c-fg-light: ink-black
  c-fg-2: ink-graphite
  c-fg-3: ink-graphite-light
  c-accent: ink-black
  c-border: ink-black
  c-border-light: ink-black

typography:
  display:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 8.5vw
    fontWeight: 200
    lineHeight: 0.96
    letterSpacing: -0.02em
  h1:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 5vw
    fontWeight: 200
    lineHeight: 1.1
    letterSpacing: -0.01em
  h2:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 3.2vw
    fontWeight: 300
    lineHeight: 1.2
  h3:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 2vw
    fontWeight: 400
    lineHeight: 1.3
  lead:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.5vw
    fontWeight: 300
    lineHeight: 1.65
  body:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.1vw
    fontWeight: 300
    lineHeight: 1.7
  caption:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 0.85vw
    fontWeight: 300
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 0.72vw
    fontWeight: 400
    letterSpacing: 0.12em
    textTransform: uppercase
  quote-serif:
    fontFamily: "Lora, Noto Serif SC, Georgia, serif"
    fontSize: 3.2vw
    fontWeight: 400
    lineHeight: 1.35
  insight-serif:
    fontFamily: "Lora, Noto Serif SC, Georgia, serif"
    fontSize: 2.8vw
    fontWeight: 400
    lineHeight: 1.15
  stat-value:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 5.5vw
    fontWeight: 200
    lineHeight: 1.0
    letterSpacing: -0.03em
  flow-num:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 3.5vw
    fontWeight: 200
    lineHeight: 1.0
    letterSpacing: -0.02em

spacing:
  pad-x: 8vw
  pad-y: 6vh
  gap-lg: 5vh
  gap-md: 3vh
  gap-sm: 1.5vh

canvas:
  width: 100vw
  height: 100vh

components:
  rule:
    width: 36px
    height: 1px
    background: "{colors.ink-black}"
    description: "A 36-pixel hairline accent rule. The system's signature small punctuation mark — appears under chapter labels, beside kickers, above stat values."
  rule-full:
    width: "100%"
    height: 1px
    background: "{colors.ink-black}"
    description: "Full-width 1px hairline rule for chrome bands, foot bands, and section dividers."
  kicker:
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "{typography.label.fontSize}"
    letterSpacing: 0.14em
    textTransform: uppercase
    color: "{colors.ink-graphite-light}"
    description: "Muted mono uppercase eyebrow label above a headline."
  tag:
    border: "1px solid {colors.ink-black}"
    padding: "0.3em 0.8em"
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "{typography.label.fontSize}"
    letterSpacing: 0.12em
    textTransform: uppercase
    description: "Bordered inline tag for version numbers, status labels."
  bullet-marker:
    content: "—"
    color: "{colors.ink-graphite-light}"
    fontFamily: "{typography.label.fontFamily}"
    description: "Em-dash in muted graphite via JetBrains Mono. The standard list mark; never a dot, never a check."
  insight-card:
    background: "{colors.cream-warm}"
    borderRadius: 16px
    padding: "3vh 2.5vw"
    description: "Tall rounded-rectangle card in cream tone (one of three near-identical creams). Holds a large Lora serif title and a Jost body block at the bottom."
  stat-cell:
    borderTop: "1px solid {colors.ink-black}"
    padding: "{spacing.gap-md} {spacing.gap-md} {spacing.gap-md} 0"
    description: "Rule-topped vertical cell with a 5.5vw weight-200 numeral, a Jost label, and a mono source note."
  timeline-dot:
    width: 8px
    height: 8px
    borderRadius: 50%
    background: "{colors.ink-black}"
    border: "2px solid {colors.cream-warm}"
    description: "Solid black dot with a cream border ring that punches through a horizontal connector rule."
  vtimeline-spine:
    width: 1px
    background: "{colors.ink-black}"
    description: "1px vertical rule that anchors a vertical timeline. Carries a 9px solid black dot at the top of each entry."
  pie-donut:
    width: "min(26vw, 42vh)"
    height: "min(26vw, 42vh)"
    borderRadius: 50%
    description: "Donut ring rendered by overlaying a same-color circular ::after pseudo on a conic-gradient or similar. Center cutout is the slide background."
  pyramid-bar:
    borderLeft: "2px solid {colors.ink-black}"
    background: "color-mix(in srgb, {colors.ink-black} N%, {colors.cream-paper})"
    description: "Horizontal pyramid level. Width grows down each level (36% → 100%); fill darkens up the pyramid via color-mix at increasing percentages."
  bar-fill:
    width: "100%"
    background: "{colors.ink-graphite-light}"
    opacity: 0.5
    description: "Vertical bar in muted graphite at half opacity. Accented variant uses solid ink-black at full opacity."
  img-placeholder:
    border: "1px solid {colors.ink-black}"
    background: "{colors.cream-paper-3}"
    color: "{colors.ink-graphite}"
    description: "Hairline-bordered cream void with a centered mono label. Used until photography is dropped in."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Monochrome (Ivory Ledger) is a **literary editorial system** built on a single material constraint: black ink on cream paper, and nothing else. The palette has eight tokens, but seven of them are tonal variations of cream or graphite. There is no chromatic accent — the "accent" color is just darker ink. The result is a system that reads as a carefully typeset research report or a quiet contemporary monograph, not a presentation.

The typeface stack is a three-voice editorial pairing. **Jost** at weights 200, 300, and 400 carries every display, headline, body, and label — its geometric sans construction stays calm at ultra-light weights and the contrast between weight 200 (display) and weight 300 (body) is the system's primary typographic rhythm. **Lora** italic serif is reserved for two specific moments: the body text of a pull-quote and the title of an insight card. The serif italic provides the only typographic warmth in the system — wherever it appears, it signals "this is the human voice." **JetBrains Mono** at weight 400 carries every structural marker: chrome labels, sidebar tags, version numbers, footer text, bullet dashes, axis labels, dates. Mono is uppercase and tracked at 0.12em or wider.

The palette functions in three roles. **Cream paper** (`{colors.cream-paper}` and its three near-identical sibling tones) is the canvas — slides are never white, always a warm off-yellow cream. **Black ink** (`{colors.ink-black}` — actually #1A1A16, a very dark olive-black) is every text moment, every border, every divider, every shape fill that isn't decorative cream. **Graphite** in two tones (`{colors.ink-graphite}` for secondary text, `{colors.ink-graphite-light}` for tertiary) handles muted copy. That's the whole color system.

Depth is achieved entirely through **1px hairline rules** and **generous whitespace**. There are no drop shadows, no gradients, no elevation, no atmospheric effects. When two regions need separation, a 1px black line divides them. When a region needs visual weight, it gets more padding, not a fill change. The insight-card surfaces are nearly indistinguishable from the page itself — the cards are defined by their corner radius and padding, not by a contrast jump.

**Density philosophy: sparse.** Ivory Ledger reads as elegant when generous whitespace dominates and a single typographic moment anchors the slide. The horizontal padding is set to 8vw (the most generous in the library), and content typically uses only the middle 60–70% of the canvas. A slide that fills 80% of its area with type reads as cramped and breaks the editorial reading. The system is asking the agent to leave space — to let a single Jost-200 headline carry an otherwise nearly-empty slide. When density is required (a research timeline, a two-column dense-text spread, a 12-row table), the system holds together only because the type is so light and the rules so thin that even dense content reads as airy.

**Key Characteristics:**
- Cream paper background (`{colors.cream-paper}`) on every slide — never white, never dark by default. The cream is the surface, not a stylistic choice.
- Ultra-light Jost (weight 200 for display, weight 300 for body) is the dominant typographic voice.
- Lora italic serif appears in two specific moments: pull-quote bodies and insight-card titles. Nowhere else.
- JetBrains Mono uppercase with 0.12em+ tracking handles every structural label, chrome tag, axis, and bullet marker.
- The system has no chromatic accent. The accent color is `{colors.ink-black}` — slightly darker ink.
- All structural separation is 1px hairline rules in black, plus the signature 36px short rule (`{components.rule}`) used as a small punctuation mark.
- The bullet list marker is an em-dash in muted graphite via JetBrains Mono.
- Generous 8vw horizontal padding — the most spacious in the template library.

## Colors

### Palette

- **Cream Paper** (`{colors.cream-paper}` — #FAFADF): The default surface. Warm off-yellow, never pure white. Every slide background is this color or a near-identical variant.
- **Cream Paper Alt** (`{colors.cream-paper-2}` — #F2F2D2): A slightly deeper cream for inset surfaces. Used sparingly — the difference from the default cream is barely perceptible.
- **Cream Paper Deep** (`{colors.cream-paper-3}` — #F0F0D4): The image-placeholder fill. Slightly more saturated cream that distinguishes a void rectangle from the slide surface.
- **Cream Warm** (`{colors.cream-warm}` — #F5F0E4): The insight / timeline slide background, a warmer tone that signals these slides as related sub-aesthetic moments within the deck.
- **Ink Black** (`{colors.ink-black}` — #1A1A16): Every text moment, every rule, every divider, every border. A very dark olive-black, not pure black — chosen for warmth against the cream paper.
- **Ink Graphite** (`{colors.ink-graphite}` — #5E5E54): Secondary text color. Used for muted lead copy, body paragraphs in dense slides, and labels that need to step back from headline weight.
- **Ink Graphite Light** (`{colors.ink-graphite-light}` — #8A8A80): Tertiary text. Used for kickers, axis labels, source notes, bullet markers, footer chrome — anything that should read as barely-present structural metadata.

### Defaults

- **Default surface background**: `{colors.cream-paper}`. The system is single-surface by default.
- **Default primary headline color**: `{colors.ink-black}`. Headlines never appear in graphite or any other tone.
- **Default body text color**: `{colors.ink-black}` for primary copy on light slides; `{colors.ink-graphite}` for muted lead paragraphs.
- **Default kicker / label color**: `{colors.ink-graphite-light}` — the most muted graphite. Labels should sit back, not lead.
- **Default border / divider color**: `{colors.ink-black}` — every divider is solid black. There is no muted border tone.
- **Default rule weight**: 1px. The system never uses thicker rules.
- **Default "accent" color**: `{colors.ink-black}` — the same as the primary text color. Accent in this system means darker emphasis ink, not a chromatic switch.
- **Default warmer-surface treatment for insight or timeline groups**: `{colors.cream-warm}` — used to tonally identify a group of slides without breaking the monochrome palette.

The system has no warm/cool pairing, no semantic color (no red for warning, no green for success), no chromatic emphasis. Every emphasis comes from typography (size, weight, italic switch) or from a rule, never from color.

## Colors (continued)

The three "insight card surfaces" (`--c-card-a`, `--c-card-b`, `--c-card-c`) are all near-identical cream tones (#FAFADF, #F5F0E4, #FAFADF). They are intentionally collapsed — the card distinction is meant to come from padding and serif title, not surface color. Treat the three card-surface tokens as effectively one surface.

## Typography

### Font Family

The system loads five faces: **Jost** (weights 200, 300, 400, 500, 600) carries all sans display and body; **Lora** (italic and roman, weights 400, 500, 600) carries only the pull-quote text and the insight-card title; **JetBrains Mono** (weights 300, 400, 500) carries every structural label; **Noto Serif SC** is the CJK fallback for Lora; **Noto Sans SC** is the CJK fallback for Jost.

The emotional register is deliberate:
- Jost reads as **quiet, geometric, almost mathematical** at weight 200. It is the system's editorial voice.
- Lora italic reads as **literary, personal, hand-set**. It signals "this is the voice of a human or a quote" — wherever it appears, the tone shifts from analytical to lyrical.
- JetBrains Mono reads as **archival, indexical, structural**. It is the system's catalog-card voice — version numbers, dates, axis labels, anything that's metadata rather than message.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | 8.5vw | Jost | 200 | Cover or opening hero display — generous and airy |
| `{typography.h1}` | 5vw | Jost | 200 | Chapter-opening or section-break headline |
| `{typography.h2}` | 3.2vw | Jost | 300 | Primary content-slide headline |
| `{typography.stat-value}` | 5.5vw | Jost | 200 | Large numerical figure inside a stat cell |
| `{typography.quote-serif}` | 3.2vw | Lora italic | 400 | Pull-quote body text |
| `{typography.insight-serif}` | 2.8vw | Lora | 400 | Insight-card title |
| `{typography.h3}` | 2vw | Jost | 400 | Sub-headline, region heading, flow-step title |
| `{typography.lead}` | 1.5vw | Jost | 300 | Lead paragraph or large bullet item |
| `{typography.body}` | 1.1vw | Jost | 300 | Body paragraph |
| `{typography.caption}` | 0.85vw | Jost | 300 | Image caption, source note, fine print |
| `{typography.label}` | 0.72vw | JetBrains Mono | 400 | Kicker, chrome label, axis label, version tag |
| `{typography.flow-num}` | 3.5vw | Jost | 200 | Large step numeral in a process diagram |

### Defaults

- **Default primary section headline**: `{typography.h2}` (3.2vw at weight 300). Don't reach for `{typography.h1}` for a standard content slide — that size is for chapter breaks.
- **Default opening or cover display**: `{typography.display}` (8.5vw at weight 200).
- **Default body paragraph size**: `{typography.body}` (1.1vw at weight 300).
- **Default lead paragraph size**: `{typography.lead}` (1.5vw at weight 300) when a paragraph is the single supporting block under a headline.
- **Default label / kicker size**: `{typography.label}` (0.72vw).
- **Default weight for any display element**: 200. Jost at 200 is the system's display voice.
- **Default weight for body**: 300.

When unsure, the canonical pairing is `{typography.h2}` (weight 300) for the headline + one paragraph at `{typography.lead}` (weight 300) for the supporting block. The narrow weight gap (300 vs. 300, distinguished only by size) is correct — Ivory Ledger does not lean on heavy weight contrast.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Jost display, h1, h2, h3 element is mixed case** — never uppercase. Uppercase is reserved exclusively for JetBrains Mono labels.
- **Every label, kicker, chrome tag, footer, axis label, and source note uses JetBrains Mono uppercase with at least 0.12em positive tracking** (most are 0.14–0.18em). Mono in sentence case does not exist here.
- **The pull-quote body is always Lora italic.** A pull-quote in Jost reads as a different design system.
- **The insight-card title is always Lora roman (not italic).** The serif face is the card's defining visual signal.
- **The bullet-list marker is always an em-dash in JetBrains Mono colored `{colors.ink-graphite-light}`.** Never a dot, never a check, never a numeral.
- **Stat values, display headlines, and flow numerals all use Jost weight 200 with negative letter-spacing.** The combination of ultra-light weight and tight tracking is the system's display signature.
- **Headlines and body text are colored `{colors.ink-black}`; muted lead is `{colors.ink-graphite}`; labels are `{colors.ink-graphite-light}`.** Headlines never carry the graphite tones.

### Typography Principles

The rhythm of Ivory Ledger is **ultra-light Jost + Lora italic in two specific moments + tracked mono labels**. Switching Jost to a heavier weight (500+) for a headline reads as a different system. Setting body text in Lora reads as a different system. Setting a label in Jost rather than JetBrains Mono reads as a different system. The role of each face is narrow and unmoving.

Italic is used exclusively in Lora (pull-quote body) and not in Jost. Underline is not used anywhere. Bold is not used to emphasize body text — emphasis inside a paragraph is achieved either by Lora italic switch (rare) or by isolation through whitespace.

## Layout

### Canvas System

The system targets a fluid `100vw × 100vh` viewport with all sizes in `vw`/`vh`. The deck is a horizontal flex strip with slide-to-slide transitions at 0.9s with a smooth easing curve. Animation tokens (`fade-up`, `fade-in`, `reveal-right`, `reveal-left`, `scale-in`) are available with stagger delays via `data-delay` attributes — these run on each slide entrance.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 8vw | Slide horizontal padding (the most generous in the library) |
| `{spacing.pad-y}` | 6vh | Slide vertical padding |
| `{spacing.gap-lg}` | 5vh | Between major content sections |
| `{spacing.gap-md}` | 3vh | Between related elements |
| `{spacing.gap-sm}` | 1.5vh | Between tightly related elements |

The slide container reserves an additional 3.5vw on the left for a vertical sidebar element (currently disabled in the source — see Known Gaps), so total left padding is ~11.5vw. Content sits inside this generous gutter system.

### Chrome Frame

Most content slides carry a **chrome header** and **chrome foot**: each is a `flex space-between` row of two JetBrains Mono labels, separated from the slide body by a 1px solid black rule. Cover-style, chapter-break, quote, and closing slide types suppress chrome and foot entirely.

### Disabled Sidebar

The CSS defines a `.slide-sidebar` element — a thin vertical 1px black line in the left gutter with rotated mono labels reading bottom-to-top. The source explicitly disables this with `display: none !important`, with a comment noting it reads as "visual noise." The styling remains in the CSS as a dormant artifact; do not re-enable without intentional design rationale.

## Depth and Elevation

### No Shadows, Hairline Rules Only

The system uses **zero box-shadow declarations** on any structural element. Depth is created through three mechanisms:

1. **1px hairline rules in solid `{colors.ink-black}`** — under chrome bands, above foot bands, between compare panels, above stat cells, across timeline tracks, across chart baselines. The rule is the divider, the separator, the structural mark.
2. **The 36px short rule** (`{components.rule}`) — a small punctuation mark used under chapter labels, beside kickers, or as a delicate accent break.
3. **Generous whitespace** — the primary depth signal is the 8vw horizontal gutter and the space around each typographic moment.

### No Atmospheric Effects

There are no gradients, no glows, no textures, no grain overlays. Even the donut chart center cutout is just a same-color circle laid over the conic ring — there is no contrast jump.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0px | Every structural element — image placeholders, stat cells, compare panels, tables, chart areas |
| 16px | Insight cards only |
| 50% (circle) | Pie/donut chart shape, timeline-dot small circles, vt-spine dot |
| 999px (pill) | None — pills are not used |

The system is dominantly square-cornered. The 16px rounded radius on insight cards is the only structural soft edge and is the visual signal that distinguishes a card from a region.

### Border Weights

- **1px solid `{colors.ink-black}`** — the universal structural rule weight. Used for every divider, every chrome rule, every chart axis, every cell border.
- **2px solid `{colors.ink-black}`** — used only on the pyramid-bar left edge (`{components.pyramid-bar}`) as a slightly stronger left-anchor for that specific chart type.

There is no thicker border weight, no dashed border (except a `1px dashed` graphite hint inside dense charts), no colored border.

### Decorative Element Types

**36px short rule** — A small 36px-wide × 1px-tall solid black horizontal accent rule. The system's signature punctuation mark. Used under a chapter number, beside a kicker, or as a delicate section break.

**Kicker / mono eyebrow** — A muted JetBrains Mono uppercase label in `{colors.ink-graphite-light}` placed above a headline. The eyebrow is barely-there by design.

**Bordered tag** — A small inline element with a 1px black border and 0.3em × 0.8em padding, containing a mono uppercase string. Used for version tags or status labels.

**Bullet em-dash** — A `—` glyph in JetBrains Mono colored `{colors.ink-graphite-light}`, prepended to each list item via a CSS grid marker column (`grid-template-columns: 1.2em 1fr`).

**Insight card** — A 16px-rounded rectangle (`{components.insight-card}`) on a slightly warmer cream surface. Carries a Lora roman title (2.8vw weight 400) and a Jost body block (weight 300) pushed to the bottom of the card. The card is identified by its rounded corners and its serif title, not by a color contrast.

**Stat cell** — A vertical region with a 1px solid black top rule (`{components.stat-cell}`), containing a 5.5vw Jost-200 numeral, a Jost label, and a small mono source note. Three stat cells side by side is the canonical arrangement.

**Timeline dot** — An 8px solid black circle with a 2px cream-warm border ring (`{components.timeline-dot}`) that punches through the horizontal connector rule. The ring color matches the warm-cream slide surface so the dot reads as floating on the rule, not crossing it.

**Vertical timeline spine** — A 1px-wide vertical solid black line (`{components.vtimeline-spine}`) with 9px solid black dots at the top of each entry. Used in long chronological lists.

**Pie / donut chart** — A circle (`{components.pie-donut}`) at min(26vw, 42vh) size, with a same-color circular cutout via `::after` to create the donut ring. The chart sits beside a legend column.

**Pyramid bar** — A horizontal bar (`{components.pyramid-bar}`) with a 2px solid black left edge and a tonal cream-to-graphite fill computed via `color-mix(in srgb, ink-black N%, cream-paper)` where N ranges from 4% to 55% across the five levels. Widths step from 36% (top, darkest) to 100% (bottom, lightest).

**Vertical bar chart** — A muted graphite (`{colors.ink-graphite-light}`) bar at 50% opacity for default bars; a solid black bar at full opacity for the highlighted bar. The chart has a 1px black left axis and a 1px black baseline.

**Image placeholder** — A 1px-bordered cream-paper-3 rectangle with centered mono label. Used until photography arrives.

**Process flow with no arrows** — Flow diagrams in this system are explicit about not using arrows between steps. Whitespace between steps implies sequence; the system declares this with a comment in the CSS.

## Do's and Don'ts

### Do
- Use the cream paper background (`{colors.cream-paper}`) on every slide. The single-surface canvas is the system's foundation.
- Set every headline in `{colors.ink-black}` and let the weight (Jost 200) and size do the work. Headlines never need a chromatic shift.
- Use Jost at weight 200 for any display moment. The ultra-light weight is the system's defining typographic voice.
- Reach for Lora italic only when the text is a pull-quote body; reach for Lora roman only when it's an insight-card title. The serif's two roles are non-overlapping.
- Use JetBrains Mono uppercase with at least 0.12em tracking for every structural label, axis tag, footer, and bullet marker. Mono is the catalog-card voice.
- Render every structural divider as a 1px solid black rule. There is no thicker, no muted, no dashed border in the system.
- Apply the em-dash marker in muted graphite via JetBrains Mono for every bullet list.
- Leave generous whitespace. Content should sit comfortably in the middle 60–70% of the canvas; cramming content to the edges breaks the editorial reading.

### Don't
- Don't introduce a chromatic color. Red, blue, green, yellow do not exist in this system. The accent is darker ink.
- Don't use heavy weights (Jost 500, 600, 700) for headlines. The system reads as broken if display type weighs more than 300.
- Don't put a pull-quote in Jost. The Lora italic body is the quote's identity — switching to sans collapses the typographic distinction.
- Don't use box-shadow on any element. The system has no elevation.
- Don't use a card surface with chromatic contrast. Insight cards are identified by corner radius and serif title; a colored fill breaks the monochrome reading.
- Don't crowd a slide. The horizontal padding is 8vw for a reason — content needs to breathe.
- Don't use bold to emphasize body text. Inline emphasis is rare; when used, switch to Lora italic, not weight increase.
- Don't substitute the em-dash bullet marker with a dot, check, arrow, or numeral. The em-dash is the system's only list mark.
- Don't enable the disabled sidebar (`.slide-sidebar`). It's hidden intentionally — re-enabling it adds visual noise that the system was tuned to remove.
- Don't round any element other than insight cards (16px) or true circles (dots, donut). Square corners are the structural default.

## Responsive Behavior

The system is viewport-fluid by design. All sizes use `vw`/`vh` so the same composition renders correctly across any 16:9 viewport without breakpoints. At smaller viewports, both typography and padding scale linearly so the visual density and the negative-space ratio stay constant.

### Presenter Behavior
- Standard keyboard navigation: arrows, space, Home, End.
- Touch swipe for mobile.
- Mouse wheel with debounce to prevent multi-skip.
- Slide-to-slide transitions animate over 0.9s with a smooth easing curve.
- Each slide can declare entrance animations on individual elements via `data-anim` (fade-up, fade-in, reveal-right, reveal-left, scale-in) with stagger delays via `data-delay="N"` where N maps to a discrete delay step (0s, 0.08s, 0.18s, 0.3s, 0.44s, 0.6s, 0.78s, 0.96s).
- Elements with `[data-anim]` start invisible (opacity:0) and animate on `.is-active` — re-visiting a slide replays the entrance.

### Print Behavior
The template does not declare a `@media print` rule. Browser-driven PDF export will capture only the active slide; multi-slide export requires manual navigation per slide.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face | Chinese face | Weight |
|---|---|---|---|
| Display / headline (Jost 200) | Jost | Noto Sans SC (思源黑体) | 700 (heaviest available; CJK at 200 reads as broken — see Aesthetic Notes) |
| Body / lead (Jost 300) | Jost | Noto Sans SC (思源黑体) | 400 |
| Pull quote / insight title (Lora italic / roman) | Lora | Noto Serif SC (思源宋体) | 400 |
| Label / mono chrome (JetBrains Mono) | JetBrains Mono | Noto Sans SC | 400 (do not force monospace on CJK; see Aesthetic Notes) |

### Mixed-Content Strategy

Strategy A — same `font-family` stack, Latin-first fallback. Each typographic token already lists `"Jost, Noto Sans SC, system-ui, sans-serif"` (or the Lora equivalent). Latin glyphs render in Jost / Lora; CJK glyphs automatically fall through to Noto Sans SC / Noto Serif SC. No per-language class needed. Mixed sentences like `使用 Claude 思考` render in one logical run with the correct face per script.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500;600&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500;700;900&family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
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

Ivory Ledger's defining trait is Jost at weight 200 — paper-thin geometric strokes against cream. **Noto Sans SC does not have a usable weight 200.** Its lightest weight (300) still reads heavier than Jost 200 because Chinese glyphs carry far more strokes per character. Set Chinese display in **Noto Sans SC 700** to match the *visual presence* of Jost 200 on the cream paper (counterintuitive, but Chinese readers perceive lighter weights as anemic at large sizes). For body, Noto Sans SC 400 against Jost 300 is the correct match — the cream-paper-and-graphite ink moment carries across scripts.

Lora italic is the system's "human voice" in pull-quote bodies. **Noto Serif SC has no italic.** Drop italic entirely for Chinese pull quotes; the serif face itself carries the editorial warmth. Don't try to fake italic with `font-style: italic` — Noto Serif SC will render an auto-slanted glyph that looks broken.

JetBrains Mono's uppercase tracked labels (0.12–0.18em) do not transfer to CJK. **Set Chinese labels in Noto Sans SC 400, mixed case, with letter-spacing reset to 0.** The "catalog-card" voice in Chinese is achieved through the small size and the cream-paper-light color, not through monospace + tracking. If a label is pure Latin (a version number, a date), keep it in JetBrains Mono uppercase as originally designed.

The em-dash bullet marker (`—`) works perfectly in Chinese — the Chinese em-dash is also `—` and renders the same width. Keep the marker as-is.

### Known CJK Gap

The 8vw horizontal padding (the most generous in the library) was tuned for Latin's narrower glyph widths. Chinese characters are roughly square and consume more horizontal space at the same point size. Long Chinese headlines that would fit on one line in English may wrap to two. Reduce display headline sizes by ~15% (Jost 8.5vw → Noto Sans SC 7.2vw) when the headline is pure Chinese, or accept the wrap as part of the editorial rhythm.

## Iteration Guide

1. Any new slide background is `{colors.cream-paper}` (or `{colors.cream-warm}` for the insight/timeline sub-aesthetic). Never introduce a dark or chromatic background.
2. Any new headline uses Jost in mixed case at weight 200 (display, h1) or 300 (h2). Never reach for heavier weights.
3. Any new label, eyebrow, tag, or metadata text uses JetBrains Mono uppercase with at least 0.12em tracking colored `{colors.ink-graphite-light}`.
4. Any new structural divider is a 1px solid black rule. Use `{components.rule}` (36px short) for decorative accents and `{components.rule-full}` for region separation.
5. Any new pull-quote uses Lora italic at `{typography.quote-serif}` size. Quotes never appear in sans.
6. Any new card moment uses 16px rounded corners and a Lora roman title. Don't introduce square cards or sans-titled cards.
7. Any new bullet list uses the em-dash in muted graphite via JetBrains Mono.
8. Generous whitespace is a feature, not a missing layout. Don't fill space because it's available.
9. If you need to emphasize a moment, increase size or wrap a span in Lora italic. Do not introduce color.
10. Color tokens that look chromatic (e.g. `--c-accent`) are aliased to `{colors.ink-black}` — they exist for token compatibility but resolve to black. Don't add a chromatic value to them.

## Known Gaps

- The CSS defines a `.slide-sidebar` element (rotated mono labels in the left gutter) that is intentionally hidden via `display: none !important`. The dormant styles remain in the source; re-enabling without design review will add visual noise the system was tuned to remove.
- The three insight-card surface tokens (`--c-card-a`, `--c-card-b`, `--c-card-c`) resolve to two near-identical values (#FAFADF, #F5F0E4). The card "color variation" is effectively cosmetic — cards are distinguished by serif title and padding, not surface tone.
- The pie/donut chart uses a `::after` pseudo cutout that requires the chart background to match the slide surface. Slides with a different background (e.g., the cream-warm variant) need the `--c-bg-light` token adjusted for the cutout to disappear correctly.
- The pyramid chart uses `color-mix(in srgb, ...)` which requires a modern browser. Older browsers will render the bars as solid `{colors.cream-paper}`.
- The animation system requires the `.is-active` class to be applied to a slide for entrance animations to play. Without proper navigation engine wiring, `[data-anim]` elements will remain at opacity 0.
- Lora italic at large sizes (3.2vw quote body) has noticeably wider stroke contrast than the surrounding Jost — this is intentional but creates a perceived weight jump. Don't compensate by making the surrounding text heavier.
- The bar-chart `bar-fill` uses inline `style="height: XX%"` declarations — there's no data-binding layer. Heights are computed manually.
- The system was originally named "Ivory Ledger" in the source comments. The template is exposed in the library as "Monochrome"; both names refer to the same design system.
