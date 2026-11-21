---
version: alpha
name: Signal
description: A literary editorial presentation system in the spirit of a long-form magazine — The Economist's restraint crossed with a private intelligence briefing. Source Serif 4 carries every headline with roman/italic mixing mid-sentence in antique gold, DM Sans steps back for body, and IBM Plex Mono runs all the timestamps, kickers, and chrome. The dual surface system is warm cream paper (#F0ECE3) and deep editorial navy (#1C2644), connected by a single hot accent — antique gold (#C8A870) — used only on rules, italic emphasis, and numerical figures. A near-invisible 80px grid texture overlays every dark slide as a fingerprint. The effect is sober, considered, and a little bit aristocratic.

colors:
  navy: "#1C2644"
  navy-alt: "#232F55"
  cream: "#F0ECE3"
  cream-alt: "#E6E0D4"
  text-warm: "#E2DCD0"
  text-muted-dark: "#8A96A8"
  text-hint-dark: "#4E5A6E"
  ink: "#1A2030"
  text-muted-light: "#5A6270"
  text-hint-light: "#9AA0A8"
  gold: "#C8A870"
  border-dark: "#2E3D5C"
  border-light: "#CAC4B4"

color-aliases:
  c-bg: navy
  c-bg-alt: navy-alt
  c-bg-light: cream
  c-bg-light-alt: cream-alt
  c-fg: text-warm
  c-fg-2: text-muted-dark
  c-fg-3: text-hint-dark
  c-fg-light: ink
  c-fg-light-2: text-muted-light
  c-fg-light-3: text-hint-light
  c-accent: gold
  c-border: border-dark
  c-border-light: border-light

typography:
  display:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 9.5vw
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: -0.02em
  h1:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 5.2vw
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -0.01em
  h2:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 3vw
    fontWeight: 600
    lineHeight: 1.18
  h3:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 1.9vw
    fontWeight: 500
    lineHeight: 1.3
  lead:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.4vw
    fontWeight: 400
    lineHeight: 1.58
  body:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.05vw
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 0.82vw
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, JetBrains Mono, monospace"
    fontSize: 0.7vw
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
  stat-value:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 5.5vw
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.02em
  quote-text:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 3.6vw
    fontWeight: 400
    lineHeight: 1.28
    letterSpacing: -0.01em
  quote-mark:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 8vw
    fontWeight: 300
    lineHeight: 0.6
  editorial-headline:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 2.75vw
    fontWeight: 600
    lineHeight: 1.2
  dense-headline:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 2.4vw
    fontWeight: 600
    lineHeight: 1.2

spacing:
  pad-x: 7.5vw
  pad-y: 5.5vh
  gap-lg: 4vh
  gap-md: 2.5vh
  gap-sm: 1.2vh
  grid-cell: 80px

canvas:
  width: 100vw
  height: 100vh

