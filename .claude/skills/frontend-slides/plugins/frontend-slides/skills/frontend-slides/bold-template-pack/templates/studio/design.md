---
version: alpha
name: Studio
description: "A \"Boring Studios\" agency presentation system — type-as-graphic-mass in the spirit of contemporary design-studio decks (Pentagram, Anti, Order). The entire system runs on Barlow at weight 900 uppercase, with type so heavy at display scale that it stops being type and starts being a shape. The palette is binary plus one: near-black field (#1C1C1C), acid yellow type (#F5D200), and the same yellow as a full slide background. IBM Plex Mono carries every footer metadata, slide counter, and three-column lockup. No drop shadows, no rounded corners, no accent colors — the headline IS the design, and the only chromatic decision per slide is dark-yellow-on-near-black or near-black-on-acid-yellow."

colors:
  near-black: "#1C1C1C"
  near-black-alt: "#242422"
  acid-yellow: "#F5D200"
  acid-yellow-alt: "#F0CC00"
  text-on-dark-2: "rgba(245,210,0,0.58)"
  text-on-dark-3: "rgba(245,210,0,0.32)"
  text-on-light-2: "rgba(28,28,28,0.62)"
  text-on-light-3: "rgba(28,28,28,0.35)"
  border-dark: "#2E2E2C"
  border-light: "rgba(28,28,28,0.18)"

color-aliases:
  c-bg: near-black
  c-bg-alt: near-black-alt
  c-bg-light: acid-yellow
  c-bg-light-alt: acid-yellow-alt
  c-fg: acid-yellow
  c-fg-light: near-black
  c-accent: acid-yellow
  c-fg-2: text-on-dark-2
  c-fg-3: text-on-dark-3
  c-fg-light-2: text-on-light-2
  c-fg-light-3: text-on-light-3

typography:
  display:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: 12vw
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.02em
    textTransform: uppercase
  h1:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: 7.5vw
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.02em
    textTransform: uppercase
  h2:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: 4.8vw
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.01em
    textTransform: uppercase
  h3:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: 2.8vw
    fontWeight: 700
    lineHeight: 1.1
    textTransform: uppercase
  quote-text:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: 3.8vw
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: -0.02em
    textTransform: uppercase
  stat-value:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: 5.5vw
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.03em
    textTransform: uppercase
  lead:
    fontFamily: "Barlow, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.6vw
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "Barlow, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.15vw
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Barlow, Noto Sans SC, system-ui, sans-serif"
    fontSize: 0.85vw
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: 0.72vw
    fontWeight: 500
    letterSpacing: 0.06em

spacing:
  pad-x: 5vw
  pad-y: 5vh
  gap-lg: 3.5vh
  gap-md: 2vh
  gap-sm: 1vh

canvas:
  width: 100vw
  height: 100vh

components:
  chrome-bar:
    borderBottom: "1px solid {colors.border-dark} (or {colors.border-light} on yellow)"
    paddingBottom: "{spacing.gap-sm}"
    marginBottom: "{spacing.gap-md}"
    description: "Top chrome bar — mono label left, mono counter right, hairline rule beneath."
  foot-bar:
    borderTop: "1px solid {colors.border-dark} (or {colors.border-light} on yellow)"
    paddingTop: "{spacing.gap-sm}"
    marginTop: "{spacing.gap-md}"
    description: "Bottom chrome bar — mirror of chrome-bar."
  cover-meta:
    display: "grid 1fr 1fr 1fr"
    borderTop: "1px solid rgba(245,210,0,0.25)"
    description: "Three-column mono metadata footer over the cover image: studio × client + date, presentation title (center), studio name (right). The signature 'Boring Studios' lockup."
  stat-card:
    borderTop: "2px solid (acid-yellow on dark, near-black on yellow)"
    padding: "{spacing.gap-md} {spacing.gap-md} {spacing.gap-md} 0"
    description: "Stat tile with a 2px top rule. Value at 5.5vw weight 900 in the surface's foreground color; label and mono note beneath."
  bullet-marker:
    content: "—"
    color: "acid-yellow on dark, near-black on yellow"
    fontFamily: "{typography.body.fontFamily}"
    description: "Em-dash bullet prefix on every list item; color follows the surface accent."
  compare-divider:
    borderRight: "2px solid (near-black on yellow, dark-text-3 on dark)"
    description: "Single vertical 2px rule separating two compare panels."
  bar-fill-default:
    background: "muted text-on-surface (dark-text-3 or light-text-3)"
    description: "Default chart bar fill — muted version of the surface text color."
  bar-fill-accent:
    background: "acid-yellow on dark, near-black on yellow"
    description: "Highlighted chart bar — the surface's primary foreground color."
  chart-baseline:
    height: "2px"
    background: "muted accent (dark-text-3 or border-light)"
    description: "Heavier 2px baseline beneath chart bars — Studio uses thicker rules than Signal."
  cover-img-area:
    position: "absolute inset 0"
    background: "{colors.near-black-alt}"
    description: "Cover image placeholder filling the entire slide behind the cover-type and cover-meta. Image-or-placeholder occupies the whole canvas; type sits on top."
  img-placeholder:
    background: "near-black-alt on dark, acid-yellow-alt on yellow"
    description: "Warm-toned rectangular placeholder for images, centered mono label inside, no border on dark / hairline border on yellow."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Studio is a **type-as-graphic-mass** presentation system — the visual register of contemporary design-studio decks (Pentagram, Anti, Order, "Boring Studios" agency aesthetic). The premise is reductive to the point of severity: a single typeface (Barlow), at a single weight (900), in strict uppercase, at scales so large that type stops behaving like type and starts behaving like a graphic shape. The headline IS the design — there are no decorative elements, no accent colors, no ornaments. If you removed every other element from a Studio slide and left only the headline, the slide would still read as Studio.

