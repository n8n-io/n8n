---
version: alpha
name: Sakura Chroma
description: "A cassette-package editorial system on warm cream paper with a six-color primary palette and warm-brown ink. Display type runs in Big Shoulders Display (condensed industrial display sans at weight 900); body in Albert Sans; tabular and tag content in JetBrains Mono; occasional Japanese accents in Noto Sans JP. The aesthetic borrows from 1970s consumer cassette packaging, Japanese print catalogues, and lo-fi product zines: petal-cluster blob clusters, diagonal multi-color ribbon bands, 12-point starburst seals, red rectangular stamps, and tracked uppercase micro-labels. The effect is hand-curated industrial editorial — warm but disciplined, playful but tightly typeset, with the cassette as its visual metaphor."

colors:
  paper: "#F1E6CB"
  paper-dk: "#E5D6B0"
  ink: "#3A2516"
  red: "#E5392A"
  pink: "#E54489"
  orange: "#F09131"
  green: "#3D9F47"
  blue: "#3F8BC4"
  yellow: "#F0BC2A"

color-aliases:
  line: ink

typography:
  disp-hero:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(120px, min(14vw, 22vh), 280px)"
    fontWeight: 900
    lineHeight: 0.84
    letterSpacing: -0.025em
  disp-statement:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(70px, min(8.4vw, 14vh), 168px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.022em
  disp-title:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(80px, min(9vw, 14vh), 180px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.022em
  disp-lockup:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(56px, min(7vw, 11vh), 130px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.015em
  disp-section:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(52px, min(5.6vw, 9vh), 100px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.018em
  disp-quote:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(48px, min(5.4vw, 9vh), 110px)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.018em
  disp-quote-lg:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(56px, min(6.4vw, 10.5vh), 130px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.018em
  disp-brand:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(32px, min(3.4vw, 5.4vh), 56px)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.02em
  disp-card-name:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(28px, min(2.6vw, 4.6vh), 48px)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: -0.012em
  num-hero:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(110px, min(11vw, 18vh), 240px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.025em
  num-md:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(70px, min(7vw, 11vh), 150px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.02em
  ttl-row:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(22px, 1.7vw, 30px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.005em
  body:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(14px, 1vw, 17px)"
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(14px, 0.95vw, 15px)"
    fontWeight: 400
    lineHeight: 1.4
  body-emphasis:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(15px, 1.1vw, 20px)"
    fontWeight: 600
    lineHeight: 1.4
  micro:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(12px, 0.9vw, 14px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.16em
    textTransform: uppercase
  micro-lg:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(12px, 0.9vw, 14px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.2em
    textTransform: uppercase
  micro-xl:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(12px, 0.92vw, 14px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.32em
    textTransform: uppercase
  micro-spec:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(14px, 1.1vw, 20px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.04em
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(11px, 0.78vw, 12px)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.02em
  mono-md:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(14px, 0.95vw, 16px)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.02em
  mono-tag:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(12px, 0.85vw, 14px)"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.04em
  jp:
    fontFamily: "'Noto Sans JP', sans-serif"
    fontSize: "inherit"
    fontWeight: 500
    lineHeight: inherit
  stamp-text:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(20px, 1.6vw, 28px)"
    fontWeight: 900
    lineHeight: 1.0
    letterSpacing: 0.02em
  seal-text:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(22px, 2vw, 38px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.01em

spacing:
  frame-inset: "clamp(36px, 3.6vw, 72px)"
  frame-inset-bottom: "clamp(72px, 7vh, 110px)"
  topbar-gap: "clamp(12px, 1.4vh, 22px)"
  card-pad-x: "clamp(14px, 1.4vw, 20px)"
  card-pad-y: "clamp(16px, 1.7vw, 24px)"
  grid-gap: "clamp(16px, 1.6vw, 26px)"
  col-gap: "clamp(28px, 3vw, 56px)"
  pagenum-inset: "clamp(20px, 2.2vh, 36px) clamp(24px, 2.2vw, 44px)"

canvas:
  width: 100vw
  height: 100vh

components:
  paper-texture:
    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(58,37,22,0.55) 1px, transparent 1.6px)"
    backgroundSize: "4px 4px"
    opacity: 0.16
    zIndex: 1
    description: "Subtle 4px-period halftone-dot paper texture sitting over every slide stage at 16% opacity. Drawn as a 1px-period radial-gradient. Required — it is the paper-grain that anchors every flat color block in the print register."
  petals-cluster:
    description: "A decorative cluster of 4–5 overlapping perfect circles (each `aspect-ratio: 1/1, border-radius: 50%`) in the primary palette colors. Circles overlap and tile within a bounded container. Used as a brand mark, decorative anchor in slide corners, or quote-page ornament."
  ribbon-band:
    height: "clamp(40px, 6vh, 96px)"
    width: "160% (oversize so rotation clears the frame)"
    transform: "rotate(-22deg) or rotate(22deg)"
    description: "A bundle of 5 stacked solid-color horizontal bars (pink, orange, yellow, green, blue) rotated -22° or +22° to sweep diagonally across a region. Echoes the cassette-label color-stripe motif. Anchored to one edge of the slide and bleeds off the opposite edge."
  ribbon-single:
    height: "16–18%"
    width: "160%"
    transform: "rotate(±22deg)"
    description: "A single solid-color ribbon in a multi-color stack; each ribbon is positioned with its own top/bottom percentage so the stack reads as parallel rays."
  rosette-seal:
    width: "clamp(60px, 6vw, 110px)"
    aspectRatio: "1 / 1"
    background: "{colors.ink}"
    color: "{colors.paper}"
    clipPath: "32-point starburst polygon"
    description: "12+ point starburst clip-path shape filled ink with cream text. Used as an authority seal or volume marker. Always carries a 1–4 character glyph (a number, two-letter abbreviation, or short word) in Big Shoulders 900."
  red-stamp:
    background: "{colors.red}"
    color: "{colors.paper}"
    padding: "clamp(8px, 1vh, 14px) clamp(12px, 1.4vw, 22px)"
    transform: "rotate(-3deg) or rotate(0)"
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontWeight: 900
    description: "Red rectangular stamp with cream text, optionally rotated -3°. Used for status badges (COMPLETE, AS SEEN ON, LIMITED) and product callouts."
  card-product:
    border: "1.5px solid {colors.ink}"
    background: "{colors.paper}"
    overflow: hidden
    description: "Vertical product card with a 1.5px ink border, a colored topstrip header band, and a stacked body of name + description + extras + monospaced spec rows. The catalogue grid's primary unit."
  card-topstrip:
    height: "clamp(18px, 2vh, 32px)"
    description: "Colored horizontal band running the full width of a product card's top — fills in red, pink, orange, or blue depending on the card variant. Reads as a Pantone color tab."
  spec-checklist:
    description: "Vertical column of inline rows with a 14–20px square ink-bordered box (filled or empty) followed by a small caps label (COLOR, LO-FI, STEREO, LP). Echoes the cassette package's feature-spec checklist."
  bar-eq:
    bgUntint: "rgba(58, 37, 22, 0.10)"
    borderUntint: "rgba(58, 37, 22, 0.22)"
    description: "Equalizer-style bar chart. Each column is a stack of 6 equal-height tiles (segments). 'On' segments fill with one of the primary colors (red, pink, orange, yellow, green, blue) per column; 'off' segments fill with a translucent ink tint. column-reverse stacking means on-segments stack from the bottom up, like a VU meter."
  ledger-row:
    gridColumns: "96px 1.4fr 0.9fr 0.6fr 64px"
    paddingY: "clamp(10px, 1.2vh, 18px)"
    borderBottom: "1px solid rgba(58,37,22,0.22)"
    description: "5-column tabular row pattern: date | title | edition | chip | nr indicator. Header row uses a 1.5px ink border-bottom; body rows use 1px hairline ink-alpha dividers."
  chip:
    padding: "4px 10px"
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "11–12px"
    color: "{colors.paper}"
    textTransform: uppercase
    letterSpacing: 0.06em
    description: "Mono-font color chip tagging a ledger row's category. Background pulls from red, pink, orange, blue, or green."
  topbar-rule:
    borderBottom: "1.5px solid {colors.ink}"
    paddingBottom: "clamp(12px, 1.4vh, 22px)"
    description: "Section header underline pattern. A title (Big Shoulders 900 with optional red em-emphasis) on the left aligned-end with a tracked-caps label on the right, separated from the body by a 1.5px ink rule."
  qbody-box:
    background: "{colors.paper}"
    border: "1.5px solid {colors.ink}"
    boxShadow: "8px 8px 0 {colors.ink}"
    padding: "clamp(20px, 2.4vh, 40px) clamp(28px, 2.6vw, 48px)"
    description: "Quote body container with a 1.5px ink border and a hard 8px ink offset shadow. Sits on top of diagonal ribbons as a paper-on-ribbons callout."
  petal:
    aspectRatio: "1 / 1"
    borderRadius: "50%"
    description: "A single perfect circle in one of the primary colors. The atomic unit of petal-clusters and scattered blobs. Always perfectly round — never an ellipse."
  pagenum:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(11px, 0.82vw, 13px)"
    color: "{colors.ink}"
    letterSpacing: 0.06em
    description: "Bottom-right page indicator — mono font, formatted NN / TT. Required on every content slide."
  nb-checkbox:
    width: "clamp(14px, 1.1vw, 20px)"
    aspectRatio: "1 / 1"
    border: "2px solid {colors.ink}"
    checkedFill: "{colors.ink}"
    checkedMarker: "× (cream-colored multiplication sign in Big Shoulders 900)"
    description: "Ink-bordered square checkbox used in spec-checklists and the cover footer. Checked state fills ink and centers a cream multiplication-sign glyph (not a checkmark)."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Sakura Chroma is a **cassette-package editorial system** that treats every slide as a printed product page from a small Japanese audio-products catalogue. The visual metaphor is total: petal-cluster blob marks, diagonal multi-color ribbon bands, 12-point starburst seals, red rectangular stamps, mono-font spec rows, color-coded chips, and equalizer-style bar charts. Everything reads as if pulled from the back-page spread of a 1970s consumer-audio brochure — warm, hand-curated, industrially typeset.

The typeface stack pairs four faces with distinct functional roles. **Big Shoulders Display** is the display voice — a condensed industrial sans at weight 900 with tight negative letter-spacing (-0.012em to -0.025em). It carries every display moment: hero numerals, statements, brand lockups, card names, section titles. Its compressed verticality and heavy weight give the system its loud, catalogue-front voice. **Albert Sans** is the body voice — a clean modern humanist sans at weight 400–700 for body paragraphs, micro-labels, and spec captions. **JetBrains Mono** is the tabular voice — used for spec rows, page numbers, dates, chips, equalizer ticks, and any moment that needs to read as "data" rather than as "editorial." **Noto Sans JP** is the cultural accent — used for occasional Japanese characters (限定版 "limited edition") that signal the Matsumoto-workshop voice. Together the four faces compose as "industrial display + clean body + monospaced data + Japanese spice."

The color philosophy is **warm-cream paper + ink-brown structure + six-color primary accent set**. The paper (`{colors.paper}` — #F1E6CB) is a warm cream, slightly darker than typical bone-white, with a darker tonal sibling (`{colors.paper-dk}` — #E5D6B0) for layered surfaces. The ink (`{colors.ink}` — #3A2516) is a deep warm brown rather than pure black, giving every type and border a print-on-paper warmth. Six primary colors (`red`, `pink`, `orange`, `yellow`, `green`, `blue`) appear as petal-cluster fills, ribbon bands, card topstrips, equalizer-bar fills, chip backgrounds, and red rectangular stamps. The reds and pinks dominate as emphasis colors; the orange / yellow / green / blue ladder serves as the categorical accent set.

Depth comes from **hard offset shadows** (8px 8px 0 ink), **paper-grain texture**, and **color-block layering** — not blurred drops. The signature treatments: the qbody-box (quote callout) carries an 8px hard ink-colored shadow with zero blur; every slide carries a 4px-period halftone-dot paper texture at 16% opacity that grounds every color block in the print register; diagonal multi-color ribbon bands sweep behind content as the system's most distinctive atmospheric layer.

**Density philosophy: medium-high.** The catalogue register depends on visual richness — product-card grids with 4 stacked cards each holding name + description + spec rows, ledger tables with 7+ rows, dashboards combining hero stats + equalizer charts, cover spreads stacking brand lockup + petals + ribbons + hero numeral + spec checklist + footer. A slide with only a single centered headline reads as a manifesto moment (deliberate sparsity in service of impact); every other slide should feel like a packed catalogue page. The correct density is "every region is doing concurrent work" — a topbar with title + meta-label, a body with primary visual + secondary panels, often a chip / stamp / seal as decorative punctuation.

**Key Characteristics:**
- Warm cream paper canvas (`{colors.paper}`) with warm-brown ink (`{colors.ink}`) as structure and six primary accent colors.
- A 4px-period halftone-dot paper texture (`{components.paper-texture}`) sits over every slide at 16% opacity. Required.
- Big Shoulders Display weight 900 with negative tracking for every display moment; Albert Sans for body; JetBrains Mono for tabular / data; Noto Sans JP for Japanese accents.
- Petal-cluster blob marks (4–5 overlapping perfect circles) as the signature decorative element.
- Diagonal multi-color ribbon bands (5 stacked colored bars at -22° or +22°) as atmospheric layering.
- 32-point starburst seal (`{components.rosette-seal}`) and red rectangular stamps (`{components.red-stamp}`) as authority marks.
- Hard offset shadows: 8px 8px 0 ink on quote callouts; no blur, no soft drops anywhere.
- Catalogue product cards with colored topstrip + name + description + dashed-rule + mono spec rows.
- Equalizer bar charts where each column stacks 6 tiles and "on" segments stack from the bottom up like a VU meter.
- Page numbers on every content slide in JetBrains Mono at bottom-right.

## Colors

### Palette
- **Paper** (`{colors.paper}` — #F1E6CB): The warm cream canvas. The default surface for every slide. Slightly darker and warmer than typical off-white, giving the deck a printed-paper warmth.
- **Paper Dark** (`{colors.paper-dk}` — #E5D6B0): A slightly darker tonal sibling of the canvas. Used for layered surfaces, half-region backgrounds, and where one paper region needs to read as sitting beneath another.
- **Ink** (`{colors.ink}` — #3A2516): Deep warm-brown ink. The structural color — all body text, all borders, all dividers, all hard-offset shadow color, all seal fills, all topbar rules. Slightly cool brown rather than pure black so it sits as warm ink on warm paper.
- **Red** (`{colors.red}` — #E5392A): The primary emphasis color and stamp color. Used for inline `em` emphasis inside Big Shoulders display headlines, for the red rectangular stamps, for catalogue-card topstrips on the first card, for hero numerals on data slides, and as the first ribbon-band color.
- **Pink** (`{colors.pink}` — #E54489): A bright magenta-pink. Used as the lockup-bar background on cover hero lockups, as a ribbon band color, as card-topstrip color for the second variant, and as a chip background.
- **Orange** (`{colors.orange}` — #F09131): A warm sunset orange. Used as a petal color, ribbon-band color, card-topstrip color for the third variant, and chip background.
- **Yellow** (`{colors.yellow}` — #F0BC2A): A mustard-warm yellow. Used as a petal color, ribbon-band color. Reserved as a categorical accent.
- **Green** (`{colors.green}` — #3D9F47): A medium grass green. Used as a petal color, ribbon-band color, chip background, and equalizer bar color.
- **Blue** (`{colors.blue}` — #3F8BC4): A warm mid-blue. Used as a petal color, ribbon-band color, card-topstrip color for the fourth variant, chip background, and as the second hero statistic color when the primary red statistic needs a paired counterpart.

### Defaults
- **Default surface background**: `{colors.paper}` — every slide opens on warm cream paper.
- **Default headline color**: `{colors.ink}` — display headlines are warm-brown ink, not red or another accent. Red appears only as inline `em` emphasis inside an ink headline.
- **Default body text color**: `{colors.ink}`.
- **Default border color**: `{colors.ink}` — every structural border is warm-brown ink, no exceptions.
- **Default tabular / mono text color**: `{colors.ink}`. Mono rows occasionally use `opacity: 0.7` on key labels for visual hierarchy.
- **Default emphasis color (inline `em` inside display headlines)**: `{colors.red}` for body and catalogue spreads; `{colors.blue}` for quote spreads when the body's color story already includes red.
- **Default hero numeral color**: `{colors.red}` — large data-slide statistics are red. Pair with `{colors.blue}` for a second statistic if two stats appear together.
- **Default stamp color**: `{colors.red}` background with `{colors.paper}` text on every red rectangular stamp.
- **Default seal color**: `{colors.ink}` background with `{colors.paper}` text on every starburst seal.
- **Default text color on `{colors.red}`, `{colors.pink}`, `{colors.orange}`, `{colors.green}`, `{colors.blue}` surfaces**: `{colors.paper}` (cream) — the only color inversion in the system.
- **Default text color on `{colors.ink}` surfaces**: `{colors.paper}` (cream) for inversions.
- **Default chip palette ordering** (for categorical chips in ledgers / tables): red → pink → orange → blue → green.

The six primary colors have **no fixed semantic meaning** (red is not "danger," green is not "success"). They serve as a categorical accent set — pick whichever color suits the composition. The exception is `{colors.red}` for emphasis: it carries an "attention" register that the cool colors do not, so reserve it for inline `em` and for the most-emphasized hero numerals.

## Typography

### Font Family
The system has four Google Fonts each with a distinct functional role:

- **Big Shoulders Display** (display): Condensed industrial sans-serif at weight 700 and 900. Used for every display moment — headlines, statements, hero numerals, brand lockups, card names, seal text, stamp text, ledger row titles. Always with negative letter-spacing (-0.012em to -0.025em). Its tall narrow condensed forms are the entire system's visual identity.
- **Albert Sans** (body): Clean modern humanist sans at weights 400, 500, 600, 700. Used for body paragraphs (weight 400), descriptions (weight 400), tracked-caps micro-labels (weight 700), and emphasis body (weight 600–700). The neutral counterpoint to Big Shoulders' expressiveness.
- **JetBrains Mono** (data): Monospace at weights 400, 500. Used for spec rows in product cards, date tags in ledgers, page numbers, equalizer-tick labels, chip text, navigation hints, meta tags. Any moment that reads as "data" rather than "editorial."
- **Noto Sans JP** (cultural accent): Japanese sans at weight 500, 700. Used sparingly for Japanese characters (限定版, 漢字, 平仮名) embedded in cover footers and brand marks. Provides the Matsumoto-workshop cultural register.

Italic does not exist. Underline does not exist. Emphasis is achieved by inline `<em>` (color shift to red or blue without italic style), by weight (Albert Sans 400 → 700), or by switching face (Albert Sans body → Big Shoulders display).

### Type Scale

| Token | Size (clamp) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.disp-hero}` | 120–280px | Big Shoulders Display | 900 | Hero numeral on a cover spread |
| `{typography.disp-title}` | 80–180px | Big Shoulders Display | 900 | Oversized title on a colophon / closing spread |
| `{typography.disp-statement}` | 70–168px | Big Shoulders Display | 900 | Manifesto / single-statement spread |
| `{typography.disp-lockup}` | 56–130px | Big Shoulders Display | 900 | Brand lockup bar on cover |
| `{typography.disp-quote-lg}` | 56–130px | Big Shoulders Display | 900 | Large pulled quote |
| `{typography.disp-section}` | 52–100px | Big Shoulders Display | 900 | Section topbar title |
| `{typography.disp-quote}` | 48–110px | Big Shoulders Display | 900 | Standard pulled quote |
| `{typography.disp-brand}` | 32–56px | Big Shoulders Display | 900 | Brand sub-mark or wordmark |
| `{typography.disp-card-name}` | 28–48px | Big Shoulders Display | 900 | Product card name |
| `{typography.num-hero}` | 110–240px | Big Shoulders Display | 900 | Primary hero statistic |
| `{typography.num-md}` | 70–150px | Big Shoulders Display | 900 | Secondary statistic |
| `{typography.ttl-row}` | 22–30px | Big Shoulders Display | 700 | Ledger row title |
| `{typography.body-emphasis}` | 15–20px | Albert Sans | 600 | Lead paragraph or emphasized body |
| `{typography.body}` | 14–17px | Albert Sans | 400 | Standard paragraph body |
| `{typography.body-md}` | 14–15px | Albert Sans | 400 | Compact body inside cards |
| `{typography.micro-spec}` | 14–20px | Albert Sans | 700 | Spec-checklist label (lightly tracked) |
| `{typography.micro-xl}` | 12–14px | Albert Sans | 700 | Loosest tracked-caps micro-label (0.32em) |
| `{typography.micro-lg}` | 12–14px | Albert Sans | 700 | Tracked-caps eyebrow label (0.2em) |
| `{typography.micro}` | 12–14px | Albert Sans | 700 | Standard tracked-caps micro-label (0.16em) |
| `{typography.mono-md}` | 14–16px | JetBrains Mono | 400 | Tabular date or value |
| `{typography.mono}` | 11–12px | JetBrains Mono | 400 | Spec row, page number, equalizer tick |
| `{typography.mono-tag}` | 12–14px | JetBrains Mono | 400 | Chip tag text |
| `{typography.stamp-text}` | 20–28px | Big Shoulders Display | 900 | Red rectangular stamp text |
| `{typography.seal-text}` | 22–38px | Big Shoulders Display | 900 | Starburst seal text |
| `{typography.jp}` | inherit | Noto Sans JP | 500 | Japanese character accent |

### Defaults
- **Default size for a primary section headline (topbar context)**: `{typography.disp-section}` (52–100px clamp) in `{colors.ink}`.
- **Default size for a manifesto / centered-statement spread**: `{typography.disp-statement}` (70–168px clamp) in `{colors.ink}` with optional `<em>` color shift.
- **Default size for paragraph body**: `{typography.body}` (14–17px clamp).
- **Default size for a tracked-caps micro-label or eyebrow**: `{typography.micro}` (12–14px Albert Sans weight 700, 0.16em tracking, uppercase) in `{colors.ink}`.
- **Default size for a hero statistic**: `{typography.num-hero}` (110–240px clamp) in `{colors.red}`.
- **Default size for a tabular date or mono value**: `{typography.mono-md}` (14–16px) in `{colors.ink}`.
- **Default size for a page number**: `{typography.mono}` (11–12px) in `{colors.ink}`.
- **Default weight for any Big Shoulders Display element**: 900. (700 is reserved for `{typography.ttl-row}` — the ledger row title, which is the only sub-display moment in the system.)
- **Default weight for body**: 400; for micro-labels: 700; for emphasis body: 600–700.

When unsure between `{typography.disp-section}` and `{typography.disp-statement}` for the dominant text moment, choose `{typography.disp-section}` if the slide carries a topbar/body grid; choose `{typography.disp-statement}` if the slide is dedicated to a single centered statement.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Big Shoulders Display element carries negative letter-spacing** (-0.012em to -0.025em). Default tracking on Big Shoulders reads as untreated; the negative tracking is what gives display type its compressed, catalogue-cover density.
- **Every micro-label is uppercase with significant tracking** (0.16em, 0.18em, 0.2em, or 0.32em depending on context). A micro-label without uppercase + tracking reads as a body fragment, not a label.
- **Every page number uses JetBrains Mono** in the `NN / TT` format. Page numbers are non-optional on every content slide and live at bottom-right.
- **Every inline `<em>` inside a Big Shoulders display headline switches color** to `{colors.red}` (default) or `{colors.blue}` (on quote spreads where red is overloaded). Never use italic style; the color shift is the entire emphasis device.
- **Every spec row uses JetBrains Mono.** A spec row in Albert Sans reads as a body sentence, not as catalogue data.
- **Every starburst seal uses the 32-point clip-path polygon** with `{colors.ink}` fill and `{colors.paper}` text. Variations in point count or simplification (e.g., 8-point burst, 16-point) break the seal-recognition signal.
- **Every red stamp uses `{colors.red}` background with `{colors.paper}` text** and Big Shoulders 900. Stamp text is always uppercase, always tracked positively (0.02em).

### Typography Principles
The system's typographic rhythm comes from **face-to-face contrast**: Big Shoulders display (loud, condensed, ink) → Albert Sans body (quiet, neutral, sentence case) → JetBrains Mono data (mechanical, tabular, fixed-width) → Noto Sans JP (cultural punctuation). A slide that uses only one face reads as flat; a slide that uses Big Shoulders + Albert Sans + JetBrains Mono together reads as catalogue-correct.

Line-height: tight on display (0.84–0.94), generous on body (1.4–1.5), tight on micro and mono (1.0–1.3). Inverting these breaks the rhythm.

## Layout

### Canvas System
The system targets `100vw × 100vh`. The deck is wrapped in a `.deck` grid with a centered `.stage` filling the viewport. Each `.slide` is absolutely positioned inset 0 with opacity 0; only the `.active` slide has opacity 1. Transitions are 280ms ease opacity fades. Navigation is JS-driven via arrow keys, space, PageUp/Down, Home/End, and touch swipe.

### Frame Inset Pattern
Most content slides follow a frame-inset pattern: a `.frame` div sits inset from the slide edges by `clamp(36px, 3.6vw, 72px)` on top/left/right and `clamp(72px, 7vh, 110px)` at bottom (to clear the page number). Inside the frame, a topbar pattern (title + meta-label + 1.5px ink rule) sits above a body region.

Cover, manifesto, and quote spreads break the frame pattern — they layer petals, ribbons, hero numerals, and lockups freely across the canvas without the topbar/body grid.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.frame-inset}` | 36–72px | Frame inset from slide edges |
| `{spacing.frame-inset-bottom}` | 72–110px | Frame bottom inset (clears page number) |
| `{spacing.topbar-gap}` | 12–22px | Topbar pad-bottom and section gap |
| `{spacing.grid-gap}` | 16–26px | Card grid inter-cell gap |
| `{spacing.col-gap}` | 28–56px | Two-column body gap |
| `{spacing.card-pad-x}` / `{spacing.card-pad-y}` | 14–20px / 16–24px | Product card body padding |
| `{spacing.pagenum-inset}` | 20–36px / 24–44px | Page number inset from bottom-right |

### Persistent Chrome
Two persistent elements:
- **Page number** at bottom-right of every content slide — JetBrains Mono 11–13px `NN / TT` format.
- **Nav hint** at fixed bottom-left — JetBrains Mono 10–12px text reading `← / → · space`, at 0.36 opacity.

The page number is part of every slide composition (not a global overlay); the nav hint is a single global element.

## Depth and Elevation

### Hard Offset Shadow (Primary Technique)
The system uses **hard offset shadows in ink** at exactly one value: `8px 8px 0 {colors.ink}` (zero blur, solid ink). Applied to the qbody-box (quote callout) and other elevated paper-on-ribbons elements that need to lift off a busy underlying composition. The shadow is rare — most cards and panels rely on borders alone for definition, and the 8px ink shadow is reserved for the moment that earns it.

### Paper-Grain Texture (Atmospheric Layer)
The `{components.paper-texture}` halftone-dot pattern sits over every slide at 16% opacity. It is not depth in the strict sense but provides the foundational textural ground that makes every flat color block read as ink on paper. Removing it breaks the print register immediately. Required on every slide.

### Color-Block Layering
Depth comes primarily from **layered colored regions**: ribbon bands behind hero numerals; petals behind brand lockups; topstrip color tabs on top of paper cards; red stamps over diagonal ribbons. The high-contrast accents projecting forward against the warm cream backdrop is the system's primary depth grammar.

### Border Definition
Most cards and panels rely on 1.5px ink borders for definition, not shadows. A 1.5px ink border around a paper card on the same paper background reads as elevated through the boundary alone.

### No Soft Shadows
The system uses **no blurred `box-shadow`** (other than the single 8px hard offset on qbody-box), no `drop-shadow` filters, no rgba shadow tints. A soft modern shadow on any element breaks the print catalogue aesthetic.

## Shapes and Treatment

### Border Radius
| Value | Use |
|---|---|
| 0px | All cards, all stamps, all topbars, all bodies, all chips, all ledger rows |
| 50% | Petals (perfect circles) — used inside petal-clusters and scattered blobs only |
| Polygon clip-path (32-point starburst) | Rosette seal — the only complex shape primitive |

The system has **no rounded corner radii** other than perfect circles (petals) and the polygon-clipped starburst (seal). Every other shape is strict rectangular or square.

### Border Weights
- **1.5px solid `{colors.ink}`** — the standard border weight on cards, topbar rules, ledger header rules, qbody-box, the cover frame's bottom rule, the cover footer's top rule.
- **2px solid `{colors.ink}`** — used on the spec-checklist checkbox borders.
- **1px solid `{colors.ink}`** — used inside the equalizer for the ticks/labels separator.
- **1px solid rgba(58,37,22, 0.22)** — used as the hairline ledger row body divider and as equalizer-segment off-state borders.
- **1px dashed `{colors.ink}`** — used as the dashed rule separating a product card's description from its mono spec rows.

Borders are always ink (warm brown). Colored borders do not exist in this system except as a chip's implicit background-border.

### Decorative Element Types

**Petal cluster** (`{components.petals-cluster}`) — A bounded container holding 4–5 perfectly-circular colored blobs that overlap. Each petal is positioned absolutely within the container as a percentage offset. The colors rotate across the primary palette (red, pink, orange, yellow, green, blue) — never all the same color. Used as a brand mark anchor in slide corners and as decorative ornament on quote spreads. The signature decorative element.

**Ribbon band** (`{components.ribbon-band}`) — A stack of 5 solid-colored horizontal bars rotated -22° or +22° to sweep diagonally across a region. Bars stack vertically with each ribbon at a different `top` percentage, creating a parallel-rays effect. Anchored to one slide edge, oversized to bleed off the opposite edge. The system's atmospheric layering signature.

**Rosette seal** (`{components.rosette-seal}`) — A 32-point starburst clip-path shape filled `{colors.ink}` with cream text. Carries a 1–4 character glyph: a year number ("26"), a volume number ("VOL 26"), or a 2-3 letter abbreviation. Used as authority mark on covers and closing colophons.

**Red rectangular stamp** (`{components.red-stamp}`) — A red rectangle with cream text and optional -3° rotation. Used for status badges (COMPLETE, AS SEEN ON) and product callouts. Always Big Shoulders 900 uppercase.

**Product card** (`{components.card-product}`) — Vertical card with a 1.5px ink border, a colored top strip (red / pink / orange / blue variant), and a stacked body: card name in Big Shoulders 900 → description in Albert Sans 400 → dashed-rule → mono spec rows. The catalogue grid's primary unit.

**Card topstrip** (`{components.card-topstrip}`) — A 18–32px tall solid-color band running the full width of a product card's top. Reads as a Pantone color tab; identifies the card's variant within the grid.

**Spec checklist** (`{components.spec-checklist}`) — Vertical column of `nb-checkbox` + tracked-caps label rows. Each row has a 14–20px ink-bordered square box (filled or empty, filled state shows a cream `×` glyph) followed by an uppercase tracked label.

**Ledger row** (`{components.ledger-row}`) — 5-column tabular row pattern: date (mono) | title (Big Shoulders 700) | edition (Albert Sans) | chip | nr indicator (square boxes). Header row uses 1.5px ink border-bottom; body rows use 1px hairline ink-alpha dividers.

**Chip** (`{components.chip}`) — Mono-font color block tagging a ledger row category. Background pulls from the primary palette (red, pink, orange, blue, green). Always cream text.

**Topbar rule** (`{components.topbar-rule}`) — Section header underline pattern: title (display) on left aligned-end with a tracked-caps meta-label on right, separated from the body by a 1.5px ink rule.

**Equalizer bar chart** (`{components.bar-eq}`) — 8-column grid where each column stacks 6 equal-height tiles (segments). `column-reverse` flex direction means the first segment in source order sits at the bottom; "on" segments stack from the bottom up like a VU meter. On-segment color is set per column (red, pink, orange, yellow, green, or blue); off-segments are translucent ink tint.

**Qbody-box** (`{components.qbody-box}`) — Quote callout container with 1.5px ink border and 8px hard ink shadow. Sits on top of diagonal ribbons.

**Brand lockup** — Big Shoulders 900 wordmark over Albert Sans 600 sub-mark, positioned absolutely near the cover petals.

## Do's and Don'ts

### Do
- Keep the paper-grain halftone-dot texture (`{components.paper-texture}`) on every slide at 16% opacity. It is the foundational print register; removing it makes the deck look like a flat web template.
- Use Big Shoulders Display at weight 900 with negative letter-spacing (-0.012em to -0.025em) for every display moment.
- Apply tracked uppercase to every micro-label — 0.16em standard, 0.2em for eyebrows, 0.32em for the loosest manifesto kicker. Default tracking reads as a body sentence.
- Set hero statistics in `{colors.red}` at Big Shoulders 900. Pair with `{colors.blue}` for a second statistic.
- Use inline `<em>` in display headlines to shift color (red default, blue on quote spreads). Never italicize.
- Compose petal-cluster blob marks (4–5 overlapping perfect circles in primary colors) as decorative anchors in slide corners.
- Sweep diagonal multi-color ribbon bands (-22° or +22°) behind hero content as atmospheric layering on cover and closing spreads.
- Place a page number on every content slide in JetBrains Mono at bottom-right (`NN / TT` format).
- Use JetBrains Mono for spec rows, dates, chips, and any tabular data — anything that should read as "data" instead of "editorial."
- Reserve the 32-point starburst seal and the red rectangular stamp for authority moments (covers, colophons, product callouts). They are signature marks; overuse degrades them.

### Don't
- Don't round any corner. Cards, stamps, chips, topbars — all strict rectangles. Petals (circles) and the starburst seal (polygon clip-path) are the only non-rectangular shapes.
- Don't use blurred `box-shadow`. The only shadow in the system is the 8px hard ink offset on quote callouts. Soft modern shadows break the print register.
- Don't substitute another display face for Big Shoulders Display. The condensed industrial 900 voice is the entire system identity.
- Don't substitute another mono face for JetBrains Mono. The tabular voice is part of the catalogue conceit.
- Don't use Big Shoulders Display for body paragraphs. It reads as overwrought at small body sizes.
- Don't use Albert Sans for display moments. Albert Sans is the neutral body face; display moments need Big Shoulders.
- Don't italicize for emphasis. Use inline `<em>` with red or blue color, or switch weight (Albert 400 → 700).
- Don't introduce a seventh primary color. The palette is locked at red / pink / orange / yellow / green / blue. Adding purple, cyan, or other hues breaks the catalogue color story.
- Don't fill a card border with a saturated accent color (red border, blue border). Borders are always ink.
- Don't omit the page number on a content slide. It is a non-optional editorial signal.

## Responsive Behavior

The system targets `100vw × 100vh` and uses `clamp()` throughout with `min(Xvw, Yvh)` patterns that combine viewport-width and viewport-height constraints. This produces fluid scaling across desktop sizes without responsive breakpoints. There is no defined mobile breakpoint — the deck is presentation-first.

### Scaling Behavior
- Display headlines scale via `min(Xvw, Yvh)` so they shrink when the viewport gets short, not only when it gets narrow.
- Body, mono, and micro labels scale within their clamp range based on viewport width.
- Petals, ribbons, seals, and stamps use `vw`/`vmin` units so they scale proportionally with the canvas.
- The 4px paper-grain texture period is fixed regardless of viewport.

### Presenter Behavior
- Slides advance via `ArrowRight`, `PageDown`, or `Space`.
- Slides reverse via `ArrowLeft` or `PageUp`.
- `Home` jumps to first, `End` to last.
- Touch swipe horizontal advances/reverses.
- The active slide carries the `.active` class; inactive slides are at opacity 0.

### Print Behavior
No `@media print` rule is defined.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin | Chinese | Weight mapping |
|---|---|---|---|
| Display / Headline / Statement / Hero numeral / Card name / Seal / Stamp / Lockup | Big Shoulders Display (900) | **站酷小薇体 ZCOOL XiaoWei** | regular (single weight) |
| Body / Body-md / Body-emphasis / Micro labels | Albert Sans (400 / 600 / 700) | **霞鹜文楷 LXGW WenKai** | regular |
| Tabular / Spec rows / Chips / Page numbers / Mono labels | JetBrains Mono (400 / 500) | **霞鹜文楷 LXGW WenKai** (or keep mono Latin-only for spec rows) | regular |
| Japanese accents | Noto Sans JP | *(unchanged)* | 500 / 700 |

### Mixed-Content Strategy

**Strategy A — display CJK + body CJK, each with its own character.** The cassette-package aesthetic is feminine-floral with industrial discipline, and the Chinese pairing should honor both halves. **ZCOOL XiaoWei (站酷小薇体)** is a graceful condensed display face with elegant high-contrast strokes — it echoes Big Shoulders Display's condensed verticality while carrying a softer, distinctly feminine voice that matches the petal-cluster decorative system. **LXGW WenKai (霞鹜文楷)** is a warm KaiTi-style body face based on Fontworks Klee — it has the friendly hand-curated quality that matches Albert Sans's role as the body voice, and reads beautifully at small sizes against the warm cream paper. Together the two CJK faces preserve the "industrial display + warm body" rhythm of the Latin system while landing the Chinese deck in a distinctly hand-curated, slightly-feminine register that suits Sakura Chroma's name and its floral motifs.

### Loading

```html
<link href="https://chinese-fonts-cdn.deno.dev/packages/zcool-xiaowei/dist/ZCOOLXiaoWei-Regular/result.css" rel="stylesheet">
<link href="https://chinese-fonts-cdn.deno.dev/packages/lxgwwenkai/dist/LXGWWenKai-Regular/result.css" rel="stylesheet">
```

Then append the CJK families to the appropriate font stacks:
```css
/* Display roles */
font-family: 'Big Shoulders Display', 'ZCOOL XiaoWei', sans-serif;
/* Body / micro roles */
font-family: 'Albert Sans', 'LXGW WenKai', sans-serif;
/* Mono roles (if used for CJK content) */
font-family: 'JetBrains Mono', 'LXGW WenKai', ui-monospace, monospace;
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

- **The negative tracking on Big Shoulders display (-0.012em to -0.025em) must drop to 0** on CJK. ZCOOL XiaoWei is already a condensed face; negative tracking will collide glyphs.
- **The tracked-caps micro-labels (0.16em, 0.2em, 0.32em) have no CJK equivalent.** Drop tracking to 0 for CJK micro-labels and let the warm-brown ink color + bold weight carry the categorical-label signal. A "限定版 LIMITED EDITION" eyebrow can mix CJK + Latin in the same label — keep tracking 0 on the CJK characters and 0.16em+ on the Latin.
- **Inline `<em>` color shifts (to red or blue) work identically in CJK** — color emphasis is glyph-agnostic and lands beautifully on ZCOOL XiaoWei display headlines.
- **Petal clusters, ribbon bands, starburst seals, and red rectangular stamps are all glyph-agnostic** — they carry the system's industrial-catalogue voice equally well behind Chinese content.
- **The 32-point starburst seal carrying a 2–4 character glyph** works exceptionally well with a single Chinese character (限, 新, 季) at ZCOOL XiaoWei in `{colors.paper}` cream. The bold display weight makes the central glyph read as a maker's mark.
- **Spec rows in JetBrains Mono** present the trickiest decision: pure-Latin spec rows (`44.1 KHZ`, `LP / 33⅓`) preserve the catalogue conceit; localized spec rows in LXGW WenKai (`立体声`, `限定版`) read as a Chinese-market catalogue but lose the technical-spec voice. The right move is **mixed-language spec rows where Latin values stay mono and Chinese descriptors switch to LXGW WenKai inline.**
- **Noto Sans JP accents (限定版) remain unchanged** — Japanese characters share glyphs with Simplified Chinese in many cases but the Noto Sans JP rendering is intentional (Japanese-edition affect). On a Chinese-primary deck, swap to LXGW WenKai for these characters so they read as Chinese rather than as a Japanese loan.

### Known CJK Gap

ZCOOL XiaoWei is a single-weight face — there is no 900-equivalent. The Big Shoulders 900-weight loudness that defines the Latin display voice cannot be exactly matched. Compensate by reserving CJK display for moments where the soft elegance is welcome (cover spreads, quote slides) rather than where pure brutalist weight is needed (hero stats). For hero numerals, keep the figures in Latin numerals at Big Shoulders 900 — Chinese numerals (一二三四) don't carry the catalogue-cover statistical voice anyway.

## Iteration Guide

1. Every new content slide carries the paper-grain halftone-dot texture, a frame-inset region (36–72px from edges, 72–110px from bottom), and a page number at bottom-right.
2. Any new content slide that follows the frame pattern opens with a topbar: display-section title on the left, tracked-caps meta-label on the right, separated from the body by a 1.5px ink rule.
3. Any new headline uses Big Shoulders Display weight 900 with negative tracking. For section topbars use `{typography.disp-section}`; for single-statement spreads use `{typography.disp-statement}`; for hero numerals use `{typography.num-hero}` in red.
4. Any new body uses Albert Sans 400; tracked-caps labels use Albert Sans 700 uppercase with 0.16–0.32em tracking; tabular content uses JetBrains Mono 400.
5. Any new card uses a 1.5px ink border, optional colored topstrip (red / pink / orange / blue), and a body pattern of display name → Albert body → dashed-rule → mono spec rows.
6. Any new ledger / tabular pattern uses the 5-column ledger-row grid with header underline (1.5px ink) and hairline body dividers (1px ink-alpha). Categorical tags use mono chips with primary-palette backgrounds.
7. Any new decorative anchor uses a petal-cluster (4–5 overlapping perfect-circle petals in mixed primary colors). Avoid ellipses — petals are always perfectly round.
8. Any new authority mark uses the 32-point starburst seal (ink-filled, cream text) or the red rectangular stamp. Seals are formal; stamps are punchy.
9. Any inline emphasis inside a display headline uses `<em>` with color shift to `{colors.red}` (default) or `{colors.blue}` (when red is overloaded). Never italicize.
10. Atmospheric layering — diagonal ribbon bands at -22° or +22° behind hero content — appears on cover, closing, and stripe-spread moments. It is not a routine slide element; reserve it for spreads that earn atmospheric ambition.

## Known Gaps

- The system loads four Google Fonts (Big Shoulders Display, Albert Sans, JetBrains Mono, Noto Sans JP). Big Shoulders is multi-weight (500, 700, 800, 900); the system uses 700 and 900. Self-hosting recommended for production.
- The paper-grain texture is a CSS radial-gradient (not an SVG noise filter) so it tiles deterministically across browsers and is performant. The dot period (4px) is fixed and does not scale with viewport.
- The 32-point starburst clip-path polygon is hardcoded; modifying the seal shape requires rewriting the polygon point list. The system is consistent only because the same polygon is reused everywhere — switching to a different starburst polygon breaks visual cohesion.
- The diagonal ribbon bands use `transform: rotate(-22deg)` and oversize widths (160%) to bleed off the slide edges. On very tall viewports the ribbon coverage may look thinner than on standard 16:9 viewports.
- The equalizer bar chart uses `display: flex; flex-direction: column-reverse;` to stack on-segments from the bottom up. This is a subtle layout pattern that can be fragile under aggressive overrides — modifying the eq segments requires preserving the column-reverse behavior.
- Hero statistics use inline `<sub>` and inline-style `font-size` overrides for sub-units (`26K`, `61%`), which sidesteps the typography token system. New stats should follow the same pattern: oversized numeral + smaller inline unit at ~34% the numeral's size in ink color.
- Noto Sans JP is loaded but used only once (限定版 "limited edition" in the cover footer). If a deck contains no Japanese content, the font load is unused weight; consider removing the import for non-Japanese decks.
- The nav hint at bottom-left has very low opacity (0.36) and may be difficult to see at default presenter brightness. It is intended as ambient chrome, not as a prominent affordance.