components:
  rule-short:
    width: 36px
    height: 1px
    background: "{colors.gold}"
    description: "Short gold rule used as a kicker separator above headlines and as a chapter accent mark."
  rule-full:
    width: "100%"
    height: 1px
    background: "{colors.border-dark}"
    description: "Full-width hairline divider, color shifts to {colors.border-light} on cream surfaces."
  kicker:
    color: "{colors.gold}"
    typography: "{typography.label}"
    description: "Mono uppercase label in antique gold, sits above a headline."
  tag:
    border: "1px solid {colors.gold}"
    color: "{colors.gold}"
    padding: "0.3em 0.8em"
    typography: "{typography.label}"
    description: "Outlined gold pill containing a mono uppercase label."
  chrome-bar:
    borderBottom: "1px solid {colors.border-dark}"
    paddingBottom: "{spacing.gap-sm}"
    marginBottom: "{spacing.gap-md}"
    description: "Top chrome strip with mono label left, mono counter right, hairline rule beneath."
  foot-bar:
    borderTop: "1px solid {colors.border-dark}"
    paddingTop: "{spacing.gap-sm}"
    marginTop: "{spacing.gap-md}"
    description: "Bottom chrome strip, mirror of chrome-bar."
  stat-card:
    borderTop: "1px solid {colors.border-dark}"
    padding: "{spacing.gap-md} {spacing.gap-md} {spacing.gap-md} 0"
    description: "Stat tile with a top hairline rule, big gold serif numeral above a sans label and mono note."
  bullet-marker:
    content: "—"
    color: "{colors.gold}"
    fontFamily: "{typography.label.fontFamily}"
    description: "Em-dash bullet rendered in mono gold prefixes every list item."
  vt-spine:
    width: 1px
    background: "{colors.border-dark}"
    description: "Vertical hairline spine for timeline column, with a 9px gold dot marking each entry."
  vt-dot:
    width: 9px
    height: 9px
    borderRadius: 50%
    background: "{colors.gold}"
    description: "Gold node sitting on the timeline spine at each date."
  pie-donut:
    borderRadius: 50%
    innerCutout: "22% inset, painted to match slide background"
    description: "SVG/CSS donut chart, segments in palette colors with a 1px gold ring divider where used."
  bar-fill-default:
    background: "{colors.text-hint-dark}"
    description: "Default bar fill in muted slate; switches to gold for the highlighted bar."
  bar-fill-accent:
    background: "{colors.gold}"
  compare-divider:
    borderRight: "1px solid {colors.border-dark}"
    description: "Single vertical hairline separating two comparison panels."
  pyramid-band:
    borderLeft: "3px solid {colors.gold}"
    padding: "1.3vh 2.5vw"
    fillFunction: "color-mix(in srgb, {colors.gold} N%, {colors.navy})"
    description: "Horizontal band in pyramid layouts; opacity of gold mix decreases from top tier to bottom."
  grid-texture:
    background: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
    backgroundSize: "80px 80px"
    description: "Near-invisible 80px grid overlay applied to every dark slide via ::before pseudo-element."
  cycle-step:
    borderTop: "2px solid {colors.gold}"
    padding: "{spacing.gap-md}"
    description: "Cycle/process step card with a 2px gold rule at top, gold numeral, serif title, sans body."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Signal is a **literary editorial** presentation system — what a long-form intelligence briefing or a quarterly review from a serious magazine would look like if it ran as a deck. The visual premise is the marriage of two faces: a Scottish-roast editorial serif (Source Serif 4) carrying the voice, and a precision grotesque (DM Sans) carrying the substance, with a condensed monospace (IBM Plex Mono) for every timestamp, kicker, and piece of chrome metadata. The result reads like a quiet authority — the deck does not need to shout because the typography already telegraphs seriousness.

