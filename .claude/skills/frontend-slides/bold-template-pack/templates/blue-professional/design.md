---
version: alpha
name: Blue Professional
description: A restrained, consulting-grade presentation system on a warm cream canvas (#fdfae7) with a single saturated cobalt blue (#1e2bfa) as the only accent color. Display type runs Space Grotesk for headlines and numerical callouts; Inter handles body and chrome. Cards are soft-tinted cobalt at 4% opacity with 1.5px translucent borders and 10-14px rounded corners — quiet, never bordered in solid color. The aesthetic borrows from investment-research reports, McKinsey-grade quarterly briefings, and contemporary financial dashboards — measured, data-dense without feeling crowded, and unmistakably professional. The system is built for executive readability at distance, with strong typographic hierarchy and a single accent color carrying every emphasis moment.

colors:
  bg: "#fdfae7"
  primary: "#1e2bfa"
  text: "#111111"
  text-muted: "#6b6b6b"
  text-light: "#9a9a9a"
  accent-light: "rgba(30, 43, 250, 0.08)"
  accent-medium: "rgba(30, 43, 250, 0.15)"
  border: "rgba(30, 43, 250, 0.2)"
  card-bg: "rgba(30, 43, 250, 0.04)"
  positive: "#059669"
  negative: "#dc2626"

typography:
  h1:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "clamp(44.8px, 5vw, 67.2px)"
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(28.8px, 3vw, 41.6px)"
    lineHeight: 1.1
    letterSpacing: -0.02em
  h3:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: "clamp(17.6px, 1.8vw, 24px)"
    lineHeight: 1.3
    letterSpacing: -0.02em
  h4-eyebrow:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(13.6px, 1.2vw, 16px)"
    lineHeight: 1.1
    letterSpacing: 0.08em
    textTransform: uppercase
    color: "{colors.primary}"
  body:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: "clamp(13.6px, 1.1vw, 16.8px)"
    lineHeight: 1.6
    color: "{colors.text-muted}"
  metric-value:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "clamp(35.2px, 3.4vw, 48px)"
    lineHeight: 1
    color: "{colors.primary}"
  metric-label:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 600
    fontSize: "clamp(15.2px, 1.3vw, 17.6px)"
    lineHeight: 1.3
    color: "{colors.text}"
  metric-desc:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: "clamp(12.5px, 0.95vw, 14.4px)"
    lineHeight: 1.5
    color: "{colors.text-muted}"
  metric-support:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: "clamp(12px, 0.9vw, 13.6px)"
    lineHeight: 1.45
    color: "{colors.text-muted}"
  stat-num:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "clamp(25.6px, 2.4vw, 33.6px)"
    lineHeight: 1
    color: "{colors.primary}"
  stat-name:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: "clamp(13.6px, 1vw, 15.2px)"
    lineHeight: 1.35
    color: "{colors.text}"
  stat-context:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: 12px
    lineHeight: 1.4
    color: "{colors.text-light}"
  agenda-num:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: 28.8px
    lineHeight: 1
    color: "{colors.primary}"
  insight-num:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 12.5px
    lineHeight: 1.7
    letterSpacing: 0.05em
    color: "{colors.primary}"
  split-highlight:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: "clamp(18.4px, 1.55vw, 24px)"
    lineHeight: 1.4
    color: "{colors.text}"
  blockquote:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: "clamp(25.6px, 2.8vw, 38.4px)"
    lineHeight: 1.35
    color: "{colors.text}"
  quote-mark:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "128px"
    lineHeight: 0.5
    color: "{colors.primary}"
    opacity: 0.15
  step-circle-text:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: 20.8px
    lineHeight: 1
  step-title:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(15.2px, 1.4vw, 18.4px)"
    lineHeight: 1.2
  bar-label:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: "clamp(12.8px, 1.1vw, 16px)"
    lineHeight: 1.3
    color: "{colors.text}"
  bar-pct:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 15.2px
    color: "{colors.primary}"
  tag:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12px
    lineHeight: 1
    color: "{colors.primary}"
  counter:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12.8px
    lineHeight: 1
    letterSpacing: 0.05em
    color: "{colors.text-muted}"
  meta:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 400
    fontSize: 12.8px
    lineHeight: 1.4
    letterSpacing: 0.05em
    color: "{colors.text-light}"
  cite:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12.5px
    lineHeight: 1.4
    letterSpacing: 0.04em
    textTransform: uppercase
    color: "{colors.text-muted}"

spacing:
  pad-slide-x: "4vw"
  pad-slide-y-top: "3.5vw"
  pad-slide-y-bottom: "8.5vh"
  pad-card-lg: "1.5rem 1.6rem"
  pad-card-md: "1.4rem 1.5rem"
  pad-card-sm: "1rem 1.2rem"
  pad-mini: "0.9rem 1rem"
  gap-grid-lg: "3.5rem"
  gap-grid-md: "2rem 3rem"
  gap-grid-sm: "1.5rem"
  gap-cards: "1.2rem"
  gap-mini: "1rem"
  header-margin: "2.5vh"
  accent-line-width: "60px"
  accent-line-height: "4px"

canvas:
  width: 100vw
  height: 100vh
  background: "{colors.bg}"

radii:
  pill: "100px"
  card-lg: "14px"
  card-md: "12px"
  card-sm: "10px"
  bar: "6px"
  circle: "50%"

components:
  card-tinted:
    background: "{colors.card-bg}"
    border: "1.5px solid {colors.border}"
    borderRadius: 14px
    padding: "1.5rem 1.6rem"
    description: "Primary content card. Cobalt tinted at 4% with a 20% cobalt 1.5px border. Soft 14px radius. Never solid-colored, never outlined in full primary."
  card-tinted-sm:
    background: "{colors.card-bg}"
    border: "1px solid {colors.border}"
    borderRadius: 12px
    padding: "1.4rem 1.5rem"
    description: "Compact tinted card with 1px border. Used for stat cells and small data blocks."
  card-tinted-xs:
    background: "{colors.card-bg}"
    border: "1px solid {colors.border}"
    borderRadius: 10px
    padding: "0.9rem 1rem"
    description: "Mini tinted card used for inline mini-stats."
  detail-block:
    background: "{colors.card-bg}"
    border: "1px solid {colors.border}"
    borderRadius: 10px
    padding: "1rem 1.2rem"
    description: "Detail block holding a small h3 + a bulleted ul. Used in detail-analysis grids."
  tag-pill:
    background: "{colors.accent-light}"
    color: "{colors.primary}"
    padding: "0.35rem 0.9rem"
    borderRadius: 100px
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12px
    description: "Pill-shaped tag sitting in the top-right of the slide-header. Fully rounded, soft cobalt tint background, cobalt text."
  cta-button:
    background: "{colors.primary}"
    color: "{colors.bg}"
    padding: "0.9rem 2.2rem"
    borderRadius: 100px
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 15.2px
    description: "Primary CTA. Fully rounded solid cobalt pill with cream text. Hover lifts -2 with a soft cobalt drop shadow."
  nav-btn:
    width: 44px
    height: 44px
    borderRadius: 50%
    border: "1.5px solid {colors.border}"
    background: "{colors.bg}"
    color: "{colors.primary}"
    description: "Circular nav-arrow button. Hover inverts: cobalt fill, cream icon. Disabled state at 30% opacity."
  accent-line:
    width: 60px
    height: 4px
    background: "{colors.primary}"
    borderRadius: 2px
    description: "Short horizontal cobalt rule, 60×4px, slightly rounded. Used above cover titles and as eyebrow separators."
  accent-dot:
    width: 8px
    height: 8px
    background: "{colors.primary}"
    borderRadius: 50%
    description: "Small inline cobalt dot. Decorative inline marker."
  bar-track:
    height: 28px
    background: "{colors.accent-light}"
    borderRadius: 6px
    description: "Horizontal bar chart track. Soft cobalt tint with 6px rounded corners."
  bar-fill:
    height: "100%"
    background: "{colors.primary}"
    borderRadius: 6px
    description: "Solid cobalt fill inside bar-track. Width carries the data value. Animates from 0 to value on slide entry."
  step-circle:
    width: 56px
    height: 56px
    borderRadius: 50%
    background: "{colors.primary}"
    color: "{colors.bg}"
    description: "Circular numbered step marker in cobalt with cream numeral. Sequential steps reduce opacity (1.0 → 0.85 → 0.7 → 0.55) to suggest fade-into-future."
  metric-change-positive:
    color: "{colors.positive}"
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 12.5px
    description: "Inline positive-change chip with up-arrow glyph and percentage. Green text inline; no border or fill."
  metric-change-negative:
    color: "{colors.negative}"
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 12.5px
    description: "Inline negative-change chip with up/down-arrow glyph and percentage. Red text inline; no border or fill."
  insight-list-item:
    paddingLeft: "2.6rem"
    description: "Numbered insight list with a Space Grotesk 600 counter (decimal-leading-zero) at position absolute left. Numbers in cobalt, body in default text color."
  split-highlight-block:
    background: "{colors.accent-light}"
    borderLeft: "4px solid {colors.primary}"
    borderRadius: 12px
    padding: "1.3rem 1.5rem"
    description: "Highlighted callout block with cobalt left rule and tinted cobalt fill. Used for inline pull-quotes inside split-column layouts."
  progress-bar:
    position: "fixed bottom 0 left 0"
    height: 3px
    background: "{colors.primary}"
    description: "Thin cobalt progress bar at the bottom edge of the viewport, width grows linearly with slide index."
  cover-decoration:
    background: "{colors.accent-light}"
    clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0% 100%)"
    description: "Diagonal accent panel filling the right ~35% of cover surfaces. Soft cobalt tint, clip-path angled cut on the left edge."
  cover-dots:
    layout: "3x3 grid of 6px cobalt dots at 12px gap, 25% opacity"
    description: "Small dotted decoration used on cover and other open-space surfaces."
  closing-circles:
    border: "1px solid {colors.border}"
    borderRadius: "50%"
    description: "Two concentric centered circles (500px outer, 360px inner) as atmospheric decoration on closing-class surfaces. Opacity 0.3-0.4."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Blue Professional is a **consulting-grade presentation system** designed for executive briefings, research deliverables, and quarterly reviews. Its foundational visual premise is **restraint with one strong commitment**: a warm cream canvas (`{colors.bg}` — `#fdfae7`) and a single saturated cobalt (`{colors.primary}` — `#1e2bfa`) that carries every accent, every metric, every CTA, every eyebrow, every chart fill. There is no secondary brand color, no palette of pastels, no warm/cool pairing — just cream, cobalt, and a tight ladder of muted grays for body text.

