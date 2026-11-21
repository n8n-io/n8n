---
version: alpha
name: Pink Script (After Hours)
description: A nocturnal couture editorial system rendered in hot fuchsia ink on dim warm-black paper, with a soft film-grain overlay and a hairline interior frame. DM Serif Display carries every script and editorial moment at sizes up to 600px; Inter at weight 300 carries the body voice; JetBrains Mono carries the boutique-catalog metadata. The aesthetic borrows from glossy fashion magazine spreads, late-night perfume advertising, and the editorial pages of high-end zines — closer to a Maison's seasonal lookbook than a startup deck.

colors:
  ink-deep: "#060507"
  ink-violet: "#0F0D11"
  paper-blush: "#F5EDF1"
  pink: "#ED3D8C"
  pink-light: "#FF66A8"
  pink-deep: "#B81D67"
  line-pink: "rgba(237, 61, 140, 0.32)"
  mute-paper: "rgba(245, 237, 241, 0.55)"
  hair-paper: "rgba(245, 237, 241, 0.14)"

color-aliases:
  c-bg: ink-deep
  c-fg: paper-blush
  c-accent: pink
  c-line: line-pink

typography:
  script-huge:
    fontFamily: "DM Serif Display, serif"
    fontSize: 540px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.01em
    color: "{colors.pink}"
  script-section:
    fontFamily: "DM Serif Display, serif"
    fontSize: 600px
    fontWeight: 400
    lineHeight: 0.82
    letterSpacing: -0.02em
    color: "{colors.pink}"
  script-giant:
    fontFamily: "DM Serif Display, serif"
    fontSize: 360px
    fontWeight: 400
    lineHeight: 1.05
    color: "{colors.pink}"
  script-cover:
    fontFamily: "DM Serif Display, serif"
    fontSize: 280px
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: -0.015em
    color: "{colors.pink}"
  script-large:
    fontFamily: "DM Serif Display, serif"
    fontSize: 220px
    fontWeight: 400
    lineHeight: 1.04
    color: "{colors.pink}"
  script-med:
    fontFamily: "DM Serif Display, serif"
    fontSize: 156px
    fontWeight: 400
    lineHeight: 1.04
    color: "{colors.pink}"
  script-sm:
    fontFamily: "DM Serif Display, serif"
    fontSize: 132px
    fontWeight: 400
    lineHeight: 1.06
    color: "{colors.pink}"
  serif-cta:
    fontFamily: "DM Serif Display, serif"
    fontSize: 140px
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: -0.015em
    color: "{colors.paper-blush}"
  serif-h2:
    fontFamily: "DM Serif Display, serif"
    fontSize: 132px
    fontWeight: 400
    lineHeight: 1.06
    color: "{colors.paper-blush}"
  serif-quote:
    fontFamily: "DM Serif Display, serif"
    fontSize: 92px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.005em
    color: "{colors.paper-blush}"
  serif-chart-h:
    fontFamily: "DM Serif Display, serif"
    fontSize: 90px
    fontWeight: 400
    lineHeight: 1.06
    color: "{colors.paper-blush}"
  serif-section-h:
    fontFamily: "DM Serif Display, serif"
    fontSize: 88px
    fontWeight: 400
    lineHeight: 1.06
    color: "{colors.paper-blush}"
  serif-stat:
    fontFamily: "DM Serif Display, serif"
    fontSize: 116px
    fontWeight: 400
    lineHeight: 0.9
    color: "{colors.pink}"
  serif-toc-num:
    fontFamily: "DM Serif Display, serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.0
    color: "{colors.pink}"
  serif-toc-title:
    fontFamily: "DM Serif Display, serif"
    fontSize: 56px
    fontWeight: 400
    lineHeight: 1.05
    color: "{colors.paper-blush}"
  serif-quote-attr:
    fontFamily: "DM Serif Display, serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.05
    color: "{colors.paper-blush}"
  serif-process-h:
    fontFamily: "DM Serif Display, serif"
    fontSize: 38px
    fontWeight: 400
    lineHeight: 1.05
    color: "{colors.paper-blush}"
  serif-matrix-label:
    fontFamily: "DM Serif Display, serif"
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.2
    color: "{colors.paper-blush}"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.55
    color: "{colors.paper-blush}"
  body-muted:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 300
    lineHeight: 1.5
    color: "{colors.mute-paper}"
  body-toc-desc:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.4
    color: "{colors.mute-paper}"
  mono-runner:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    fontWeight: 400
    letterSpacing: 0.14em
    textTransform: uppercase
  mono-kicker:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 22px
    fontWeight: 400
    letterSpacing: 0.14em
    textTransform: uppercase
    color: "{colors.pink}"
  mono-label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 22px
    fontWeight: 400
    letterSpacing: 0.14em
    textTransform: uppercase
    color: "{colors.paper-blush}"
  mono-cover-pre:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 28px
    fontWeight: 400
    letterSpacing: 0.42em
    textTransform: uppercase
    color: "{colors.paper-blush}"
  mono-pill:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 16px
    fontWeight: 400
    letterSpacing: 0.08em
    textTransform: uppercase