The system runs on a **dual-surface** model. The dark surface is `{colors.navy}` (#1C2644) — a deep editorial blue that sits warmer than navy and cooler than midnight. The light surface is `{colors.cream}` (#F0ECE3) — a warm aged-paper tone, never pure white. Both surfaces carry the same typographic vocabulary at the same scale; what changes is the foreground color. On dark surfaces, primary text is `{colors.text-warm}` (a warm off-white, never pure white). On cream, primary text is `{colors.ink}` (a near-black with a navy bias). The two surfaces are interchangeable from slide to slide — adjacent slides may alternate without any explanation, and the cream surface acts as a "reset" within a longer dark run.

There is exactly one accent color: **antique gold** (`{colors.gold}` — #C8A870). Gold appears only in three contexts: the short rule that separates a kicker from a headline; an `<em>` tag mixed into a roman serif headline (the "Signal moment"); and any numerical figure. Gold never carries a body paragraph and never fills a background. It is a precision tool, used sparingly so that when it appears, it carries weight.

Depth is **flat plus hairline**. There are no drop shadows, no rounded card chrome, no elevation system. Regions separate via 1px hairline rules in `{colors.border-dark}` (or `{colors.border-light}` on cream). The only "texture" in the system is a near-invisible 80px grid overlay on dark slides at 3% white opacity — visible only to the eye that's looking for it. It is the system's fingerprint.

**Density philosophy: medium-low and asymmetric.** Signal is an editorial system; it breathes. A typical slide uses a small fraction of its real estate — a kicker, a headline, a single sentence, a footer. The cover and chapter slides are the sparsest (one display headline against acres of cream or navy). The dense editorial layouts are the exception, not the rule, and even those leave generous interior padding. A slide that feels broken in Signal is one that fills the canvas edge-to-edge with content; the correct register is "I have one thing to say and I will say it carefully."

**Key Characteristics:**
- Source Serif 4 carries every headline with a roman/italic mix mid-sentence; italics in headlines are always gold.
- DM Sans for body and IBM Plex Mono for every timestamp, kicker, label, and chrome element.
- Dual surfaces — `{colors.navy}` (dark) and `{colors.cream}` (light) — used interchangeably, never blended in the same slide except in special split layouts.
- Antique gold (`{colors.gold}`) is the only accent. It marks rules, italic emphasis, and numerical figures, and appears nowhere else.
- Hairline 1px borders in `{colors.border-dark}` / `{colors.border-light}` separate every region. No card chrome, no rounded panels.
- A near-invisible 80px grid texture overlays every dark slide as a barely-perceived fingerprint.
- Em-dash bullet markers in gold mono replace the standard list dot.
- Mono uppercase chrome at the top of every standard slide carries a section label and a slide counter.
- No drop shadows, no gradients (except the bottom-up scrim on fullbleed image slides), no rounded corners (except the donut chart).

## Colors

### Palette

- **Navy** (`{colors.navy}` — #1C2644): The dark surface. A deep editorial blue, warmer than midnight, cooler than indigo. The "intelligence" color — authority without aggression.
- **Navy Alt** (`{colors.navy-alt}` — #232F55): A slightly lifted navy reserved for secondary dark surfaces (placeholder panels, image fallbacks). Visually nearly identical to navy; only differs in close adjacency.
- **Cream** (`{colors.cream}` — #F0ECE3): The light surface. A warm aged-paper tone, never neutral and never bright. Reads as "broadsheet" or "manuscript," not "screen white."
- **Cream Alt** (`{colors.cream-alt}` — #E6E0D4): A slightly cooler cream for secondary light surfaces. Same role as navy alt but on the light side.
- **Text Warm** (`{colors.text-warm}` — #E2DCD0): Warm off-white. The primary text color on navy surfaces. Never `#FFFFFF` — pure white would clash with the warm paper logic of the system.
- **Text Muted Dark** (`{colors.text-muted-dark}` — #8A96A8): Muted blue-grey. Secondary text on navy — descriptions, lead paragraphs that want to recede.
- **Text Hint Dark** (`{colors.text-hint-dark}` — #4E5A6E): Tertiary text on navy. Used for stat notes, mono captions, and elements that should be readable but quiet.
- **Ink** (`{colors.ink}` — #1A2030): Near-black with a navy bias. Primary text on cream. Picks up the dark surface color rather than fighting it.
- **Text Muted Light** (`{colors.text-muted-light}` — #5A6270): Secondary text on cream.
- **Text Hint Light** (`{colors.text-hint-light}` — #9AA0A8): Tertiary text on cream.
- **Gold** (`{colors.gold}` — #C8A870): Antique gold. The single accent color of the system. Appears on rules, italic emphasis inside headlines, statistical numerals, kicker labels, and bullet markers. Never used as a fill, never used on body text.
- **Border Dark** (`{colors.border-dark}` — #2E3D5C): Hairline divider on navy surfaces. Visible but quiet.
- **Border Light** (`{colors.border-light}` — #CAC4B4): Hairline divider on cream surfaces. Warm greige.

### Defaults

- **Default surface**: alternate between `{colors.navy}` (dark) and `{colors.cream}` (light) across the deck. There is no "primary" surface — both are first-class. If unsure, reach for navy for chapter openers and statement slides, cream for dense editorial reads.
- **Default primary text on navy**: `{colors.text-warm}`.
- **Default primary text on cream**: `{colors.ink}`.
- **Default secondary text on navy**: `{colors.text-muted-dark}`.
- **Default secondary text on cream**: `{colors.text-muted-light}`.
- **Default tertiary/hint text**: `{colors.text-hint-dark}` on navy, `{colors.text-hint-light}` on cream — for mono captions, stat notes, footnotes.
- **Default accent**: `{colors.gold}` — applied to rules, italic emphasis inside headlines, statistical figures, kicker labels.
- **Default border**: `{colors.border-dark}` on navy, `{colors.border-light}` on cream.
- **Default kicker color**: `{colors.gold}`.

The two surfaces are interchangeable and carry the same gold accent — a gold rule on navy reads identically to a gold rule on cream. Body text never appears in gold. Gold never serves as a region fill.

## Typography

### Font Family

Signal runs four font families in carefully separated roles:

- **Source Serif 4** (`{typography.display.fontFamily}`) — a Scottish-roast editorial serif. Carries every headline at every scale (display, h1, h2, h3, editorial-headline, dense-headline, quote-text, stat-value). The face has a full italic axis, and the system's most distinctive typographic move is **mixing roman and italic mid-sentence**: the roman type carries the sentence and an `<em>` tag inside switches to italic in `{colors.gold}`. This is the "Signal moment."
- **DM Sans** (`{typography.body.fontFamily}`) — a humanist grotesque used for body, lead paragraphs, bullet items, and stat labels. DM Sans is the structural understudy — it never leads, it always supports. When `<em>` appears inside a sans `.lead` paragraph, the emphasis switches to **italic serif in gold** (a font-family change), not italic sans.
- **IBM Plex Mono** (`{typography.label.fontFamily}`) — a condensed editorial monospace. Carries every label, every kicker, every chrome element (top bar, footer, slide counter), every chapter number, every mono caption, every stat note, every timeline date. Mono is the system's "metadata voice."
- **Noto Serif SC / Noto Sans SC** — Chinese fallbacks for the serif and sans roles. Wired into every font-family stack so the system renders identically with Chinese content.

The emotional contrast is: serif = voice, sans = substance, mono = timestamp. Mixing them in one sentence (a sans lead with an italic serif gold `<em>` inside) is the system's small choreography.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | 9.5vw | Source Serif 4 | 700 | Hero cover headline at maximum scale |
| `{typography.h1}` | 5.2vw | Source Serif 4 | 600 | Chapter title or single-statement headline |
| `{typography.stat-value}` | 5.5vw | Source Serif 4 | 600 | Large statistical numeral in gold |
| `{typography.quote-mark}` | 8vw | Source Serif 4 | 300 | Decorative opening quotation glyph in gold |
| `{typography.quote-text}` | 3.6vw | Source Serif 4 | 400 | Pull-quote body |
| `{typography.h2}` | 3vw | Source Serif 4 | 600 | Primary slide headline |
| `{typography.editorial-headline}` | 2.75vw | Source Serif 4 | 600 | Headline for editorial / newsletter layouts |
| `{typography.dense-headline}` | 2.4vw | Source Serif 4 | 600 | Headline for two-column dense text layouts |
| `{typography.h3}` | 1.9vw | Source Serif 4 | 500 | Sub-headline, panel title, intra-region heading |
| `{typography.lead}` | 1.4vw | DM Sans | 400 | Lead paragraph, intro sentence, list item body |
| `{typography.body}` | 1.05vw | DM Sans | 400 | Paragraph body, bullet body |
| `{typography.caption}` | 0.82vw | DM Sans | 400 | Caption, footnote, source attribution |
| `{typography.label}` | 0.7vw | IBM Plex Mono | 500 | Mono uppercase chrome label, kicker, tag, mono metadata |

### Defaults

- **Default size for a primary section headline**: `{typography.h2}` (3vw).
- **Default size for a chapter opener**: `{typography.h1}` (5.2vw).
- **Default size for a cover hero**: `{typography.display}` (9.5vw).
- **Default size for a paragraph**: `{typography.body}` (1.05vw).
- **Default size for a lead sentence beneath a headline**: `{typography.lead}` (1.4vw).
- **Default size for any chrome, kicker, or metadata label**: `{typography.label}` (0.7vw).
- **Default size for a statistical numeral**: `{typography.stat-value}` (5.5vw), in `{colors.gold}`.
- **Default headline color**: primary text color for the surface (`{colors.text-warm}` on navy, `{colors.ink}` on cream). Never gold.

When unsure between `{typography.h2}` and `{typography.h3}` for a primary moment, reach for `{typography.h2}` — `h3` is for sub-headlines within a region, not for the slide's main statement.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **An `<em>` tag inside any serif headline (`display`, `h1`, `h2`, `h3`, `editorial-headline`, `dense-headline`) must render in italic Source Serif 4 in `{colors.gold}`.** This is the system's most distinctive typographic moment — mixing roman and italic mid-sentence with a color shift. A headline with an emphasized phrase without this treatment reads as a different design system.
- **An `<em>` tag inside a sans `.lead` or body paragraph must switch font-family to Source Serif 4, italic, in `{colors.gold}`.** Emphasis in body never stays in DM Sans italic — the font switch is the emphasis.
- **Every kicker is mono uppercase in `{colors.gold}` with at least 0.14em letter-spacing.** A kicker that is sans, lowercase, or not in gold is not a kicker.
- **Every statistical numeral is in Source Serif 4 600 in `{colors.gold}` with -0.02em letter-spacing.** Stats in sans, or stats in primary text color, break the system.
- **Every chrome bar carries a 1px hairline rule beneath it in `{colors.border-dark}` / `{colors.border-light}`.** The hairline is what makes the chrome read as chrome rather than as floating text.
- **Every chapter slide carries a 36px gold rule between the chapter number and the chapter title.** The rule is the section break — no rule, no chapter.
- **Bullet lists use an em-dash in mono gold as the marker.** Standard dot bullets do not exist in this system.

### Typography Principles

The font ladder is fixed: serif for voice (display through h3), sans for substance (lead through caption), mono for metadata (label only). Never use serif for body, never use sans for headlines, never use mono outside metadata roles. Crossing those rails breaks the editorial separation.

Italic is structural, not decorative — it is the emphasis vehicle inside headlines and inside lead paragraphs. Underline does not exist. Bold within body does not exist; if body needs emphasis, switch to the italic serif gold `<em>` pattern.

Line-height runs tight at display scale (0.96 on display, 1.08 on h1) and opens as size decreases (1.5–1.72 on caption and body). Letter-spacing is negative on display and h1 (–0.01 to –0.02em) and zero on body. Mono labels carry tracking of 0.14em to 0.22em — generous letter-spacing is how mono reads as editorial rather than as code.

## Layout

### Canvas System

The system targets `100vw × 100vh` — full viewport. Each `.slide` flexes to fill the viewport exactly, and slides sit side-by-side in a horizontal strip that translates left/right on navigation. All sizes use viewport-relative units (`vw`, `vh`) so the layout scales with window size — there are no fixed pixel measurements except chrome dot/counter sizes.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 7.5vw | Horizontal slide padding |
| `{spacing.pad-y}` | 5.5vh | Vertical slide padding |
| `{spacing.gap-lg}` | 4vh | Between major content sections |
| `{spacing.gap-md}` | 2.5vh | Between related elements |
| `{spacing.gap-sm}` | 1.2vh | Between tightly coupled elements |

Quote slides increase pad-x to 1.1× and pad-y to 1.2× to give the pull-quote extra breathing room. Compare layouts use `pad-x * 0.55` as inset padding on each panel.

### Chrome Frame

Standard slides carry a top chrome bar and a bottom foot bar — both are flex rows with a mono label left, mono counter right, separated from the body by a 1px hairline rule. The chrome and foot disappear on cover, chapter, statement, quote, and end slides — those layouts are chromeless and let the type breathe edge to edge.

Each slide is a CSS grid with `grid-template-rows: auto 1fr auto` — the chrome and foot are the auto rows, the body is the 1fr row that fills.

### Grid Texture

Every dark slide carries a near-invisible 80px × 80px grid overlay drawn with two linear-gradient backgrounds at 3% white opacity. The grid is the system's visual fingerprint — it is not meant to be consciously perceived, only sensed as "this slide has structure." Cream slides do not carry this overlay.

## Depth and Elevation

Signal is **flat by design**. There are no drop shadows. There are no rounded card elevations. There is no elevation system at all — every element sits flush with the surface.

What looks like depth is actually **hairline separation**. Regions separate via 1px solid borders in `{colors.border-dark}` (on navy) or `{colors.border-light}` (on cream). A stat tile, a chrome bar, an editorial column — all separated by hairlines, not by shadows or backgrounds.

The single exception is the **fullbleed gradient scrim**: on fullbleed image slides, a linear gradient from transparent to `rgba(15, 20, 36, 0.9)` runs bottom-up across the lower portion of the slide so the type beneath remains legible against the image. This is the only gradient in the system; everywhere else, surfaces are solid.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0 | Every shape in the system except donut charts and donut center wells |
| 50% (circle) | Donut chart shapes, the 9px timeline dots, the 2px round-ended border on swatches |
| 2px | Pie legend swatch (subtle softening only) |

Signal has effectively **no rounded chrome**. Stat tiles, chrome bars, compare panels, image frames — all rectangular with sharp corners.

### Border Weights

- **1px solid** — the universal hairline border. Used on every chrome bar, every stat tile top rule, every column divider, every compare panel divider, every editorial column boundary. Color follows the surface (`{colors.border-dark}` or `{colors.border-light}`).
- **1px dashed** — used only inside the chart plot for grid lines (rgba transparency, very low opacity).
- **2px solid `{colors.gold}`** — used on the top rule of a cycle/process step.
- **3px solid `{colors.gold}`** — used as the left-border on pyramid bands.

### Decorative Element Types

**Short gold rule** — a 36px × 1px solid gold horizontal bar. Sits between a kicker and a headline, or as a chapter accent mark. The smallest atomic decorative element in the system.

**Full hairline rule** — a 100% × 1px horizontal rule in `{colors.border-dark}` / `{colors.border-light}`. Used as section dividers, chrome separators, stat-tile top edges, column boundaries.

**Outlined gold tag** — a small inline-block with a 1px gold border around mono uppercase gold text. The "pill" version of a kicker — same typographic spec, with an outline.

**Editorial column divider** — a 1px hairline running floor-to-ceiling between two columns in editorial layouts. Padding inside the columns is `pad-x * 0.38`.

**Vertical timeline spine** — a 1px vertical hairline running the height of a vertical timeline, with 9px circular gold dots positioned at each entry along the spine.

**Pyramid band** — a horizontal band with a 3px solid gold left-border, filled with `color-mix(in srgb, gold N%, navy)` where N decreases from 70% at the top tier to 8% at the bottom tier. Each tier is also progressively wider (38% → 100%). This creates the visual pyramid through color saturation and width, without any actual triangular geometry.

**Donut center well** — the inner 22% inset of a pie donut is filled with the slide background color (navy or cream) to create the donut hole.

**Connector arrow** — in cycle and diagram layouts, a low-contrast arrow glyph in `{colors.border-dark}` (or `{colors.border-light}`) sits between sequential steps. The arrow is intentionally muted — the steps lead, the connector recedes.

**Mono dash bullet** — every list item carries an em-dash (`—`) in mono gold as the bullet marker, with a 1.2em column for the marker and 0.5em gap.

## Do's and Don'ts

### Do

- Mix roman and italic Source Serif 4 inside the same headline, with the italic in `{colors.gold}` — this is the Signal moment, and the system depends on it appearing throughout the deck.
- Use IBM Plex Mono for every kicker, label, tag, chrome element, slide counter, chapter number, and statistical note. Mono is the metadata voice.
- Render every kicker in mono uppercase gold with at least 0.14em letter-spacing — the tracking is what makes mono read as editorial.
- Set every chrome bar to carry a 1px hairline beneath it in the surface-appropriate border color. The hairline is non-negotiable; chrome without a rule reads as floating text.
- Alternate navy and cream surfaces freely across a deck. Neither is "the" background — both are first-class.
- Color every statistical numeral in `{colors.gold}` using Source Serif 4 600 with -0.02em tracking. Stats are the second most-recognizable element after the italic gold headline emphasis.
- Replace standard bullet dots with em-dashes in mono gold. Standard dots break the editorial register.
- Use the 36px gold rule as the chapter break and the kicker separator. It is the system's small punctuation.
- Apply the 80px grid texture overlay to every dark slide via `::before`. It is the system's fingerprint and should never be removed.
- Pad with `{spacing.pad-x}` 7.5vw / `{spacing.pad-y}` 5.5vh — Signal needs the breathing room; tight padding breaks the editorial restraint.

### Don't

- Don't use gold on body text or fill backgrounds with gold. Gold appears only on rules, italic emphasis, and numerical figures.
- Don't use pure white (`#FFFFFF`) for text on navy. Always use `{colors.text-warm}` — the warm off-white is what keeps the system tied to its paper register.
- Don't add drop shadows or rounded card chrome. The system is flat-plus-hairline; elevation breaks the editorial frame.
- Don't put serif type on body or paragraph text. The serif/sans separation is structural — serif leads, sans supports.
- Don't bold inside body text for emphasis. Use the italic serif gold `<em>` pattern instead — the font switch is the emphasis.
- Don't round corners on chrome, panels, stat tiles, or image frames. The only round shapes in the system are the donut chart and the 9px timeline dots.
- Don't introduce a second accent color. Antique gold is the only hot color; adding a second accent dilutes its weight.
- Don't fill more than half a typical slide with content. The system reads as broken when crowded — restraint is the register.
- Don't use mono outside metadata roles (label, kicker, chrome, counter, caption note). Mono in body or headline breaks the typographic ladder.
- Don't omit the 1px hairline beneath chrome or above a stat tile. Hairlines are the system's depth substitute; without them the elements float.

## Responsive Behavior

Signal targets a 1920×1080 viewport but is implemented entirely in viewport-relative units (`vw`, `vh`), so it scales fluidly between 1280×720 and 2560×1440 without breakpoints. The 80px grid texture is the only fixed-pixel measurement that persists across viewport changes — it becomes proportionally finer at larger viewports.

### Scaling Behavior

- Display headline scales with viewport: at 1920px, 9.5vw renders as ~182px. At 1280px, ~122px.
- Body text scales: 1.05vw → ~20px at 1920px, ~13px at 1280px.
- Padding scales: pad-x 7.5vw → ~144px at 1920px, ~96px at 1280px.

### Presenter Behavior

The deck is JS-driven. Slides advance via the navigation strip (translateX on the deck container), with nav dots and a slide counter fixed at the bottom. Each slide carries `is-active` when current; elements with `[data-anim]` attributes animate in via fade-up, fade-in, reveal-right, reveal-left, or scale-in keyframes with staggered `data-delay` (0–6). Animations are short (0.5–0.85s) and use a sharp `cubic-bezier(0.77, 0, 0.175, 1)` slide ease and a spring-y `cubic-bezier(0.16, 1, 0.3, 1)` entrance ease.

### Print Behavior

There is no dedicated print stylesheet. Static export should render each slide as a sequential page; the deck container's horizontal layout would need to be unwound for print fidelity.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin | Chinese | Weight mapping |
|---|---|---|---|
| Display / Headlines (h1, h2, h3) / Stat-value / Quote-text / Editorial-headline / Dense-headline | Source Serif 4 (500–700) | **思源黑体 Noto Sans SC** | 700 |
| Lead / Body / Caption | DM Sans (400) | **思源黑体 Noto Sans SC** | 400 |
| Label / Kicker / Chrome / Slide counter | IBM Plex Mono (500) | **思源黑体 Noto Sans SC** | 500 (uppercase + tracking removed) |

### Mixed-Content Strategy

**Strategy A — single CJK family (思源黑体 Noto Sans SC) across all roles.** Signal's Latin system already wires Noto Serif SC and Noto Sans SC into every font-family stack as fallbacks — the system was designed with CJK in mind. The recommended consolidation is to use **Noto Sans SC for every role** rather than mixing Noto Serif SC (display) + Noto Sans SC (body) — and the reason is the system's most distinctive treatment: the gold italic `<em>` emphasis inside headlines. Noto Serif SC does not ship an italic axis, which means the Signal moment (roman-to-italic mid-sentence color shift) cannot be reproduced in Chinese. Collapsing to Noto Sans SC across the system and reserving the color-only emphasis (gold without italic) for CJK `<em>` lands cleaner than fighting an italic-less serif. The serif vs sans contrast that defines the Latin ladder is lost in CJK, but the editorial restraint of the system — hairlines, mono kickers, antique gold accents, dual surfaces — carries through unaffected.

### Loading

The system already loads Noto Sans SC via the existing font-family stacks. If using a CDN preconnect pattern:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

The existing CSS variables already include Noto Sans SC and Noto Serif SC in every font stack. For a CJK-primary deck, swap the serif stacks to use Noto Sans SC as the active CJK face (rather than Noto Serif SC) so the entire system collapses to one Chinese family:
```css
/* Display / headline roles (CJK-primary) */
font-family: 'Source Serif 4', 'Noto Sans SC', Georgia, serif;
/* Body roles */
font-family: 'DM Sans', 'Noto Sans SC', system-ui, sans-serif;
/* Mono roles */
font-family: 'IBM Plex Mono', 'Noto Sans SC', monospace;
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

- **The Signal moment (italic gold `<em>` mid-sentence) becomes color-only on CJK.** Noto Sans SC has no italic variant; even Noto Serif SC ships without italic. For Chinese headlines, render `<em>` as a color shift to `{colors.gold}` *without* italic — the emphasis still lands because gold is the system's most-loaded color. Treat this as a deliberate translation of the Signal moment to its color-only essence in CJK.
- **Negative letter-spacing on display (-0.02em on display, -0.01em on h1/h2) must drop to 0 on CJK.** The system's tight tracking is a Latin-display convention that breaks CJK rendering.
- **Mono kickers in IBM Plex Mono uppercase with 0.14–0.22em tracking are Latin-only.** For CJK kickers, drop tracking to 0 and rely on the gold color + small size to signal "this is a kicker." A mixed CJK + Latin kicker (`第一章 / CHAPTER ONE`) can keep the Latin half tracked and the CJK half at 0 tracking — the asymmetric mono voice reads as editorial bilingualism.
- **Statistical numerals at Source Serif 4 600 in gold** remain Latin numerals (the Western-numeral convention for stats is universal in modern editorial design). Don't substitute Chinese numerals (一二三四) — they lose the catalogue-statistical voice.
- **The em-dash bullet (`—` in mono gold) translates perfectly** — em-dash bullets are equally idiomatic in Chinese typography.
- **The 80px grid texture, hairline borders, dual surface (navy + cream), gold rules, chapter slides, fullbleed image scrim, chromeless statement layouts** are all glyph-agnostic. The editorial restraint and intelligence-briefing register carry through unaffected.
- **Line-height on CJK body should open from 1.58–1.72 to 1.75–1.85** — Chinese characters fill their em-box and need additional vertical breathing for readability at the system's body sizes (1.05vw, 1.4vw).
- **Quote-mark glyph (the 8vw decorative opening quotation)** should switch to a Chinese opening guillemet (「) or curly quote (") — Latin opening-quote glyphs read as alien on Chinese pull-quotes.

### Known CJK Gap

The system's most distinctive typographic treatment (roman + italic-gold mid-sentence inside Source Serif 4 headlines) is fundamentally a Latin-typographic move that does not translate. Neither Noto Serif SC nor Noto Sans SC ships an italic axis, and inventing one via CSS `font-style: italic` produces an oblique/slanted glyph that reads as broken rather than as emphasis. Collapsing CJK `<em>` to a color-only shift (gold without italic) is the cleanest workaround; mixed-language headlines where the emphasized phrase is Latin (and therefore can take italic gold) and the surrounding sentence is Chinese will land as the strongest CJK execution of the Signal moment.

## Iteration Guide

1. Any new headline uses Source Serif 4 and is eligible for an `<em>` mid-sentence in italic gold. If the headline has no emphasized phrase, consider whether it should — the Signal voice depends on the gold italic moment appearing.
2. Any new region separator is a 1px hairline in `{colors.border-dark}` / `{colors.border-light}`. Never a thicker border, never a colored border, never a shadow.
3. Any new label, kicker, or chrome element is mono uppercase in `{colors.gold}` (for kickers) or surface-appropriate muted color (for chrome). Letter-spacing at least 0.14em.
4. Any new statistical figure uses Source Serif 4 600 in `{colors.gold}` at -0.02em tracking. Stats are always gold serif, regardless of surface.
5. Any new accent treatment uses `{colors.gold}` — there is no second accent. If a slide needs more visual differentiation, vary the surface (navy vs. cream) rather than adding color.
6. Any new bullet list uses the em-dash gold mono marker. Adding a different bullet style breaks the system.
7. Cover, chapter, statement, quote, and end layouts are chromeless. Standard layouts carry chrome and foot. Don't mix — a chromeless statement is correct; a chromed statement reads as a different system.
8. The 80px grid overlay is part of the dark-surface identity. Any new dark slide should inherit `.slide.dark` so the `::before` overlay applies automatically.
9. New layouts should keep the editorial breathing room. If a layout requires content edge-to-edge, reconsider — Signal is a restrained system.
10. Italic in body text always means font-family switch to Source Serif 4 italic in `{colors.gold}`. Italic DM Sans is not a system primitive.

## Known Gaps

- The four font families load from Google Fonts at runtime. If fonts fail to load (network issues, ad blockers), fallbacks are Georgia (for serif), system-ui (for sans), and Courier-style monospace — the resulting rendering loses much of the editorial character but remains legible.
- Chinese fallbacks (Noto Serif SC, Noto Sans SC) are wired into every font-family stack but render slightly different metrics from the Latin faces; pure Chinese decks will read slightly tighter.
- The 80px grid texture is a magic number tied to viewport scale; at very large viewports (>2560px), the grid may begin to feel coarse rather than imperceptible.
- The slide navigation is JavaScript-driven with hardcoded `transform: translateX(...)` on the deck container. The system depends on this engine; replacing it requires preserving the `is-active` class behavior for animations to fire.
- The `--c-bg-alt`, `--c-bg-light-alt`, and several muted color tokens are defined but used sparingly — they exist as a reserve for adjacent-surface differentiation that the source template uses only occasionally.
- The pyramid layout uses `color-mix(in srgb, ...)` which requires modern browser support; older browsers may render bands as flat fill rather than tiered.
- The fullbleed slide gradient is hardcoded to `rgba(15, 20, 36, 0.9)` (close to navy but not parameterized via a token). Changing the navy color requires updating this gradient in parallel.