The type system uses two open Google Fonts in tightly defined roles. **Space Grotesk** (weights 300-700) is the display, headline, numerical, and chrome face — used for h1-h3 headings, all metric/stat numerals, eyebrow labels (in uppercase with 0.08em tracking), tag pills, CTAs, slide counters, agenda numbers, and step circles. Its slightly geometric character + soft humanist warmth makes it read as both modern (suitable for AI/tech audiences) and trustworthy (suitable for finance audiences). **Inter** (weights 300-600) is the body face — used for paragraph text, list bodies, metric descriptions, and table-style content. The Space Grotesk / Inter pairing is deliberately ordinary; what makes the system feel distinctive is the discipline of their usage, not the novelty of the faces.

The color philosophy is **one accent, three text grays**. Cobalt does all the emphasis work: headlines stay in `{colors.text}` (a near-black `#111111`), but every metric value, every eyebrow, every CTA, every chart bar, every callout border, every step circle, every progress indicator is cobalt. Body text uses a three-step gray ladder — `{colors.text}` for primary body, `{colors.text-muted}` (`#6b6b6b`) for paragraph body and metric descriptions, `{colors.text-light}` (`#9a9a9a`) for tertiary metadata. Only two non-cobalt accent colors exist: `{colors.positive}` (a subdued green `#059669`) and `{colors.negative}` (a subdued red `#dc2626`), used only on directional change indicators (arrows and percentages on metric cards) — and these are inline text colors, not fills.