The palette is **binary plus one**. The dark surface is `{colors.near-black}` (#1C1C1C) — a warm dark, not cold neutral. The light surface is `{colors.acid-yellow}` (#F5D200) — a saturated cadmium yellow that fills the entire slide, not as an accent but as the environment. On dark slides, text is `{colors.acid-yellow}`. On yellow slides, text is `{colors.near-black}`. That's the entire color system: dark/yellow, yellow/dark. There are no secondary colors, no grays, no warming accents. Even muted text is just the same color at reduced opacity (yellow at 58%, near-black at 62%).

The typeface stack is **functional rather than expressive**. Barlow at weight 900 carries every headline at every scale — from 1.15vw body all the way up to 12vw cover display. Barlow at 500 carries body and lead paragraphs. IBM Plex Mono carries the metadata footer, slide counter, and three-column cover lockup — and is the only point in the system where a second face appears. Mono is the system's "spec sheet" voice; everywhere else, Barlow dominates.

Depth is **flat and severe**. No drop shadows. No rounded corners. No gradients. Borders are 1px or 2px hairlines in `{colors.border-dark}` or `{colors.border-light}`. The 2px chart baseline and 2px stat-card top-rule are the heaviest lines in the system. The system reads as an architectural drawing or a manifesto poster — every line is intentional, nothing decorative.

**Density philosophy: low and deliberate.** Studio is sparse by design. A statement slide is one headline filling most of the canvas with empty surface above and below. A chapter slide is a small mono label and a headline. A cover is an image placeholder behind a single word at 12vw. Padding runs tighter than Signal (5vw / 5vh vs 7.5vw / 5.5vh) because the type itself runs nearly to the edge — the heading is the spatial fill, not the margin. A slide that feels broken in Studio is one that contains multiple competing elements or fills its canvas with body paragraphs. The correct register is "one massive thing, said once, in 900 weight uppercase."

**Key Characteristics:**
- Binary palette — `{colors.near-black}` field with `{colors.acid-yellow}` type, or `{colors.acid-yellow}` field with `{colors.near-black}` type. No third color.
- Barlow at weight 900 uppercase for every headline at every scale; Barlow 400/500 for body; IBM Plex Mono only for metadata chrome.
- Headlines run massive — cover display at 12vw (~230px at 1920px viewport), statements at 7.5vw, section headers at 4.8vw.
- Tight negative letter-spacing on all display type (-0.01 to -0.03em); uppercase non-negotiable.
- Flat: no drop shadows, no rounded corners, no gradients, no accent colors beyond the yellow/dark binary.
- Hairline 1px borders on chrome; 2px on stat-card tops, chart baselines, and compare panel dividers.
- Three-column mono metadata footer on the cover slide is the system's signature lockup (studio × client / presentation title / studio name).
- Em-dash bullet markers in the surface accent color (yellow on dark, near-black on yellow).
- Body and chrome opacity-tuned versions of the same color (yellow at 58%/32%, near-black at 62%/35%) — never a separate grey color.

## Colors

### Palette

- **Near-Black** (`{colors.near-black}` — #1C1C1C): The dark surface. A warm dark, slightly biased toward brown rather than cold neutral. The "ink" of the system.
- **Near-Black Alt** (`{colors.near-black-alt}` — #242422): A barely-lifted near-black for image placeholders and secondary dark surfaces. Visually nearly identical to near-black.
- **Acid Yellow** (`{colors.acid-yellow}` — #F5D200): The light surface AND the primary text color on dark surfaces. Cadmium yellow, saturated and slightly warm. On dark slides, this is the type color. On light slides, this is the background. Same color, two roles.
- **Acid Yellow Alt** (`{colors.acid-yellow-alt}` — #F0CC00): A slightly cooler yellow for adjacent-surface differentiation on light slides. Used sparingly.
- **Text on Dark 2** (`{colors.text-on-dark-2}` — rgba(245,210,0,0.58)): Secondary text on dark — yellow at 58% opacity. The system never uses a separate "grey" color; muting is opacity only.
- **Text on Dark 3** (`{colors.text-on-dark-3}` — rgba(245,210,0,0.32)): Tertiary text on dark — yellow at 32%.
- **Text on Light 2** (`{colors.text-on-light-2}` — rgba(28,28,28,0.62)): Secondary text on yellow — near-black at 62%.
- **Text on Light 3** (`{colors.text-on-light-3}` — rgba(28,28,28,0.35)): Tertiary text on yellow — near-black at 35%.
- **Border Dark** (`{colors.border-dark}` — #2E2E2C): Hairline border color on dark surfaces. Slightly lifted from near-black so it reads as a line, not a void.
- **Border Light** (`{colors.border-light}` — rgba(28,28,28,0.18)): Hairline border color on yellow surfaces. Low-opacity near-black for subtle separation.

### Defaults

- **Default surface**: alternate between `{colors.near-black}` (dark) and `{colors.acid-yellow}` (light) across the deck. Both surfaces are first-class. If unsure, reach for near-black for cover/quote/statement slides, acid-yellow for chapter and end slides.
- **Default primary text on dark**: `{colors.acid-yellow}`.
- **Default primary text on yellow**: `{colors.near-black}`.
- **Default secondary text on dark**: `{colors.text-on-dark-2}` (yellow at 58% opacity).
- **Default secondary text on yellow**: `{colors.text-on-light-2}` (near-black at 62%).
- **Default tertiary text** (mono captions, chart axis labels, stat notes): tier-3 opacity on the surface accent.
- **Default border on dark**: `{colors.border-dark}`.
- **Default border on yellow**: `{colors.border-light}`.
- **Default headline color**: surface accent — yellow on dark, near-black on yellow. Never any other color.
- **Default chart accent fill**: surface accent (yellow on dark, near-black on yellow). The "highlighted" bar is just the primary text color; "default" bars are tier-3 muted.

There are no semantic color roles. Yellow does not mean "warning"; near-black does not mean "primary." They are simply the two surfaces. Choice between them is rhythmic — alternate to vary the visual cadence, or run several dark slides in a row for a quiet section followed by a single yellow slide for a punctuation moment.

## Typography

### Font Family

Studio runs **two families** in strictly separated roles:

- **Barlow** (`{typography.display.fontFamily}`) — a contemporary grotesque with a wide weight axis. Carries every headline at every scale (display through h3), every numeral (stat-value), every quote, all body, and all lead paragraphs. The system uses weight 900 for all display and headline tokens; weight 700 for h3; weight 500 for lead and bullet markers; weight 400 for body and caption.
- **IBM Plex Mono** (`{typography.label.fontFamily}`) — a precision monospace. Used **only** for metadata labels — chrome bars, slide counters, chapter numbers, the three-column cover lockup, stat notes, mono captions inside cover-meta. Mono is the system's "metadata voice"; everywhere else, Barlow dominates.

The emotional split is binary: Barlow for content (loud, uppercase, dominant); IBM Plex Mono for spec-sheet metadata (small, precise, supportive). There is no third face.

Barlow weight 900 at display scale stops behaving like a typeface and starts behaving like a graphic shape — the letterforms are so heavy that counters (the holes inside letters) become structural negative space, and the headline reads as a black or yellow geometric block before it reads as words. This is the system's identity.

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display}` | 12vw | Barlow | 900 | Cover hero at maximum scale |
| `{typography.h1}` | 7.5vw | Barlow | 900 | Chapter title, full-slide statement headline |
| `{typography.stat-value}` | 5.5vw | Barlow | 900 | Statistical numeral inside a stat card |
| `{typography.h2}` | 4.8vw | Barlow | 900 | Primary slide headline |
| `{typography.quote-text}` | 3.8vw | Barlow | 900 | Pull-quote body (uppercase, no quote marks) |
| `{typography.h3}` | 2.8vw | Barlow | 700 | Sub-headline, panel title |
| `{typography.lead}` | 1.6vw | Barlow | 500 | Lead paragraph, intro sentence |
| `{typography.body}` | 1.15vw | Barlow | 400 | Default body paragraph, bullet body |
| `{typography.caption}` | 0.85vw | Barlow | 400 | Caption, source attribution |
| `{typography.label}` | 0.72vw | IBM Plex Mono | 500 | Mono chrome, slide counter, chapter number, stat note, cover-meta |

### Defaults

- **Default size for a primary section headline**: `{typography.h2}` (4.8vw).
- **Default size for a chapter or statement headline**: `{typography.h1}` (7.5vw).
- **Default size for a cover hero**: `{typography.display}` (12vw).
- **Default size for a paragraph body**: `{typography.body}` (1.15vw).
- **Default size for a lead sentence**: `{typography.lead}` (1.6vw).
- **Default size for any chrome label, counter, or mono caption**: `{typography.label}` (0.72vw).
- **Default size for a statistical numeral**: `{typography.stat-value}` (5.5vw) in the surface accent.
- **Default weight for any headline**: 900.
- **Default weight for any body element**: 400 (lead = 500).

When unsure between sizes, lean larger. Studio's identity depends on type running massive — a 4.8vw h2 reads as the system; a 2.8vw h3 used as a primary headline reads as a different system.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every display, h1, h2, h3, quote-text, and stat-value is uppercase.** Sentence-case display type does not exist. Even h3 (2.8vw) at weight 700 runs uppercase.
- **Every display headline uses weight 900.** Display, h1, h2, quote-text, and stat-value are all weight 900 — no exceptions. Using weight 800 or 700 at display scale breaks the type-as-graphic-mass effect.
- **Every display element uses negative letter-spacing.** Display at –0.02em, h1 at –0.02em, h2 at –0.01em, stat-value at –0.03em. Display Barlow 900 without negative tracking reads as untreated; the negative tracking is what gives the type its compressed density.
- **All chrome, labels, counters, and metadata are IBM Plex Mono at 0.06em tracking.** No exceptions. Mono labels in Barlow break the metadata/content separation.
- **Headlines are always rendered in the surface accent color** — yellow on dark, near-black on yellow. Never a muted opacity, never a different color.
- **Body bullets use an em-dash in the surface accent color**, never a dot, never a different glyph. The em-dash carries surface-aware color (yellow on dark, near-black on yellow).
- **Stat cards have a 2px (not 1px) top rule** in the surface accent (or muted accent on the dark side). The 2px rule is heavier than chrome hairlines because stats are anchors.
- **The three-column cover-meta lockup uses IBM Plex Mono with column 1 left-aligned, column 2 centered, column 3 right-aligned.** This is the "Boring Studios" signature; the column structure is non-negotiable.

### Typography Principles

The face ladder is fixed: Barlow for everything except metadata; IBM Plex Mono for metadata only. Mono outside metadata roles, or Barlow inside metadata roles, breaks the typographic separation.

The weight ladder is fixed too: 900 / 700 / 500 / 400. Intermediate weights (600, 800) are not used. The four-tier weight system is the entire expressive register of the typography.

Line-height runs tight at display scale (0.9 on display, 0.92 on h1) and opens to 1.5–1.6 on body. Letter-spacing is uniformly negative on display (–0.01 to –0.03em), zero on body, positive 0.06em on mono labels.

Italic is not used. Underline is not used. There is no font-style variation in the system; emphasis is achieved purely by weight contrast (900 headline against 400 body).

## Layout

### Canvas System

Studio targets `100vw × 100vh` — full viewport. Each `.slide` flexes to fill the viewport exactly, and slides sit side-by-side in a horizontal strip that translates left/right on navigation. All sizes use viewport-relative units (`vw`, `vh`) so layout scales fluidly.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-x}` | 5vw | Horizontal slide padding |
| `{spacing.pad-y}` | 5vh | Vertical slide padding |
| `{spacing.gap-lg}` | 3.5vh | Between major content sections |
| `{spacing.gap-md}` | 2vh | Between related elements |
| `{spacing.gap-sm}` | 1vh | Between tightly coupled elements |

Statement and chapter slides increase bottom padding to 1.5× pad-y so the headline drops to the lower portion of the slide with deliberate empty space above. The cover slide uses zero outer padding because the image area fills the entire canvas.

### Chrome Frame

Standard slides carry a top chrome bar and a bottom foot bar:

- **Chrome bar** — left-aligned mono label, right-aligned mono counter, 1px hairline rule beneath. Padding-bottom is `{spacing.gap-sm}`, margin-bottom is `{spacing.gap-md}`.
- **Foot bar** — left-aligned mono label, right-aligned mono counter, 1px hairline rule above. Mirror of the chrome bar.

The cover, chapter, statement, quote, and end slides omit standard chrome — those layouts use either the cover-meta lockup (cover) or nothing (chapter, statement, quote, end).

### Cover Lockup

The cover slide is the system's signature layout:
- An image placeholder fills the entire canvas behind everything.
- A single display headline (typically one word at 12vw) sits in the top area as `cover-type`.
- A three-column mono metadata footer sits at the bottom — column 1 left ("studio × client" + date), column 2 center (presentation title), column 3 right (studio name) — separated from the image area by a 1px hairline in yellow at 25% opacity.

## Depth and Elevation

Studio is **flat by design**. There are no drop shadows. No rounded card elevation. No gradients. Every element sits flush with the surface.

Apparent depth comes from:
- **Surface contrast** — near-black against acid-yellow when both appear (compare panels, image placeholders).
- **Hairline separation** — 1px and 2px borders divide regions.
- **Heavy type** — display headlines at weight 900 create visual mass that reads as foreground against the flat surface.

The system is intentionally severe. If a layout requires elevation to read correctly, the layout is wrong for Studio — reduce content or reorganize so that the flat surface plus heavy type plus hairlines provide enough hierarchy.

## Shapes and Treatment

### Border Radius

| Value | Use |
|---|---|
| 0 | Everything in the system |
| 50% (circle) | Nav dots and slide-counter UI only (not part of the slide content) |

Studio has **no rounded chrome**. Cards, panels, stat tiles, chart frames, image placeholders, compare panels — all strict rectangles with sharp corners. The only round shapes are the navigation dots and the underlying slide counter UI, which are deck-stage chrome, not slide content.

### Border Weights

- **1px solid** in `{colors.border-dark}` (on near-black) or `{colors.border-light}` (on yellow) — the universal hairline. Used on chrome bars, foot bars, cover-meta separator.
- **2px solid** in the surface accent (yellow on dark, near-black on yellow) — the heavier rule. Used on stat-card top rules, compare panel vertical dividers, chart baselines, chart bar-track left rules.
- **No dashed borders.** Every border in the system is solid.

### Decorative Element Types

**Display headline as graphic mass** — Barlow at weight 900 at display scale (4.8vw and above) sits as a black or yellow geometric block. The headline is the primary decorative element of every slide; there are no additional ornaments.

**Hairline rule** — a 1px solid line in the surface border color. Used to separate chrome from body, body from foot, and inside compare panels. The rule is the system's only structural divider.

**Heavy rule** — a 2px solid line in the surface accent (or muted accent). Used on stat-card tops, chart baselines, compare-panel vertical dividers. Heavier than the chrome hairline; reads as "anchor" rather than "separator."

**Stat card** — a flat region with a 2px top rule, a stat numeral (5.5vw Barlow 900) in the surface accent, a stat label (1.15vw Barlow 500), and an optional mono stat-note (0.85vw IBM Plex Mono at tier-3 opacity). Padding right and bottom; left padding is zero (the rule starts flush with the card's left edge).

**Cover-meta lockup** — the three-column mono footer at the bottom of the cover slide. Column 1: studio × client name on row 1, date on row 2. Column 2: presentation title (centered). Column 3: studio name (right-aligned). Separated from the cover-type by a 1px hairline in yellow at 25% opacity.

**Image placeholder** — a flat rectangle filled with `{colors.near-black-alt}` (on dark) or `{colors.acid-yellow-alt}` with a hairline border (on yellow), containing centered IBM Plex Mono text at tier-3 opacity. Used for image slots that haven't been filled.

**Chart bar** — a flat vertical rectangle in muted text-on-surface color (default) or the surface accent (highlighted). No rounded ends, no gradient. The "hi" variant uses the full accent color and weight 900 on its numerical label.

**Chart baseline** — a 2px solid line in muted surface accent (yellow tier-3 on dark, border-light on yellow) running the full width of the chart wrapper, below the bar tops.

**Em-dash bullet** — `—` prefix on every list item in the surface accent color, with 0.5em right margin. Color flips with the surface.

## Do's and Don'ts

### Do

- Use Barlow at weight 900 uppercase for every headline at every scale, with negative letter-spacing of at least -0.01em. The type-as-graphic-mass effect is the system's identity.
- Alternate `{colors.near-black}` and `{colors.acid-yellow}` surfaces freely. Both are first-class; the rhythm of dark/yellow alternation is the system's pacing.
- Color every headline in the surface accent — yellow on dark, near-black on yellow. Never a muted version, never a third color.
- Use IBM Plex Mono only for metadata (chrome labels, slide counters, chapter numbers, cover-meta lockup, stat notes, mono captions). Mono is the spec-sheet voice; never use it for content.
- Render the cover-meta footer as a three-column mono lockup (left/center/right). This is the system's signature pattern.
- Mute secondary text with opacity (.58 on yellow, .62 on near-black), not with a separate grey color. The system has no greys — only opacity variants of yellow and near-black.
- Apply 2px rules to stat-card tops, chart baselines, and compare-panel dividers. The 2px weight differentiates "anchor" elements from chrome hairlines.
- Use em-dashes in the surface accent color as bullet markers — never dots, never circles.
- Pad slides tight (5vw / 5vh) so display type runs near the edge. Studio depends on type filling the canvas; generous padding breaks the scale effect.
- Leave statement and chapter slides deliberately sparse. One massive headline against empty surface is the correct register for those slide types.

### Don't

- Don't lowercase a headline. Every Barlow 900 element runs uppercase, no exceptions.
- Don't use weight 800 or 700 at display scale. Display = 900 weight, always.
- Don't add a third color to the palette. The system is binary plus opacity variants — adding red, blue, or any accent breaks the binary logic.
- Don't round any corner. Strict rectangles everywhere; only the nav dots are circles.
- Don't add drop shadows or gradients. The system is severely flat — depth comes from contrast and weight, not elevation.
- Don't use Barlow for chrome metadata. Mono is the metadata voice; chrome in Barlow reads as content rather than spec.
- Don't use Mono for headlines or body. Mono lives in the metadata role only.
- Don't add italic, underline, or color variants for emphasis. The only emphasis mechanism is weight contrast (900 vs 400).
- Don't introduce dashed borders. Every line in the system is solid.
- Don't fill more than ~60% of a typical slide with content. The empty surface is structural — Studio reads as broken when crowded.

## Responsive Behavior

Studio targets a 1920×1080 viewport and uses viewport-relative units (`vw`, `vh`) throughout, so layout scales fluidly between 1280×720 and 2560×1440 without breakpoints. There are no fixed pixel measurements except deck-chrome dots and the slide counter.

### Scaling Behavior

- Display headline scales: 12vw → ~230px at 1920px viewport, ~154px at 1280px.
- Body text scales: 1.15vw → ~22px at 1920px, ~15px at 1280px.
- Padding scales: pad-x 5vw → ~96px at 1920px, ~64px at 1280px.

The 2px and 1px border weights are fixed pixel sizes that do not scale; at large viewports, borders read proportionally finer.

### Presenter Behavior

The deck is JS-driven, with slides arranged side-by-side in a horizontal strip that translates left/right on navigation. The current slide carries `is-active`, which triggers any `[data-anim]` elements to animate in. Animations are sharper and shorter than Signal (0.5s duration vs 0.65s; 0.75s slide vs 0.85s) — "agency urgency, not editorial grace," per the source comment. Animation keyframes include fade-up, fade-in, reveal-right, reveal-left, scale-in with staggered `data-delay` (0–6).

Nav dots and a slide counter sit fixed at the bottom of the viewport — small white-on-dark UI that is intentionally subtle.

### Print Behavior

There is no embedded print stylesheet. The horizontal-strip layout would need to be unwound for static export.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin face (default) | Chinese face | Weight | Notes |
|---|---|---|---|---|
| Display / h1 / h2 / quote-text / stat-value | Barlow 900 uppercase | 思源宋体 / Noto Serif SC | 700 | Studio's defining "type-as-graphic-mass" effect depends on a single typeface at maximum weight. NSC 700 is the heaviest Song-style serif on CDN that holds visual mass at 12vw / 7.5vw / 4.8vw display sizes. |
| h3 | Barlow 700 uppercase | 思源宋体 / Noto Serif SC | 700 | Sub-headline weight matches. |
| Lead / Body / Caption | Barlow 500 / 400 | 思源宋体 / Noto Serif SC | 400 | Minimal editorial body — NSC 400 reads cleanly in the system's sparse layouts. |
| Metadata / chrome / label / stat-note | IBM Plex Mono 500 | IBM Plex Mono + Noto Sans Mono CJK fallback | 400–500 | Mono CJK is rarely needed (most metadata stays in Latin: dates, counters, studio names) but if Chinese appears in chrome, use Noto Sans Mono CJK SC. |

### Mixed-Content Strategy

This template uses **Strategy A**: replace the Latin face entirely with the CJK face for any element rendering Chinese characters. Studio's identity is type-as-graphic-mass — and Barlow 900 cannot render CJK glyphs (no glyph coverage). Mixing Barlow Latin with NSC CJK in the same line via stack fallback creates a metric mismatch at display scale that breaks the "single typeface, single weight" register. Replace the entire `font-family` with NSC for any Chinese-content element.

```css
font-family: 'Noto Serif SC', 'Barlow', sans-serif;  /* display / headlines — CJK first */
font-family: 'Noto Serif SC', 'Barlow', sans-serif;  /* body — CJK first */
font-family: 'IBM Plex Mono', 'Noto Sans Mono CJK SC', monospace;  /* mono — Latin first, CJK only if needed */
```

For pure-Chinese decks, the system's "uppercase" identity drops away (Chinese has no case), so Studio's character shifts from "industrial agency manifesto" toward "editorial Chinese newspaper headline." This is a real register change — Chinese Studio reads as serious and severe, but no longer reads as Pentagram/Anti. Accept this trade-off or scope Chinese to specific slides while keeping the cover and section dividers in Latin Barlow.

### Loading

Add to `<head>` (Google Fonts hosts Noto Serif SC and Noto Sans SC):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+SC:wght@400;500;700;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

The Barlow stack in the original design.md already wires Noto Sans SC as the CJK fallback. We're upgrading to Noto Serif SC for headlines and body because the Song-style serif at 900 weight carries graphic mass equivalent to Barlow 900, where Noto Sans SC at the same weight reads as too smooth/round and loses the "graphic block" character. Keep Noto Sans SC available for body-only decks where the cleaner sans is preferred.

### Universal CJK Adjustments

Apply on any element rendering Chinese content (typically scope via `:lang(zh)` or `<span lang="zh">`):

- **Line-height**: body 1.75–1.85 (Studio's 1.5–1.6 Barlow-default is fine for Latin but tight for CJK strokes); display 1.15–1.25 (looser than Latin 0.9–0.95 because CJK glyphs at 12vw need vertical breathing).
- **Letter-spacing**: 0 on CJK. Studio's negative tracking (-0.01 to -0.03em) on display Latin is wrong for Chinese — CJK glyphs are pre-spaced; negative tracking causes glyphs to touch or overlap at display scale.
- **Text-transform**: no uppercase on CJK. Studio's `text-transform: uppercase` on display tokens is a no-op on Han characters, but ensure no parent rule attempts unexpected behavior. The "uppercase" identity of the system drops away in Chinese.
- **Full-width punctuation**: use `，。：；！？` (full-width) not `,.:;!?` (half-width). The full-width forms include their own surrounding whitespace and align to the CJK em-box.
- **No period on display headlines**: Chinese headlines drop the terminal `。` — Studio headlines never carry periods in Latin and the rule extends to CJK.
- **Pangu spacing (盘古之白)**: insert a thin space between CJK and adjacent Latin/numerals. Write `使用 Claude` not `使用Claude`; `2024 年` not `2024年`. Studio's mono metadata frequently sits beside Chinese labels — pangu spacing is essential there.
- **One font per sentence**: don't mix NSC and Noto Sans SC inside a single line. The serif/sans switch should happen at element boundaries.

### Aesthetic Notes for This System

Studio's binary palette (acid yellow on near-black, near-black on acid yellow) is perfectly preserved in CJK — no color decisions change. NSC 700 in `{colors.acid-yellow}` against the `{colors.near-black}` field at 12vw display size carries the same visual punch as Barlow 900 in the same role; the saturated yellow against the warm dark surface makes Chinese characters read with the same poster-like authority.

The "type-as-graphic-mass" effect is genuinely altered in CJK, but in an interesting way: where Barlow 900 uppercase blocks read as Western signage / industrial manifesto, NSC 700 at display scale reads as **Chinese woodblock or letterpress poster** — equally severe, equally graphic, but in a different cultural register. For Chinese-language audiences this reads as authoritative and well-designed; for mixed audiences it shifts the perceived tone slightly toward "editorial publication" and away from "design agency."

The em-dash bullet markers translate directly — keep `—` in the surface accent color. The three-column mono cover-meta lockup also translates without modification — write the studio × client / presentation title / studio name in either Chinese or Latin and the IBM Plex Mono renders both cleanly (with CJK falling back to Noto Sans Mono CJK SC if Chinese appears in the lockup).

Stat cards work well in CJK — the 5.5vw italic-style stat numeral can render in NSC 700 if the value is a Chinese numeral (`三百万`) or stay in Barlow if Arabic (`3M`). The 2px top rule and the stat-note (mono) are unaffected.

### Known CJK Gap

- The "uppercase + negative tracking + weight 900" formula that defines the system cannot be reproduced in CJK. Chinese gets weight 700 (the heaviest NSC weight), no case transformation, and zero tracking. The system loses ~30% of its Latin character in pure-Chinese mode.
- IBM Plex Mono is Latin-only at its full feature set. If Chinese characters appear in metadata (rare in Studio decks), they fall back to Noto Sans Mono CJK SC or system monospace, which may have visually different proportions than the Plex Mono around them.
- NSC 900 weight (which would better match Barlow 900) exists on Google Fonts but is heavy enough at large sizes that counter shapes start to close — at 12vw display, NSC 900 may render some characters as near-solid blocks. NSC 700 is the recommended ceiling; for extreme display moments, test NSC 900 case-by-case.
- The system's "alternate dark/yellow surfaces" rhythm is unaffected by CJK, but Chinese readers may parse the rhythm differently than Western readers (cultural reading conventions for color affect pacing perception).

## Iteration Guide

1. Any new headline uses Barlow weight 900 uppercase with negative letter-spacing. Without all three (weight, case, tracking), the type loses its graphic-mass character.
2. Any new slide alternates surface from the previous — generally don't run more than 2–3 dark slides in a row before a yellow break, or vice versa. Rhythm is part of the design.
3. Any new chrome, metadata, label, or counter uses IBM Plex Mono. Mono in any other role breaks the metadata separation.
4. Any new color introduces a third option to the binary palette — don't. Stick to yellow and near-black, with opacity variants for muting.
5. Any new bullet list uses em-dash markers in the surface accent. Dot bullets break the system.
6. Stat cards use the 2px top rule plus a 5.5vw weight 900 numeral. Smaller stats, sentence-case stats, or rounded stat tiles break the pattern.
7. Cover slides use the three-column mono lockup at the bottom. Don't omit it; it is the system's most identifiable pattern.
8. Chapter, statement, quote, and end slides are chromeless. Standard slides carry chrome and foot. Don't blend the two — a chromeless quote is correct; a chromed quote reads as a different system.
9. New layouts should aim for one dominant element (the headline) plus minimal supporting elements. Multi-element layouts (more than 4–5 distinct regions) crowd the design.
10. The 2px rule weight is reserved for anchors (stat-tops, baselines, compare dividers). Chrome and structural separators stay at 1px.

## Known Gaps

- The two font families (Barlow, IBM Plex Mono) load from Google Fonts. If fonts fail, fallbacks are Noto Sans SC / system-ui (for Barlow) and monospace (for IBM Plex Mono); the system degrades significantly without Barlow 900, since the type-as-graphic-mass effect depends on the specific letterforms.
- Chinese fallback (Noto Sans SC) is wired into the Barlow stack but ships with weights 400, 500, 700, 900 only — using h3 (700) and lead (500) in Chinese content renders cleanly; intermediate weights would fall back to closest available.
- The `--c-bg-alt`, `--c-bg-light-alt`, and several muted color tokens are defined but used sparingly — they exist as a reserve for adjacent-surface differentiation.
- The slide navigation JS is embedded inline; the system depends on it for the slide deck transform behavior and the `is-active` class management.
- The cover image placeholder uses a hardcoded `IMAGE PLACEHOLDER` label and a flat near-black-alt fill; real image insertion requires replacing the placeholder div with a background-image-styled element matching the parent canvas.
- The 5vw / 5vh padding is intentionally tight, which means at very small viewports headlines may approach the edge uncomfortably; the system is tuned for 16:9 displays at 1280px and above.
- The compare panel uses a 2px right border on the left panel only (no left border on the right), creating an asymmetry between the two panels — this is intentional but worth noting if extending the compare layout to 3-up.