spacing:
  edge-x: 60px
  edge-top-chrome: 60px
  edge-bottom-chrome: 60px
  content-top: 140px
  content-bottom: 140px
  inner-frame-inset: 36px

canvas:
  width: 1920px
  height: 1080px

components:
  slide-surface:
    background: "radial-gradient(ellipse 90% 70% at 30% 30%, #1A1218 0%, #0A0709 55%, #050306 100%)"
    description: "Universal dark surface — radial ellipse from a slightly warmer #1A1218 in the upper-left fading to near-black in the lower-right. The off-center light source is part of the system's identity."
  film-grain:
    selector: ".slide::before"
    background: "fractalNoise SVG via data URI, baseFrequency=0.9, octaves=2"
    opacity: 0.08
    mixBlendMode: screen
    description: "Subtle film grain overlay on every slide via ::before. Opacity 0.08 with screen blend — barely visible but reads as photographic grain rather than digital flatness."
  hairline-frame:
    selector: ".slide::after"
    position: "absolute; inset: 36px"
    border: "1px solid {colors.hair-paper}"
    description: "1px paper-blush-at-14%-opacity interior frame inset 36px from each slide edge. Always present. Functions as the editorial border of the magazine page."
  runner:
    position: "absolute; top: 60px; left: 60px; right: 60px"
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.14em
    textTransform: uppercase
    description: "Top metadata runner — brand name on left (colored pink), section / chapter tag on right (muted paper-blush)."
  footer:
    position: "absolute; bottom: 60px; left: 60px; right: 60px"
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 24px
    letterSpacing: 0.14em
    textTransform: uppercase
    description: "Bottom metadata runner — source / confidentiality on left, page-position (e.g. '03 / 09') on right. Page-position has paper-blush base text with a pink ::em for the current number."
  pink-rule:
    height: 1px
    background: "{colors.pink}"
    opacity: 0.45
    description: "Hairline pink rule for soft section separators."
  hair-rule:
    height: 1px
    background: "{colors.paper-blush}"
    opacity: 0.25
    description: "Hairline paper rule for muted section separators."
  pink-glow:
    textShadow: "0 0 80px rgba(237, 61, 140, 0.18)"
    description: "Soft pink halo behind large script titles. Applied via text-shadow on hero serif text only."
  pink-glow-mega:
    textShadow: "0 0 120px rgba(237, 61, 140, 0.22)"
    description: "Stronger pink halo for section-divider mega numerals."
  callout-rail:
    borderLeft: "1px solid {colors.pink}"
    paddingLeft: 24px
    description: "Pink left rule with right-aligned content — used as a callout container beside a chart, beside a chapter explanation."
  matrix-cell:
    padding: "16px 24px"
    borderBottom: "1px solid {colors.line-pink}"
    fontFamily: "Inter, sans-serif"
    fontSize: 22px
    fontWeight: 300
    color: "{colors.paper-blush}"
    description: "Comparison matrix cell. Rows are separated by hairline pink-at-32% rules; columns are gap-separated, no vertical borders."
  matrix-cell-us:
    background: "rgba(237, 61, 140, 0.08)"
    description: "Highlighted matrix row variant — soft pink wash to mark the 'our' column."
  pill-outline:
    border: "1px solid {colors.pink}"
    color: "{colors.pink}"
    padding: "6px 14px"
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 16px
    letterSpacing: 0.08em
    textTransform: uppercase
    description: "Hollow pink pill — 1px pink border with pink mono text. The default pill state."
  pill-solid:
    background: "{colors.pink}"
    color: "{colors.ink-deep}"
    border: "1px solid {colors.pink}"
    fontWeight: 500
    description: "Solid pink pill — pink fill, deep-ink text. Affirmative / featured state."
  pill-dim:
    borderColor: "{colors.hair-paper}"
    color: "{colors.mute-paper}"
    description: "Dim pill — muted paper border, muted paper text. The de-emphasized state."
  qr-tile:
    width: 180px
    height: 180px
    background: "{colors.paper-blush}"
    padding: 12px
    description: "QR-code container — solid paper-blush square with 12px white padding around the SVG QR. The only large light-surface element in the system."
  stat-row:
    display: "grid; columns: 240px 1fr"
    borderBottom: "1px solid {colors.hair-paper}"
    paddingBottom: 16px
    description: "Stat row pattern — large pink serif figure on the left (with a paper-blush superscript unit) paired with a mono label and Inter description on the right. Rows are separated by 1px paper hairline."
  callout-num:
    fontFamily: "DM Serif Display, serif"
    fontSize: 120px
    lineHeight: 0.9
    color: "{colors.pink}"
    description: "Chart callout number — large pink serif numeral with smaller paper-colored unit suffix."
  arrow-glyph:
    width: 24px
    height: 24px
    color: "{colors.pink}"
    description: "Small pink right-arrow SVG used between process steps."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Pink Script is a **nocturnal couture editorial system** built on a single atmospheric premise: a deep warm-black surface lit from the upper-left by a slightly warmer #1A1218 ellipse that fades to near-black across the lower-right. The off-center light source reads as a studio softbox catching one corner of a magazine spread. Over this, a subtle film-grain overlay at 8% opacity with screen blend adds the photographic graininess of late-night editorial photography. Inside this surface sits a 1px hairline interior frame (paper-blush at 14% opacity, inset 36px from each edge) — the editorial border of every page. Without the lit gradient, the film grain, and the interior frame, the system collapses into flat dark UI.