Depth is **soft and tinted**, never offset or shadowed. Cards are 4% cobalt tints (`{colors.card-bg}`) with 1.5px translucent cobalt borders (`{colors.border}` — cobalt at 20% opacity) and 10-14px rounded corners. There are no drop shadows except a single subtle cobalt-tinted shadow on the CTA hover state (`0 8px 24px rgba(30, 43, 250, 0.25)`). The lack of harsh shadows is what gives the system its quiet, premium feel — every elevation is implied by border + tint, not by shadow.

**Density philosophy: balanced and data-dense without crowding.** This system is built to carry information — six-stat dashboards, six-detail-block grids, seven-bar rankings, multi-column splits with callouts and mini-stats. The system reads as authoritative when populated with substantive content and timid when sparse. A typical surface holds: a slide-header (h4 eyebrow + tag pill) + a section h2 headline + a grid or list of 3-6 information cells. Cards have moderate internal padding (1.5rem) and moderate inter-card gap (1.2-1.5rem) — neither tight nor airy. The system can support both quote/cover-class surfaces (one bold statement in space) and dashboard-class surfaces (six cards of dense data) without feeling like two different systems.

**Key Characteristics:**
- Warm cream ground (`{colors.bg}`) on every surface — never pure white, never gray.
- Single saturated cobalt (`{colors.primary}`) as the only accent — used for every eyebrow, metric, CTA, chart fill, and progress indicator.
- Space Grotesk (display + chrome) + Inter (body) — never substitute either.
- Cards are 4% cobalt tints with 1.5px cobalt-at-20% borders and 10-14px rounded corners.
- Soft pill-shaped chrome (`{components.tag-pill}`, `{components.cta-button}`) with full `100px` border-radius.
- Headlines use Space Grotesk weight 600-700 with -0.02em tracking on a near-black text color.
- Body uses Inter weight 400 at 13.6-16.8px with 1.6 line-height in the muted gray.
- Every slide carries a slide-header (eyebrow + tag pill), a single h2, and a flexible content region — the structure is rhythmic across the deck.
- Persistent chrome: cobalt progress bar at bottom edge, slide-counter at bottom-left, circular nav-arrows at bottom-right.
- Decorative atmospheric elements (concentric circles, dot grids, diagonal accent panels) appear only on cover and closing-class surfaces.

## Colors

### Palette

- **Bg** (`{colors.bg}` — `#fdfae7`): The warm cream canvas. The default and universal surface. Slightly green-cream-leaning warmth that distinguishes the system from corporate-template white. Every slide rests on this ground.
- **Primary** (`{colors.primary}` — `#1e2bfa`): The signature cobalt. A highly saturated electric blue that carries every emphasis moment. Used for h4 eyebrows, metric values, stat numerals, chart bar fills, CTA fills, step circles, progress bars, accent lines, agenda numbers, and the cite border on highlight blocks. No other accent color exists.
- **Text** (`{colors.text}` — `#111111`): The primary text color. Near-black, slightly warmer than `#000000`. Used for h1-h3 headlines, primary content text, metric labels, and any text that should carry full weight.
- **Text-muted** (`{colors.text-muted}` — `#6b6b6b`): Secondary text — body paragraphs, metric descriptions, captions. Reads as comfortably softer than the primary text without disappearing.
- **Text-light** (`{colors.text-light}` — `#9a9a9a`): Tertiary text — slide meta info, hairline dividers in text, stat context lines. The lightest readable gray; below this, text becomes ambient noise.
- **Accent-light** (`{colors.accent-light}` — `rgba(30, 43, 250, 0.08)`): The default cobalt tint for tag pills, bar tracks, highlight callouts, and cover-decoration panels.
- **Accent-medium** (`{colors.accent-medium}` — `rgba(30, 43, 250, 0.15)`): A slightly darker cobalt tint, available but used sparingly.
- **Border** (`{colors.border}` — `rgba(30, 43, 250, 0.2)`): Cobalt at 20% opacity. The universal soft border color for cards, nav buttons, decorative circles, and structural rules.
- **Card-bg** (`{colors.card-bg}` — `rgba(30, 43, 250, 0.04)`): Cobalt at 4% opacity. The universal card fill — softer than accent-light, reading as a barely-tinted surface that lifts slightly off the cream ground.
- **Positive** (`{colors.positive}` — `#059669`): Subdued green. Used only inline as the text color for positive-change indicators (up-arrow + percentage). Never used as a fill or border.
- **Negative** (`{colors.negative}` — `#dc2626`): Subdued red. Used only inline as the text color for negative-change indicators. Never used as a fill or border.

### Defaults

- **Default surface background**: `{colors.bg}` — every surface starts on cream.
- **Default headline color**: `{colors.text}` (`#111111`) — headlines are near-black, never cobalt. Cobalt is reserved for accent moments (eyebrows, metrics, CTAs).
- **Default body text color**: `{colors.text-muted}` (`#6b6b6b`) — body paragraphs default to muted, not full black.
- **Default eyebrow / h4 color**: `{colors.primary}` — eyebrows are always cobalt, always uppercase, always with 0.08em tracking.
- **Default card fill**: `{colors.card-bg}` (cobalt at 4%) — the universal soft tint.
- **Default card border**: `{colors.border}` (cobalt at 20%) at 1px or 1.5px. Never solid full-cobalt borders.
- **Default card border-radius**: 10-14px depending on card size (`{radii.card-sm}` for stat cells, `{radii.card-md}` for stat cards and detail blocks, `{radii.card-lg}` for metric cards).
- **Default accent for any numerical value (metric, stat, agenda number, bar percentage)**: `{colors.primary}`.
- **Default chart bar color**: `{colors.primary}` solid fill on a `{colors.accent-light}` track.
- **Default CTA**: `{components.cta-button}` — solid cobalt pill with cream text and 100px border-radius.
- **Default tag pill**: `{components.tag-pill}` — soft cobalt tint with cobalt text and 100px border-radius, paired with an h4 eyebrow in the slide-header.

The system has **no secondary accent color**. Don't reach for orange, teal, or purple to differentiate categories — the single-cobalt discipline is the system's identity. Categorical differentiation should be done through positioning, sizing, or labeling, not through additional hues.

## Typography

### Font Family Stack
The system runs two faces, each with a single role.

**Space Grotesk** (Google Fonts, weights 300-700) is the display + numerical + chrome face. Used for every h1, h2, h3, h4 heading; every numerical callout (metric values, stat numbers, agenda numbers, bar percentages, step circles); every chrome element (tag pills, CTAs, slide counters, hint text); and every uppercase eyebrow with 0.08em tracking. Its slightly geometric character + softly rounded humanist forms read as both contemporary and trustworthy — suitable for both AI/tech and finance audiences.

**Inter** (Google Fonts, weights 300-600) is the body face. Used for paragraph text, list bodies, metric descriptions, agenda descriptions, detail-block body, and any longer-form content. Set at weight 400 with line-height 1.6 in the muted gray, Inter reads as comfortable, generous, and editorial.

The face roles are non-overlapping: Space Grotesk handles every numeral and every heading; Inter handles every paragraph and list body. Don't cross the boundary — Inter h1 reads as a different brand; Space Grotesk body reads as a tech startup landing page.

### Typography Scale

| Token | Size (clamp / px) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.h1}` | 44.8–67.2px clamp | Space Grotesk | 700 | Cover or closing title |
| `{typography.h2}` | 28.8–41.6px clamp | Space Grotesk | 600 | Primary section headline on each slide |
| `{typography.h3}` | 17.6–24px clamp | Space Grotesk | 500 | Agenda item / region title |
| `{typography.h4-eyebrow}` | 13.6–16px clamp | Space Grotesk | 600 | Uppercase eyebrow in the slide-header (always cobalt) |
| `{typography.body}` | 13.6–16.8px clamp | Inter | 400 | Standard body paragraph |
| `{typography.metric-value}` | 35.2–48px clamp | Space Grotesk | 700 | Large metric numeral in a callout card |
| `{typography.metric-label}` | 15.2–17.6px clamp | Inter | 600 | Metric label line under the numeral |
| `{typography.metric-desc}` | 12.5–14.4px clamp | Inter | 400 | Metric supporting description paragraph |
| `{typography.metric-support}` | 12–13.6px clamp | Inter | 400 | Metric supporting bullet list |
| `{typography.stat-num}` | 25.6–33.6px clamp | Space Grotesk | 700 | Stat-cell numeral (smaller than metric-value) |
| `{typography.stat-name}` | 13.6–15.2px clamp | Inter | 500 | Stat-cell descriptive name line |
| `{typography.stat-context}` | 12px | Inter | 400 | Stat-cell tertiary context line below a hairline divider |
| `{typography.agenda-num}` | 28.8px | Space Grotesk | 700 | Agenda item numeral |
| `{typography.insight-num}` | 12.5px | Space Grotesk | 600 | Counter-style number prefix on insight list items |
| `{typography.split-highlight}` | 18.4–24px clamp | Space Grotesk | 500 | Inline pull-quote text inside a split-highlight block |
| `{typography.blockquote}` | 25.6–38.4px clamp | Space Grotesk | 500 | Quote-class headline body |
| `{typography.quote-mark}` | 128px | Space Grotesk | 700 | Decorative oversized quote glyph at 15% opacity above a blockquote |
| `{typography.step-circle-text}` | 20.8px | Space Grotesk | 700 | Numeral inside a circular step marker |
| `{typography.step-title}` | 15.2–18.4px clamp | Space Grotesk | 600 | Step title beneath a step circle |
| `{typography.bar-label}` | 12.8–16px clamp | Inter | 500 | Bar chart row label |
| `{typography.bar-pct}` | 15.2px | Space Grotesk | 600 | Bar chart row percentage value |
| `{typography.tag}` | 12px | Space Grotesk | 500 | Tag pill text in slide-header |
| `{typography.counter}` | 12.8px | Space Grotesk | 500 | Persistent slide counter |
| `{typography.meta}` | 12.8px | Space Grotesk | 400 | Cover meta line (e.g., date / confidential marker) |
| `{typography.cite}` | 12.5px | Space Grotesk | 500 | Cite/attribution under a pull-quote, uppercase with 0.04em tracking |

### Defaults

- **Default size for a cover title**: `{typography.h1}` (44.8–67.2px). Always Space Grotesk weight 700 with -0.02em tracking.
- **Default size for the primary section headline on each slide**: `{typography.h2}` (28.8–41.6px). Space Grotesk weight 600. The "section h2" is the system's structural workhorse — every content slide has one.
- **Default size for a region or agenda-item title**: `{typography.h3}` (17.6–24px).
- **Default size for the eyebrow above the h2**: `{typography.h4-eyebrow}` (13.6–16px) in cobalt, uppercase, 0.08em tracking.
- **Default size for paragraph body**: `{typography.body}` (13.6–16.8px clamp). Inter weight 400 with line-height 1.6.
- **Default size for a large metric numeral**: `{typography.metric-value}` (35.2–48px). For dashboard stat cells, step down to `{typography.stat-num}` (25.6–33.6px).
- **Default size for a quote body**: `{typography.blockquote}` (25.6–38.4px). Always Space Grotesk weight 500.
- **Default weight for Space Grotesk headings**: 500 (h3) → 600 (h2 and eyebrow) → 700 (h1 and numerical callouts). Don't reach for weight 400 or 800; the weight ladder is fixed.
- **Default weight for Inter body**: 400. Inter body at 500-600 reads as too assertive; at 300 reads as too thin.
- **Default tracking for h1-h3 headings**: -0.02em. Without negative tracking, Space Grotesk display reads as untreated.
- **Default tracking for the h4 eyebrow**: 0.08em uppercase. Without the wide tracking + uppercase combination, the eyebrow doesn't read as an eyebrow.

When unsure which heading token to reach for, default to `{typography.h2}` (28.8–41.6px) for the slide's primary text moment. `{typography.h3}` is for region or agenda-item titles; `{typography.h1}` is reserved for cover and closing.

### Signature Treatments

These treatments are **non-optional whenever the corresponding element type is used**:

- **Every h4 eyebrow is Space Grotesk weight 600 in `{colors.primary}` cobalt, uppercase, with 0.08em letter-spacing.** No exceptions. An eyebrow without uppercase + tracking + cobalt color is not the system's eyebrow — it's a stray sans element.
- **Every headline (h1, h2, h3) uses negative letter-spacing of -0.02em.** Default-tracked Space Grotesk display reads as untreated and breaks the editorial discipline.
- **Every headline uses `{colors.text}` (`#111111`), not cobalt.** Cobalt headlines are forbidden — cobalt is reserved for accent moments (eyebrows, metrics, CTAs, chart bars). Reversing this collapses the visual hierarchy.
- **Every numerical callout (metric value, stat number, agenda number, bar percentage, step circle) is Space Grotesk weight 600-700 in `{colors.primary}` cobalt.** Numerical values are the system's primary accent moment.
- **Every body paragraph is Inter weight 400 in `{colors.text-muted}` (`#6b6b6b`) with line-height 1.6.** Body in pure black reads as too heavy; body in text-light reads as too faint.
- **Every CTA is the `{components.cta-button}` pattern: solid cobalt pill with cream text, 100px border-radius, 0.9rem × 2.2rem padding.** CTAs in any other shape or color don't exist.
- **Every tag pill is the `{components.tag-pill}` pattern: soft cobalt tint with cobalt text, 100px border-radius, 0.35rem × 0.9rem padding.** Tag pills with solid backgrounds or borders break the system.
- **Every slide-header places the h4 eyebrow on the left and the tag pill on the right.** This is the structural rhythm of every content slide.