The typeface stack is a deliberate three-voice editorial pairing. **DM Serif Display** carries every editorial moment — script titles (treated as the system's "pink script"), serif headlines, stat figures, quote text. It runs at weight 400 only; the face has just one weight and that's the system's display voice. The serif scales freely from 32px (table labels) all the way up to 600px (section-divider numerals). **Inter** at weight 300 carries every body paragraph, lead, description, and caption — the ultra-light geometric sans is the system's calm prose voice. **JetBrains Mono** at weight 400 carries every label, kicker, page number, axis tag, runner, and footer string — always uppercase with at least 0.08em positive tracking.

The palette is anchored to a single signature: **hot pink fuchsia** (`{colors.pink}` — #ED3D8C) against deep warm-black (`{colors.ink-deep}` — #060507). The pink is the entire editorial accent system; it appears as script title color, as kicker color, as chart line color, as pill border, as inline `<em>` switch inside paper-blush headlines, as callout numerals, as rule color, and as the soft halo (text-shadow glow) behind hero script titles. **Paper-blush** (`{colors.paper-blush}` — #F5EDF1) is the secondary text color — used for editorial sans-serif headlines, paragraph copy, and any moment that should read as ink rather than highlight. Muted paper at 55% opacity handles secondary text; hairline paper at 14% handles separators and the interior frame.

Depth is created through three layered mechanisms: the **off-center radial gradient surface** (lit from the upper-left), the **subtle film-grain overlay** (8% opacity, screen blend, adds photographic texture), and the **pink halo text-shadow** on hero script titles (a soft 80–120px glow that simulates the light bleed of large neon-saturated type on photographic paper). There are no drop shadows on any element; the depth is atmospheric and photographic, not structural.

**Density philosophy: sparse-medium with one hero moment.** Pink Script reads as elegant when a single oversized script anchors the slide and the rest is generous negative space punctuated by 2–4 small editorial fragments (a runner, a kicker, a paragraph, a footer). A slide with the hero script taking up 60–70% of the canvas and the supporting copy quietly orbiting the remaining margin is correct. Cramming the canvas with multiple equally-weighted regions breaks the late-night magazine feeling. The exception is the stats slide (5 stat rows side-by-side), the comparison matrix (full-grid table), and the system slide (multiple panels) — these slides are denser by design because the editorial purpose is reference, not poetry. Process and TOC slides are populated but always hierarchical: a giant script header dominates, with smaller card rows orbiting beneath.

**Key Characteristics:**
- Deep warm-black surface (`{components.slide-surface}`) lit from the upper-left by a radial gradient ellipse.
- A subtle film-grain overlay (`{components.film-grain}`) on every slide — opacity 0.08, screen blend.
- A 1px paper-blush interior frame (`{components.hairline-frame}`) inset 36px from each edge, present on every slide.
- Hot fuchsia pink (`{colors.pink}`) is the single chromatic accent — used as script color, kicker color, line color, pill outline, inline emphasis, and the soft halo behind hero scripts.
- DM Serif Display carries every editorial moment, scaling from 32px to 600px. There is no second display face.
- Inter at weight 300 carries every body paragraph — ultra-light sans is the system's prose voice.
- JetBrains Mono uppercase at 0.08em+ tracking carries every label, page number, and runner string.
- Top runner and bottom footer chromes appear on every slide; the runner brand text is pink, everything else in chrome is muted paper-blush.
- The inline `<em>` element switches paper-blush serif headlines to pink — the system's editorial emphasis mechanism.

## Colors

### Palette

- **Ink Deep** (`{colors.ink-deep}` — #060507): The base surface color. A near-black with a faint warm shift. Combined with the radial gradient, this anchors the dark editorial surface.
- **Ink Violet** (`{colors.ink-violet}` — #0F0D11): A slightly lifted dark with a violet cast. Reserved alternate dark — available but rarely used in current slide types.
- **Paper Blush** (`{colors.paper-blush}` — #F5EDF1): A warm off-white with a faint pink undertone. The primary editorial text color, the QR-tile background, and the secondary highlight surface. Reads as paper rather than pure white.
- **Pink** (`{colors.pink}` — #ED3D8C): Hot fuchsia. The system's single chromatic accent. Used as the script title color, kicker color, inline `<em>` color, callout numeral color, rule color, chart line color, pill outline color, and the source color for the halo text-shadow.
- **Pink Light** (`{colors.pink-light}` — #FF66A8): A brighter pink. Defined but not used in current slide types.
- **Pink Deep** (`{colors.pink-deep}` — #B81D67): A darker pink. Defined but not used in current slide types.
- **Line Pink** (`{colors.line-pink}` — rgba(237,61,140,0.32)): Pink at 32% opacity for table row dividers and chart axis lines.
- **Mute Paper** (`{colors.mute-paper}` — rgba(245,237,241,0.55)): Paper-blush at 55% for muted body text and metadata.
- **Hair Paper** (`{colors.hair-paper}` — rgba(245,237,241,0.14)): Paper-blush at 14% for the interior hairline frame, dim pill borders, and toc-row dividers.

### Defaults

- **Default slide surface**: `{components.slide-surface}` — the lit warm-black radial gradient. Always.
- **Default film grain**: `{components.film-grain}` at opacity 0.08 with screen blend. Non-optional.
- **Default interior frame**: `{components.hairline-frame}` at 1px paper-blush 14%. Non-optional.
- **Default primary headline color**: For a hero script moment, `{colors.pink}`. For an editorial headline that should read as ink (not highlight), `{colors.paper-blush}`.
- **Default body text color**: `{colors.paper-blush}` for primary copy; `{colors.mute-paper}` for muted lead and description.
- **Default kicker color**: `{colors.pink}`. The eyebrow label is always pink.
- **Default label / metadata color**: `{colors.mute-paper}` for runner, footer, and metadata.
- **Default line / divider color**: `{colors.pink}` at 45% opacity for soft pink rules; `{colors.hair-paper}` for muted hairlines.
- **Default emphasis mechanism inside a paper-blush headline**: wrap in `<em>` to switch that word to `{colors.pink}` (font-style stays upright).
- **Default pill state**: outline (`{components.pill-outline}`) — pink border, pink text.
- **Default chart series**: pink line for primary; muted paper-blush dashed for secondary.

The pink is the only chromatic color in regular use; the other pink variants (Pink Light, Pink Deep) are reserved. Don't introduce a second chromatic accent — Pink Script's identity is that it is monochromatically pink.

## Typography

### Font Family

The system loads three web fonts: **DM Serif Display** (weight 400, italic 0 only) carries every editorial / display moment from 32px up to 600px; **Inter** (weights 300, 400, 500, 600) carries every body paragraph and lead; **JetBrains Mono** (weights 400, 500) carries every label, runner, footer, and metadata string.

The emotional register of each face is distinct:
- DM Serif Display reads as **editorial, perfume-magazine, late-night couture** — the face has elegant high-contrast strokes and the system uses it for every moment that should feel literary or magazine-typeset.
- Inter at weight 300 reads as **calm, contemporary, neutrally elegant** — the ultra-light weight matches the editorial tone without competing with the serif.
- JetBrains Mono reads as **archival, boutique-catalog, edition-numbered** — the mono uppercase voice handles edition numbers, page positions, runner brand text, and section tags.

A key inline mixing rule: **the `<em>` element inside a DM Serif Display headline switches color to `{colors.pink}`** (font-style normalized to upright). This is the system's primary headline emphasis — pink ink inside paper-blush serif text.

A second inline mixing rule: **a `<sup>` element inside a stat figure renders at ~36px in `{colors.paper-blush}`** with a slight top-padding offset — used for unit suffixes (%, ×, M).

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.script-section}` | 600px | DM Serif Display | 400 | Section-divider mega numeral |
| `{typography.script-huge}` | 540px | DM Serif Display | 400 | Hero script in a feature display position |
| `{typography.script-giant}` | 360px | DM Serif Display | 400 | Large editorial script title |
| `{typography.script-cover}` | 280px | DM Serif Display | 400 | Cover script title |
| `{typography.script-large}` | 220px | DM Serif Display | 400 | TOC primary script |
| `{typography.script-med}` | 156px | DM Serif Display | 400 | Process slide primary headline |
| `{typography.serif-cta}` | 140px | DM Serif Display | 400 | Closing CTA headline (paper-blush color) |
| `{typography.script-sm}` | 132px | DM Serif Display | 400 | Stat-slide headline, matrix headline |
| `{typography.serif-stat}` | 116px | DM Serif Display | 400 | Stat row figure |
| `{typography.callout-num}` | 120px | DM Serif Display | 400 | Chart callout numeral |
| `{typography.serif-quote}` | 92px | DM Serif Display | 400 | Quote-slide body text |
| `{typography.serif-chart-h}` | 90px | DM Serif Display | 400 | Chart-slide headline |
| `{typography.serif-section-h}` | 88px | DM Serif Display | 400 | Section divider supporting headline |
| `{typography.serif-toc-num}` | 64px | DM Serif Display | 400 | TOC row numeral |
| `{typography.serif-toc-title}` | 56px | DM Serif Display | 400 | TOC row title |
| `{typography.serif-quote-attr}` | 48px | DM Serif Display | 400 | Quote attribution name |
| `{typography.serif-process-h}` | 38px | DM Serif Display | 400 | Process step heading |
| `{typography.serif-matrix-label}` | 32px | DM Serif Display | 400 | Matrix row label |
| `{typography.body}` | 24px | Inter | 300 | Standard body paragraph |
| `{typography.body-muted}` | 22px | Inter | 300 | Muted lead and description |
| `{typography.body-toc-desc}` | 24px | Inter | 300 | TOC row description |
| `{typography.mono-runner}` | 24px | JetBrains Mono | 400 | Top runner and bottom footer |
| `{typography.mono-kicker}` | 22px | JetBrains Mono | 400 | Pink kicker eyebrow |
| `{typography.mono-label}` | 22px | JetBrains Mono | 400 | Standard paper-blush label |
| `{typography.mono-cover-pre}` | 28px | JetBrains Mono | 400 | Cover preamble line (with 0.42em wide tracking) |
| `{typography.mono-pill}` | 16px | JetBrains Mono | 400 | Pill text |

### Defaults

- **Default primary content headline**: `{typography.script-sm}` (132px) — when the slide is a content moment with a strong headline.
- **Default cover / opening headline**: `{typography.script-cover}` (280px) — the cover script lockup.
- **Default section-divider mega numeral**: `{typography.script-section}` (600px).
- **Default body paragraph**: `{typography.body}` (24px Inter 300).
- **Default muted lead / description**: `{typography.body-muted}` (22px Inter 300, mute-paper color).
- **Default label / kicker**: `{typography.mono-kicker}` (22px JetBrains Mono, pink).
- **Default footer / runner**: `{typography.mono-runner}` (24px JetBrains Mono).
- **Default stat figure**: `{typography.serif-stat}` (116px) with a 36px paper-blush `<sup>` for unit.
- **Default weight for any display element**: 400 (DM Serif Display has only one weight).
- **Default weight for body**: 300.

When unsure, the canonical pattern is: a 22px pink kicker + a 132–156px DM Serif Display headline (with one `<em>`-wrapped word in pink if extra emphasis is needed) + a 22–24px Inter 300 paragraph in muted paper-blush. That three-element pattern is the system's most reliable rhythm.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every slide carries the radial-gradient surface, the film-grain overlay, AND the 1px paper-blush interior frame.** All three together. Removing any one collapses the editorial-magazine reading.
- **Every hero script element (sizes 280px and larger) carries the pink halo text-shadow.** `{components.pink-glow}` for hero scripts (80px blur); `{components.pink-glow-mega}` for section-divider mega numerals (120px blur). The halo simulates the light bleed of neon-saturated print.
- **Every script color is `{colors.pink}`.** DM Serif Display in any other color is not "script" — it becomes "serif headline." The pink color is what defines script vs. headline in this system.
- **Paper-blush serif headlines may switch one word to pink via `<em>`** — this is the system's headline emphasis mechanism. The `<em>` stays upright (font-style: normal).
- **DM Serif Display headlines always have `padding-bottom: .1em` (or `.12em` for the largest script).** This compensates for the serif descenders so the visual baseline reads correctly aligned.
- **All JetBrains Mono is uppercase with at least 0.08em positive tracking** (most chrome and labels use 0.12–0.18em; the cover preamble uses 0.42em).
- **Body text is always Inter at weight 300.** Inter at any other weight is not body — switching to 400 reads as a different tone.
- **The kicker is always pink** in `{colors.pink}`. The eyebrow color is non-negotiable.
- **Runner brand text on the left is always pink; the right-side meta is always muted paper-blush.** The pink brand text is the system's persistent identity signal.
- **The page-position footer uses paper-blush base text with a pink `<em>` for the current number.** Format: `<span>03 / 09</span>` where `03` is wrapped in `<em>` to render pink.

### Typography Principles

The rhythm of Pink Script is **oversized pink script + paper-blush serif paragraph headline + muted Inter prose + small mono editorial tag**. Switching any voice (e.g., setting a script in Inter, or body in DM Serif) collapses the system's editorial register. The serif scales freely from 32px to 600px; choose the size based on the slide's hero moment, not on a fixed scale.

Italic letterforms are not used (DM Serif Display does have an italic, but it's not loaded by the template). The `<em>` tag is repurposed as a pink color switch. Underline is not used. Bold weight is not available in DM Serif Display, and using bold Inter for body breaks the calm prose voice.

## Layout

### Canvas System

The system targets a **fixed 1920×1080 canvas** rendered inside a `<deck-stage>` web component. All sizes are pixel-fixed; the stage handles proportional scaling.

Most slides use **absolute positioning** with edge-anchored elements. The standard content area is `inset: 140px 60px 140px 60px` — a 140px top reserve for the runner + headline area, 140px bottom reserve for the footer, and 60px left/right edge margins.

### Padding and Anchoring

| Anchor | Value | Use |
|---|---|---|
| `edge-x` | 60px | Left and right edge margins for content |
| `edge-top-chrome` | 60px | Top inset for the runner chrome |
| `edge-bottom-chrome` | 60px | Bottom inset for the footer chrome |
| `content-top` | 140px | Top inset for slide body content (below runner) |
| `content-bottom` | 140px | Bottom inset for slide body content (above footer) |
| `inner-frame-inset` | 36px | The hairline interior frame inset |

### Chrome Frame

Every slide carries a **top runner** at 60px top / 60px sides — a brand name on the left (always pink) and a section / chapter tag on the right (muted paper-blush). The runner is JetBrains Mono uppercase at 24px with 0.14em tracking.

Every slide also carries a **bottom footer** at 60px bottom / 60px sides — typically a source or confidentiality string on the left and a page-position marker on the right. The page-position uses paper-blush base with a pink `<em>` for the current number (e.g., `01 / 09`).

The **hairline interior frame** at 1px paper-blush 14% sits at `inset: 36px` on every slide. It is the editorial border of the magazine page and present unconditionally.

## Depth and Elevation

### No Box Shadows, Atmospheric Depth Only

The system uses **zero box-shadow declarations** on any structural element. Depth comes from three atmospheric layers:

1. **The radial-gradient surface** (`{components.slide-surface}`) — lit from the upper-left by a warm dark ellipse fading to near-black across the lower-right. This creates the impression of a studio softbox catching one corner of the page.
2. **The film-grain overlay** (`{components.film-grain}`) — 8% opacity, screen blend, adds photographic graininess to the surface.
3. **The pink halo text-shadow** on hero script titles — a soft 80–120px blur in pink at low alpha that simulates the light bleed of large neon-saturated type on photographic paper.

### No Drop Shadows on Cards or Panels

Cards, tables, and panels do not carry shadows. The system's "card" pattern is structural rather than elevated: a region defined by a border or a left-rule, sitting flat on the surface.

### Hairline Rules as Structural Depth

Where the system needs to separate regions, it uses:
- 1px pink at 45% opacity (`{components.pink-rule}`) for soft pink rules.
- 1px paper-blush at 14% (`{components.hair-paper}`) for muted hairline separators.
- 1px pink at 32% (`{colors.line-pink}`) for table row dividers and chart axis lines.

Never a 2px or thicker rule. Never a colored rule outside pink and paper.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0px | Cards, panels, table cells, QR tiles, runner / footer text |
| 999px | None — pills here are explicitly rectangular |

The system has **zero border-radius** on any structural element. Pills are 0-radius rectangles (despite the "pill" naming convention). The only round element is the small chart-callout circle marker (an SVG `<circle>` element marking an inflection point).

### Border Weights

- **1px solid paper-blush at 14%** — the universal interior hairline frame.
- **1px solid pink** (`{colors.pink}`) — pill outlines.
- **1px solid pink at 32%** (`{colors.line-pink}`) — table dividers, chart axes.
- **1px solid paper-blush at 14%** — TOC row dividers, footer separators.
- **1px solid pink** at full opacity — left callout-rail border, top-of-step border in process slides.
- **1px dashed pink at 18%** — chart grid lines.

No other border weights exist. There is no 2px, 3px, or thicker border anywhere in the system.

### Decorative Element Types

**Hero script title** — A DM Serif Display headline at 220–600px in pink with the halo text-shadow. The defining moment of any slide that uses it. Always pink, always with the glow, always carries `padding-bottom: .1em` to compensate for descenders.

**Paper-blush serif headline** — A DM Serif Display headline at 88–140px in paper-blush. Used when the moment should read as ink rather than highlight. May contain `<em>` to switch one word to pink.

**Pink kicker** — A 22px JetBrains Mono uppercase eyebrow in `{colors.pink}` placed above a headline. The system's most consistent appearance of pink alongside the hero script.

**Mono runner / footer** — Standard JetBrains Mono chrome at 24px / 0.14em tracking. The brand on the runner is always pink; the rest is muted paper-blush.

**Pink rule (`{components.pink-rule}`)** — 1px pink at 45% opacity. Used as a soft separator.

**Hairline rule (`{components.hair-rule}`)** — 1px paper-blush at 14% opacity. Used as a muted separator and as the TOC row divider.

**Callout rail (`{components.callout-rail}`)** — A 1px pink left border with right-aligned content padding-left 24px. Used as a vertical callout container beside charts or beside a chapter explanation.

**Stat row (`{components.stat-row}`)** — A 240px serif figure paired with a mono label + Inter description, separated from the next row by a 1px paper hairline. Stat figures are pink; descriptions are muted paper-blush.

**Pills (`{components.pill-outline}`, `{components.pill-solid}`, `{components.pill-dim}`)** — Three pill states: hollow pink (default), solid pink with deep-ink text (affirmative / featured), and dim hairline (de-emphasized). All are 0-radius rectangles.

**QR tile (`{components.qr-tile}`)** — A 180×180 paper-blush square with 12px white padding and an SVG QR inside. The only large light-surface element in the system; it functions as a "ticket" object on the CTA slide.

**Chart callout** — A 120px pink serif numeral with a 0.5em paper-colored unit suffix, plus a small mono label and a 22px muted Inter description, anchored to the right of a chart by a 1px pink callout rail.

**Chart line** — A 3px solid pink line for the primary series; a 2px paper-blush dashed line for the secondary series. The inflection point on the primary line carries a 9px solid pink circle with an 18px hollow ring at 50% opacity and a vertical dashed line dropping to the axis.

**Process step** — A vertical column anchored by a 1px solid pink top border with a 96px pink serif numeral, a 38px paper-blush serif heading, and an Inter description. Steps are separated by a 24px gap and connected by a small pink arrow glyph.

**Matrix table** — A 4-column grid with the first column being a 32px paper-blush serif label, the column header row colored pink, and the "our column" row tinted with `rgba(237, 61, 140, 0.08)` to mark it.

## Do's and Don'ts

### Do
- Apply the radial-gradient surface, the film-grain overlay, and the 1px paper-blush interior frame to every slide. All three are non-optional.
- Set hero script titles in `{colors.pink}` with the halo text-shadow. The glow is part of the script's identity.
- Use DM Serif Display for every editorial / display moment. The serif is the system's only editorial face — don't substitute a second face.
- Set body paragraphs in Inter at weight 300. The ultra-light weight is the system's calm prose voice.
- Use JetBrains Mono uppercase with at least 0.08em tracking for every label, page number, runner, and footer string.
- Use `<em>` inside a paper-blush serif headline to switch one word to pink — the system's primary headline emphasis.
- Place a pink kicker above every primary headline. The pink eyebrow is the system's editorial signal.
- Use the pink left-rule callout (`{components.callout-rail}`) to anchor a stat, a callout, or a chapter explanation to the right of a chart or content region.
- Add `padding-bottom: .1em` to every DM Serif Display headline. The serif descenders need compensation.
- Use the page-position footer pattern with pink `<em>` for the current number: `<em>03</em> / 09`.

### Don't
- Don't omit the film grain or the interior hairline frame. The system's editorial atmosphere depends on both.
- Don't use box-shadow on any panel or card. Depth is atmospheric, not structural.
- Don't introduce a second chromatic accent. Pink is the only accent. Adding red, blue, or green breaks the system.
- Don't render the pink fuchsia as text on the paper-blush surface — the contrast inverts and looks like a typo.
- Don't put body copy in DM Serif Display. The serif is for editorial moments, not paragraphs.
- Don't put display headlines in Inter. The sans is the body voice, not the headline voice.
- Don't round any element. Cards, pills, tables, QR tiles — all strict rectangles.
- Don't use blurred shadows on any element. The only "shadow" in the system is the pink halo text-shadow on hero scripts, and that's a glow, not a drop shadow.
- Don't use italic letterforms. The `<em>` tag is repurposed as a pink color switch.
- Don't crowd a slide with multiple equally-weighted regions. The system reads as elegant when one hero moment dominates.

## Responsive Behavior

The system targets a **fixed 1920×1080 canvas** rendered inside a `<deck-stage>` web component. The stage handles proportional scaling to the browser viewport — all pixel-fixed sizes inside the canvas scale uniformly.

### Presenter Behavior
- Navigation, scaling, and presenter chrome are handled by the `<deck-stage>` component.
- Keyboard, touch, and mouse-wheel navigation are managed by the stage.
- The canvas is constant 1920×1080 regardless of viewport.

### Print Behavior
Print export depends on the deck-stage component's print handling. The pink halo text-shadow and the film-grain overlay may render inconsistently in PDF export — test before assuming visual parity.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face | Chinese face (recommended) | Weight | Notes |
|---|---|---|---|---|
| Script / display (DM Serif Display) | DM Serif Display | **思源宋体 Noto Serif SC** | **900** | Heavy serif that holds visual mass on dark backgrounds. The default choice. |
| Display alternate (delicate moments) | DM Serif Display | 站酷小薇体 ZCOOL XiaoWei | 400 | Couture-thin display face — use only at very large sizes (400px+) where delicacy reads as intentional. Too thin on dark backgrounds at typical headline sizes (40–200px). |
| Body (Inter 300) | Inter | Noto Serif SC (思源宋体) | 400 | Serif body keeps the editorial register cohesive with the heavy display. |
| Label / runner (JetBrains Mono UPPERCASE tracked) | JetBrains Mono | Noto Sans SC | 400 (do not force monospace on CJK) | |

### Mixed-Content Strategy

Strategy A — extend each token's `fontFamily` to include the Chinese face after the Latin face. DM Serif Display tokens become `"DM Serif Display, 'Noto Serif SC', serif"` with `font-weight: 900` on the Chinese run; Inter body tokens become `"Inter, 'Noto Serif SC', system-ui, sans-serif"`; JetBrains Mono tokens become `"JetBrains Mono, 'Noto Sans SC', monospace"`. Latin glyphs render in their original face; CJK falls through automatically.

**Critical**: when Chinese text uses the display role, set `font-weight: 900` explicitly. DM Serif Display's "single weight" is already visually heavy because it's a high-contrast display serif — the equivalent CJK heaviness lives at weight 900 in Noto Serif SC, not weight 400.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Serif+SC:wght@400;500;700;900&family=Noto+Sans+SC:wght@400;500;700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
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

Pink Script (After Hours) is a nocturnal couture system whose entire editorial identity rests on DM Serif Display in hot fuchsia pink at sizes up to 600px against dim warm-black paper. The visual weight of DM Serif Display at any size is substantial — high-contrast strokes, serif terminals, and a typographic mass that holds against the dark background.

The recommended Chinese equivalent is **思源宋体 Noto Serif SC at weight 900**. This carries the same visual mass as DM Serif Display: bold serif terminals, sufficient stroke density to read clearly against the dark surface, and the editorial register that defines the system. Weight 900 is non-negotiable for display moments — anything lighter (400, 500, even 700) will visually disappear against the pink-glow + dark-paper combination and break the entire couture register.

**站酷小薇体 ZCOOL XiaoWei** is a viable secondary option for moments where extreme delicacy reads as intentional — a single 400-px+ pull-quote, a hairline section divider title, a brand wordmark at the very top of a cover slide. Its single-weight 400 with extreme stroke contrast carries a different feeling: dressier, more whisper-thin, more vintage-Vogue than modern-fashion-editorial. For most display work, choose Noto Serif SC 900; reach for XiaoWei only when the moment is genuinely a delicate accent at extreme size.

The pink halo text-shadow (`{components.pink-glow}` at 80–120px blur) transfers perfectly to Chinese characters regardless of which display face you choose. **Apply the same glow to every Chinese display moment in pink** — the neon bleed effect is script-agnostic and the late-night magazine atmosphere survives the script switch fully.

The pink color (`{colors.pink}` — #ED3D8C) as the only chromatic accent works unchanged. The inline `<em>` color switch (paper-blush headline with one word in pink) is a clean transfer to Chinese — wrap one CJK character or one phrase in `<em>` and the pink ink switch reads exactly the same.

**Inter at weight 300 for body** does not transfer directly. Noto Serif SC at weight 400 is the recommended body face — its high-contrast serif stroke matches the couture register of the system's overall feel. Body color stays paper-blush (`{colors.paper-blush}`); the ultra-light register is achieved through size, paper-blush color, and the muted 55%-opacity lead, not through font weight.

JetBrains Mono uppercase tracked labels (runner brand, page numbers, footer chrome) do not transfer to CJK. Pure Latin chrome strings (the brand name itself, edition numbers like `01 / 09`) keep JetBrains Mono. For Chinese chrome text (a section / chapter tag in the upper-right), use Noto Sans SC 400 at the same 24px size with letter-spacing reset to 0 and no uppercase.

The radial-gradient surface, the film-grain overlay, the 1px paper-blush interior frame — all script-agnostic. The pink halo, the kicker, the callout rail, the stat-row pattern, the matrix-cell — all transfer unchanged.

### Known CJK Gap

DM Serif Display's "single weight" is misleading: it's a high-contrast display serif that reads as visually heavy at any size. The Chinese equivalent heaviness lives at Noto Serif SC **weight 900**, not weight 400 — using weight 400 for display will make Chinese headlines look limp and disconnected from the bold pink callouts. The system's reliance on size for hierarchy still works in Chinese, but you must lock display weight at 900 to preserve the visual mass.

ZCOOL XiaoWei is the only CDN-loadable Chinese face that captures the "high-contrast couture serif" character in its proportions, but its single-weight 400 is too thin for most display sizes on this template's dark surface. Treat XiaoWei as a niche option, not the default.

## Iteration Guide

1. Every new slide background is the lit radial gradient (`{components.slide-surface}`) with film grain and the interior hairline frame. Don't skip any of the three layers.
2. Every new hero script title is DM Serif Display in `{colors.pink}` with the halo text-shadow at 80–120px blur.
3. Every new editorial headline that should read as ink (not highlight) is DM Serif Display in `{colors.paper-blush}`. Use `<em>` inside to switch a word to pink.
4. Every new body paragraph is Inter at weight 300 in paper-blush (full) or mute-paper (muted).
5. Every new label, runner, footer, or metadata tag is JetBrains Mono uppercase at 0.08em+ tracking.
6. Every new kicker eyebrow is pink. Don't render a kicker in any other color.
7. Every new pill is a 0-radius rectangle. Choose outline (default), solid (affirmative), or dim (de-emphasized) state.
8. Every new table or matrix uses 1px pink-at-32% row dividers and no vertical borders.
9. Every chart uses a 3px solid pink line for primary and a 2px paper-blush dashed line for secondary. Don't introduce a third color.
10. The runner brand text is always pink; the right-side meta is always muted paper-blush. Don't swap.

## Known Gaps

- The system depends on a `<deck-stage>` web component loaded via `deck-stage.js`. Without it, the 1920×1080 canvas will not scale and slides will render at native pixel size.
- The film-grain overlay uses a data-URI SVG with `feTurbulence`. Some browsers (older Safari) render the noise inconsistently or skip it in PDF export.
- DM Serif Display has only weight 400. There is no bold or italic variant available — the system has no fallback weight scale and depends on size alone for hierarchy.
- The pink halo text-shadow uses fixed 80px and 120px blur values. At very small viewport scales, the glow may dominate the type; at very large scales, the glow may appear weak.
- The `{colors.pink-light}`, `{colors.pink-deep}`, and `{colors.ink-violet}` tokens are defined but inactive in current slide types. They are reserved for future variation.
- The QR-tile SVG inside the CTA slide is a hand-coded pattern of `<rect>` elements that does not encode a real scannable code. Real QR codes need to be generated externally.
- Chart line points and inflection markers are SVG `<polyline>` coordinates that must be computed manually. There is no data-binding layer.
- The cover script lockup uses `padding-left: 180px` on the second line for an indented hanging effect. This is a hardcoded layout decision and doesn't generalize to other word lengths — long second lines may break the centering.
- The runner and footer rely on `white-space: nowrap` to prevent line-wrap. Extremely long brand names or page-position strings may overflow the 60px edge margin.
- The matrix `cell.us` column highlight is a hardcoded `rgba(237, 61, 140, 0.08)` wash. Tinting other columns requires per-column class additions.