### Typography Principles

The voice contrast is **near-black display headlines ↔ cobalt eyebrows + numerals ↔ muted gray body**. Italic and underline are not used. The only emphasis mechanisms are: switching weight within the Space Grotesk ladder, switching color from text-muted to text or to cobalt, and uppercase + tracking on labels.

Numerical content is **always Space Grotesk**, even small numerical labels (bar percentages, slide counters, mini-stat values). The mono-flavored character of Space Grotesk at numerical sizes mimics tabular figures without requiring an actual monospace face.

## Layout

### Canvas System
The system targets `100vw × 100vh` per slide. Slides are absolutely positioned and animated in via opacity + translateX (40px → 0px) on 500ms ease. Only the `.active` slide is `opacity: 1`; the previous slide gets a `.prev` class and translates -40px out of view.

Default slide padding is asymmetric: `3.5vw` left, top, and right; `8.5vh` bottom. The extra bottom space reserves room for the fixed slide-counter (left) and nav-controls (right) which sit at `bottom: 2.5vh` overlapping the viewport bottom.

### Padding and Gap Scale

| Token | Value | Use |
|---|---|---|
| `{spacing.pad-slide-x}` | 4vw | Slide horizontal padding |
| `{spacing.pad-slide-y-top}` | 3.5vw | Slide top padding |
| `{spacing.pad-slide-y-bottom}` | 8.5vh | Slide bottom padding (extra to clear nav chrome) |
| `{spacing.pad-card-lg}` | 1.5rem 1.6rem | Large card internal padding (metric cards) |
| `{spacing.pad-card-md}` | 1.4rem 1.5rem | Medium card internal padding (stat cells) |
| `{spacing.pad-card-sm}` | 1rem 1.2rem | Small card internal padding (detail blocks) |
| `{spacing.pad-mini}` | 0.9rem 1rem | Mini card internal padding (mini-stat cells) |
| `{spacing.gap-grid-lg}` | 3.5rem | Large gap between split columns |
| `{spacing.gap-grid-md}` | 2rem 3rem | Medium gap in two-column grids (row × col) |
| `{spacing.gap-grid-sm}` | 1.5rem | Standard gap in 3-column metric grids |
| `{spacing.gap-cards}` | 1.2rem | Gap between dashboard stat cells |
| `{spacing.gap-mini}` | 1rem | Gap between mini-stats |
| `{spacing.header-margin}` | 2.5vh | Margin below the slide-header |

### Persistent Chrome
Three elements appear on every slide:
- **Slide counter** at bottom-left — Space Grotesk 12.8px weight 500 in text-muted gray, fixed at `bottom: 2.5vh; left: 3vw`.
- **Nav controls** at bottom-right — two circular 44px nav-buttons with 1.5px cobalt-at-20% borders, fixed at `bottom: 2.5vh; right: 3vw`. Disabled state at 30% opacity (first slide / last slide).
- **Progress bar** at bottom edge — 3px solid cobalt strip with width = `(currentSlide + 1) / total * 100%`. Animates on slide change.

A **keyboard hint** ("Use arrow keys to navigate") appears at bottom center in text-light gray.

### Slide-Header Structure
Every content slide carries a `.slide-header` band at the top: an h4 eyebrow on the left, a tag pill on the right. Below the slide-header sits the section h2, then the content region (a grid, list, chart, or split). Cover, quote, and closing slides skip the slide-header in favor of centered content.

### Content Grids
The system uses repeated grid patterns for content layout: 2×3 agenda grid, 3-column metric row, 3-column stats grid (becomes 2 rows on dashboards), 1.05fr/1fr split-body, 4-step timeline row, 2-column detail grid. These are content-density containers; the grid choice depends on content volume, not on a fixed layout vocabulary.

## Depth and Elevation

### Tinted Cards (Primary Depth Mechanism)
The system uses **soft cobalt-tinted backgrounds + soft cobalt-borders + rounded corners** to create the impression of elevation without using shadows. A card with `background: {colors.card-bg}` (cobalt at 4%) and `border: 1.5px solid {colors.border}` (cobalt at 20%) sits visually above the cream ground without any actual offset. This treatment is the system's depth language.

### No Drop Shadows on Cards
There are no `box-shadow` declarations on cards, stat cells, detail blocks, or any content container. The only shadow in the system is a single soft cobalt-tinted hover state on the CTA button: `0 8px 24px rgba(30, 43, 250, 0.25)`, which appears for 200ms on hover and disappears on mouse-out. This is the only colored, blurred shadow in the system.

### Border-Left Accent (Highlight Block)
The `{components.split-highlight-block}` uses a 4px solid cobalt left border to signal "this is a quoted callout, distinct from surrounding body". This is the system's structural accent mechanism — it's not a shadow, but it carries the same elevation cue (the colored rule pulls the block forward visually).

### Rounded Corners as Softness
The 10-14px border-radius on cards is part of the depth language. Without rounded corners, the cobalt-tinted cards would read as flat panels; the soft radius softens them into "lifted" surfaces.

### Atmospheric Decorations
Decorative elements (cover-decoration diagonal panel, concentric closing-circles, cover-dots grid, quote decoration circles) appear only on cover, quote, and closing-class surfaces. They are atmospheric, not structural — used to soften open-space surfaces without filling them with content.

## Shapes and Treatment

### Border Radius
- **`{radii.pill}` = 100px** — fully rounded. Used on `{components.tag-pill}`, `{components.cta-button}`, and any pill-shaped chrome.
- **`{radii.card-lg}` = 14px** — used on large metric cards.
- **`{radii.card-md}` = 12px** — used on standard stat cells, split-highlight blocks.
- **`{radii.card-sm}` = 10px** — used on detail blocks and mini-stats.
- **`{radii.bar}` = 6px** — used on bar tracks and bar fills.
- **`{radii.circle}` = 50%** — used on step circles, nav-button circles, accent dots, closing decoration circles, cover dots, quote decoration circles.

The radius ladder is graduated: tighter radii on smaller chrome, larger radii on bigger cards, fully rounded on pills, perfect circles on chrome. The system has **no square (0px) corners** anywhere except the progress bar.

### Border Weights
- **1px solid `{colors.border}`** — universal soft border. Used on stat cells, mini-stats, detail blocks, agenda items (bottom border only), stat-context dividers (top border only).
- **1.5px solid `{colors.border}`** — slightly heavier soft border. Used on metric cards, nav-buttons.
- **2px solid `{colors.border}`** — used on the split column divider (border-left on the right column of split layouts).
- **4px solid `{colors.primary}`** — used only as the left rule on `{components.split-highlight-block}` to signal a quoted callout.

The borders are **never opaque cobalt** — they are always at 20% opacity (`{colors.border}`). This is what gives the system its quiet, lifted quality.

### Decorative Element Types

**Tinted card** (`{components.card-tinted}`) — Cobalt-at-4% background with 1.5px cobalt-at-20% border, 14px radius. The primary content card.

**Tag pill** (`{components.tag-pill}`) — Fully rounded cobalt-at-8% pill with cobalt text. Sits in the top-right of the slide-header.

**Eyebrow** (`{typography.h4-eyebrow}`) — Uppercase cobalt label with 0.08em tracking. Sits in the top-left of the slide-header.

**CTA button** (`{components.cta-button}`) — Solid cobalt pill with cream text. The system's only solid-color element. Used once per closing surface.

**Accent line** (`{components.accent-line}`) — A short 60×4 horizontal cobalt rule with 2px radius. Used above cover titles and as eyebrow separators on open-space surfaces.

**Step circle** (`{components.step-circle}`) — A 56×56 solid cobalt circle with cream Space Grotesk numeral inside. Sequential timeline steps reduce opacity (1.0 → 0.85 → 0.7 → 0.55) to suggest fade-into-future.

**Bar track + fill** (`{components.bar-track}` + `{components.bar-fill}`) — 28px-tall track in cobalt-at-8% with a solid cobalt fill whose width carries the data. 6px rounded corners on both.

**Insight list item** (`{components.insight-list-item}`) — A counter-numbered list using CSS counter() to render decimal-leading-zero prefixes ("01", "02") in cobalt Space Grotesk 600 / 12.5px positioned absolute left.

**Split highlight block** (`{components.split-highlight-block}`) — A cobalt-at-8% tinted block with a 4px cobalt left rule and a cite line below. Used for inline pull-quotes inside split-column layouts.

**Cover decoration** (`{components.cover-decoration}`) — A clipped diagonal cobalt-tinted panel filling the right ~35% of cover surfaces. Reads as a printed accent without enclosing the layout.

**Cover dots** (`{components.cover-dots}`) — A 3×3 grid of 6px cobalt dots at 12px gap, 25% opacity. Decorative atmosphere on open-space surfaces.

**Closing circles** (`{components.closing-circles}`) — Two concentric centered circles (500px outer, 360px inner) with 1px cobalt-at-20% borders, opacity 0.3-0.4. Atmospheric decoration on closing-class surfaces.

**Metric change chip** (`{components.metric-change-positive}` / `{components.metric-change-negative}`) — Inline directional indicator: a small arrow glyph + percentage value in `{colors.positive}` or `{colors.negative}`. No fill, no border — pure inline text color.

## Do's and Don'ts

### Do

- Apply `{colors.bg}` (cream) as the universal canvas. Every surface starts on warm cream, never pure white.
- Use `{colors.primary}` cobalt as the only accent color across the entire deck — for eyebrows, metrics, CTAs, chart fills, step circles, and progress indicators.
- Set headlines (h1, h2, h3) in `{colors.text}` (`#111111`) near-black with -0.02em tracking. Cobalt headlines are forbidden; cobalt is for accent moments only.
- Set every h4 eyebrow in cobalt Space Grotesk weight 600 with uppercase + 0.08em tracking. The eyebrow is the universal section opener.
- Use `{components.card-tinted}` (cobalt-at-4% fill + cobalt-at-20% 1.5px border + 14px radius) as the universal content card pattern.
- Pair every slide-header with an h4 eyebrow on the left and a `{components.tag-pill}` on the right. The rhythm is the system's structural identity.
- Set body in Inter weight 400 at 13.6-16.8px in `{colors.text-muted}` (`#6b6b6b`) with line-height 1.6. The muted gray body is what makes the system feel premium.
- Render every numerical callout (metric, stat, bar percentage, agenda number) in Space Grotesk weight 600-700 in cobalt. The cobalt numerical accent is the system's data voice.
- Use full 100px border-radius on all chrome (tag pills, CTAs, nav-buttons). The pill shape is the system's chrome signature.
- Use directional change chips (`{components.metric-change-positive}` / `{components.metric-change-negative}`) inline with no fill — green for positive, red for negative, both subdued.

### Don't

- Don't introduce a second accent color. Cobalt is the only accent — orange, teal, purple, or any additional brand color breaks the single-accent discipline.
- Don't set headlines in cobalt. Headlines are near-black; cobalt is reserved for eyebrows, metrics, CTAs, and chart fills.
- Don't use drop shadows on cards or content. The system has zero box-shadows except a single soft cobalt CTA hover.
- Don't use square corners (0px radius) anywhere. The system is built around soft rounded corners — square corners immediately read as a different aesthetic.
- Don't use opaque cobalt borders on cards. Borders are always cobalt-at-20% (`{colors.border}`). Full-opacity borders break the quiet, lifted feel.
- Don't substitute fonts. Space Grotesk + Inter is the pairing. Substituting Arial, Helvetica, Roboto, or Open Sans collapses the typographic identity.
- Don't crowd the canvas with bordered hard-edged elements. The system depends on soft tints and gentle borders; adding heavy outlines makes it feel like a different system.
- Don't omit the slide-header (h4 eyebrow + tag pill) on a content slide. The header is the editorial rhythm.
- Don't use uppercase body text. Uppercase is reserved for h4 eyebrows and the cite line under highlight blocks.
- Don't use directional chips for non-directional emphasis. The green/red change chips are reserved for actual positive/negative comparisons (e.g., "+11 pts vs. prior quarter"). They are not general accent colors.

## Responsive Behavior

Blue Professional is designed as a **1920×1080 presentation system** (effective 100vw × 100vh). Sizing uses CSS `clamp()` for type and `vw / vh / rem` for spacing. The system has minimal responsive behavior — it's built for landscape presentation contexts.

### Scaling Behavior
- h1 scales 44.8px → 67.2px on viewport width.
- h2 scales 28.8px → 41.6px.
- Body scales 13.6px → 16.8px.
- Metric values scale 35.2px → 48px.
- Card padding (rem-based) scales with the user's font-size setting; default cards stay around 24-26px internal padding.
- Borders (1px, 1.5px, 2px), border-radii (10-14px), and pill radius (100px) are fixed and do not scale.

### Component Adjustments at Low Viewport Heights
A single `@media (max-height: 700px)` block tightens spacing on dense slides:
- Slide padding reduces from 3.5vw / 8.5vh to 2.5vh / 3vw.
- Agenda grid gap reduces.
- Metric and detail card padding reduces to 1rem.
- Bar item padding reduces.

This ensures the system fits on shorter laptop screens without breaking the structural layout.

### Presenter Behavior
- Slides advance via `ArrowRight`, `Space`, or `PageDown`.
- Slides reverse via `ArrowLeft` or `PageUp`.
- `Home` jumps to first, `End` to last.
- Horizontal touch swipe with a 50px threshold advances/reverses.
- Slide transitions are 500ms ease with opacity fade + 40px translateX slide-in/out.
- Nav-buttons disable at first/last slide (opacity 0.3).
- Progress bar at the bottom edge animates to the current slide percentage with a 400ms ease.

### Print Behavior
The system has no `@media print` rule. The slide transition is screen-only; printing produces only the active slide. For static export, screenshots of each slide preserve all atmospheric elements (cover decoration, dots, concentric circles are all CSS).

### Interactive States
- Nav-buttons invert on hover (cobalt fill, cream icon).
- Agenda items get a subtle `{colors.card-bg}` background on hover (200ms transition).
- CTA button lifts -2px on hover with a soft cobalt drop shadow (the only shadow in the system).
- Bar fills animate from 0 to data value with a 0.8s ease transition — most visible on slide entry.

## CJK & International Content

When using this template for Chinese (or other CJK) content, swap the Latin typeface stack for an equivalent Chinese pairing and apply universal CJK adjustments. All recommended Chinese fonts load via CDN — no install required.

### Recommended Chinese Pairing

| Role | Latin (default) | Chinese counterpart |
|---|---|---|
| h1 / h2 / h3 / h4-eyebrow / metric numerals / chart percentages | Space Grotesk 500–700 (negative tracking, uppercase on h4) | 思源黑体 Noto Sans SC 700 (0 tracking, no transform) |
| Body / metric description / list body | Inter 400 | 思源宋体 Noto Serif SC 400 |
| Mono / counter / tag pill / cite | Space Grotesk 500–600 (often uppercase) | 思源黑体 Noto Sans SC 500 (no transform) |

### Mixed-Content Strategy

**Strategy A** — single CJK family per role with Latin glyph coverage built in. Use 思源黑体 Noto Sans SC for every Space Grotesk role (display, eyebrow, numerical, chrome) and 思源宋体 Noto Serif SC for the Inter body role. Both faces ship Latin glyphs that read cleanly alongside Chinese characters. The serif body pairing reinforces the consulting-grade editorial register that this template is built for — investor reports and McKinsey-style briefings often pair sans display with serif body in Chinese.

### Loading

Add to the template's `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

- **Line-height**: increase by ~15–25% from the Latin spec. Body 1.75–1.85 (up from 1.6), display 1.2–1.3 (up from 1.1). CJK characters are visually full and crowd vertically more than Latin.
- **Letter-spacing**: set to 0 on every CJK run. The template's −0.02em negative tracking on h1–h3 overlaps CJK strokes; the +0.08em positive tracking on h4 eyebrows reads as gappy on square glyphs.
- **Text transform**: don't apply `uppercase` to Chinese text — CJK has no case. The h4-eyebrow and cite tokens use `text-transform: uppercase` in the Latin original; remove it for CJK runs.
- **Punctuation**: use full-width Chinese punctuation （，。：；！？「」（））.
- **No period on display headlines**: Chinese typography convention omits trailing 。 on display-scale headlines.
- **Space between CJK and Latin (盘古之白)**: insert an ASCII space between every Chinese character and adjacent Latin character or digit. Write `2024 Q3 业绩复盘` not `2024Q3业绩复盘`.
- **One font per sentence**: 思源黑体 / 思源宋体 cover both CJK and Latin glyphs — let one face handle each sentence. Don't let the browser fall back to Space Grotesk or Inter for ASCII characters mid-sentence.

### Aesthetic Notes for This System

The system's identity rests on **restraint with one strong commitment** — cream ground, cobalt accent, soft tinted cards, no shadows. None of that depends on Latin typography; it transfers cleanly to Chinese. The h4-eyebrow loses its "uppercase + 0.08em tracked + cobalt" character in CJK because both uppercase and wide tracking drop. Compensate by **always pairing the eyebrow with the cobalt accent-line component above the headline** — the 60×4 cobalt rule does the chrome-recognition work that the tracked-uppercase did in Latin. Keep the eyebrow's cobalt color and weight-600 contrast against the muted-gray body.

The cobalt color discipline (`#1e2bfa` as the only accent, full-opacity on numerals and CTAs, 20% opacity on borders, 4% opacity on card fills) is the system's actual identity and transfers entirely to a CJK build. Numerical callouts remain Latin Arabic digits in Chinese consulting decks by convention (业绩 $24.3M, 同比 +18%), so the cobalt Space Grotesk → 思源黑体 swap mostly affects labels and headlines, not the headline-grabbing numerical figures. Keep numerals in 思源黑体 weight 700 for the digit rendering.

### Known CJK Gap

- **No CDN Chinese face matches Space Grotesk's "trustworthy consulting" register exactly.** 思源黑体 reads as more institutional and slightly less contemporary than Space Grotesk. The template will feel slightly more "official report" and slightly less "AI startup" than its Latin original. This is generally desirable for executive-briefing contexts in Chinese.
- **The h4-eyebrow signal weakens.** The "uppercase Space Grotesk 600 in cobalt with 0.08em tracking" combination is the system's most recognizable small chrome and loses both the uppercase and tracking signals in CJK. Adding the `{components.accent-line}` above or below the eyebrow is the recommended compensation; without it, eyebrows can blend into body weight contrast.
- **Body in 思源宋体 changes the register.** Inter body reads as neutral-modern; 思源宋体 reads as editorial-serious. The system's "premium consulting" feel becomes slightly more "policy paper" — appropriate for state-owned enterprise or government audiences, slightly heavy for startup-pitch audiences. For startup contexts, swap body to 思源黑体 Noto Sans SC 400 instead.

## Iteration Guide

1. Any new slide starts on `{colors.bg}` cream ground. Don't switch the background per slide; the constant ground is the system's identity.
2. Any new content slide carries a slide-header at the top: h4 eyebrow (cobalt, uppercase, 0.08em) on the left + tag-pill on the right.
3. Any new headline uses Space Grotesk weight 600-700 in `{colors.text}` near-black with -0.02em tracking. Reach for h2 (28.8-41.6px) for primary moments.
4. Any new card uses the tinted pattern: `{colors.card-bg}` (cobalt at 4%) + 1-1.5px `{colors.border}` (cobalt at 20%) + 10-14px radius. Never use solid color fills or opaque borders.
5. Any new numerical callout (metric value, stat number, agenda number, bar percentage, step circle) is Space Grotesk weight 600-700 in `{colors.primary}` cobalt. Numbers are the accent moment.
6. Any new accent line, divider, or directional rule uses cobalt — solid for the primary rule, soft-cobalt (20% opacity) for borders.
7. Any new CTA uses the `{components.cta-button}` pattern: solid cobalt pill with cream text, 100px radius, no other CTA shape exists.
8. Any new chart bar uses `{components.bar-fill}` (solid cobalt) on `{components.bar-track}` (cobalt at 8%) with 6px radius.
9. Any new step or sequential indicator uses the `{components.step-circle}` with diminishing opacity for future steps (1.0 → 0.85 → 0.7 → 0.55).
10. If a surface feels too sparse, add information (more stats, more detail blocks) — don't add a second accent color or a heavier border to fill space. The system reads as elegant when populated with substance, not noise.

## Known Gaps

- **Space Grotesk and Inter are loaded from Google Fonts** via a preconnect + `<link>`. There are no system fallbacks beyond `sans-serif` — in environments where Google Fonts fail, the system collapses to system defaults and loses its character.
- **The directional change colors (`{colors.positive}` and `{colors.negative}`) are inline-only.** There is no token-level support for status fills, success/error badges, or alerts beyond these two inline text colors.
- **The single-accent discipline limits categorical color encoding.** Multi-series charts must distinguish through positioning or labeling — there is no design-system answer for "show 4 categorical series in different colors". This is intentional but limits chart expressiveness.
- **The agenda-item hover state changes background to `{colors.card-bg}`** — interactive on hover. This may not work as expected in static screen-share contexts.
- **Bar fills animate from 0 to value on entry** but only the active slide's bars are visible. Re-entering a slide replays the animation; the system does not preserve animation state.
- **The progress bar reads as decorative on slide 1** (it's at ~10% on a 10-slide deck) and not very informative until later in the deck. Combine with the slide-counter for explicit position cues.
- **The slide transition uses translateX (40px in/out)** with opacity fade. On very wide displays the 40px shift is barely perceptible; on small displays it may feel jarring.
- **The system loads Inter weights 300-600** but uses only weight 400 in practice. Lighter or heavier Inter weights are not part of the visual vocabulary; loading them is technically wasteful.
- **The metric-change indicator uses HTML entities (`&uarr;`, `&darr;`)** for arrow glyphs. These render correctly in most browsers but may render as small/inconsistent glyphs depending on the system font; replacing with SVG or Unicode characters would standardize rendering.
- **The closing-decoration concentric circles are absolutely positioned with fixed 500px / 360px sizes.** On very small viewports they may exceed the viewport bounds; on very large viewports they may feel undersized.
- **The cover-decoration uses clip-path** which is widely supported but not universal. Browsers without clip-path support will render the panel as a full right column rectangle.
