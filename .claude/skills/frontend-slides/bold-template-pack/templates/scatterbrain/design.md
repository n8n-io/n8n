---
version: alpha
name: Scatterbrain
description: "A Post-it-note-and-cork-board presentation system. Every content block is a colored sticky note on a textured paper or cork surface, layered with red thumbtacks, masking tape, and decorative doodles. Display type runs in Shrikhand (a chunky decorative display serif) on every headline; body type runs in Zilla Slab (a friendly slab serif); handwritten emphasis runs in Caveat. The palette is pastel sticky-note colors (yellow, blue, pink, green, orange, purple) on cream paper / cork / warm gradient backgrounds. The aesthetic borrows from creative-workshop wall art, brainstorming boards, and indie-studio mood boards: scattered slight rotations, multiple background texture variants per slide, pin / tape / drop-shadow combinations. The effect is warmth, play, and tactile creative-process energy."

colors:
  yellow: "#ffe066"
  yellow-deep: "#ffd43b"
  blue: "#a5d8ff"
  blue-deep: "#74c0fc"
  pink: "#ffc9c9"
  pink-deep: "#ff9f9f"
  green: "#b2f2bb"
  green-deep: "#8ce99a"
  orange: "#ffcc80"
  purple: "#d0bfff"
  cream: "#faf8f3"
  paper: "#f7f5f0"
  ink: "#2d2a26"
  ink-light: "#5c5750"
  shadow: "rgba(45, 42, 38, 0.15)"
  shadow-deep: "rgba(45, 42, 38, 0.25)"

typography:
  display-hero:
    fontFamily: "'Shrikhand', cursive"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
  statement:
    fontFamily: "'Shrikhand', cursive"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
  headline:
    fontFamily: "'Shrikhand', cursive"
    fontSize: "clamp(1.8rem, 3.5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
  title:
    fontFamily: "'Shrikhand', cursive"
    fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.02em
  body:
    fontFamily: "'Zilla Slab', serif"
    fontSize: "clamp(1rem, 1.5vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.7
  list-item:
    fontFamily: "'Zilla Slab', serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.6
  handwritten:
    fontFamily: "'Caveat', cursive"
    fontSize: "clamp(1.2rem, 2vw, 1.6rem)"
    fontWeight: 400
    lineHeight: 1.4
  handwritten-lg:
    fontFamily: "'Caveat', cursive"
    fontSize: "clamp(1.4rem, 2.5vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.3
  handwritten-sm:
    fontFamily: "'Caveat', cursive"
    fontSize: "clamp(1.2rem, 1.5vw, 1.4rem)"
    fontWeight: 500
    lineHeight: 1.3
  label-script:
    fontFamily: "'Caveat', cursive"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.15em
    textTransform: uppercase
  stat-value:
    fontFamily: "'Shrikhand', cursive"
    fontSize: "1.8rem"
    fontWeight: 400
    lineHeight: 1.1
  caption-subtitle:
    fontFamily: "'Zilla Slab', serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.6

spacing:
  slide-pad: 3rem
  post-it-pad-lg: "3rem 4rem"
  post-it-pad-md: "2.5rem"
  post-it-pad-sm: "1.5rem"
  post-it-pad-statement: "3.5rem 4rem"
  gap-lg: "3rem"
  gap-md: "2.5rem"
  gap-sm: "2rem"

canvas:
  width: 100vw
  height: 100vh

components:
  bg-cork:
    backgroundLayers: "radial-gradient ellipse + linear-gradient (warm browns) + SVG plus-sign pattern at 15% opacity"
    description: "Cork-board background variant. Warm tan/brown tonal gradient with a faint pattern of small plus-sign marks suggesting cork texture. Used on slides that feel like 'a wall of pinned notes.'"
  bg-paper:
    backgroundLayers: "linear-gradient (cream) + 40px grid lines at 8% opacity"
    description: "Desk-paper background variant. Cream gradient with a faint 40px grid overlay suggesting graph or notebook paper. Used on slides that feel like 'notes arranged on a desk.'"
  bg-warm:
    backgroundLayers: "multiple radial-gradients (yellow/blue/pink soft glows) + linear-gradient cream base"
    description: "Warm gradient background variant. Cream base with soft-glow ellipses of yellow, blue, and pink suggesting morning light. Used on slides that need a softer, less-textured atmosphere."
  grain-overlay:
    backgroundImage: "SVG fractal-noise filter, 256×256 tile"
    opacity: 0.04
    zIndex: 9999
    description: "Fixed full-viewport SVG grain texture above all content at 4% opacity. Reinforces the paper-and-cork tactile register. Always present."
  post-it:
    padding: "2rem"
    boxShadow: "2px 3px 15px {colors.shadow}, 0 1px 3px {colors.shadow-deep}"
    description: "Generic colored sticky-note base. Soft drop-shadow simulates the note's slight lift off the surface. Always carries a background color from the post-it palette (yellow, blue, pink, green, orange, purple, or white)."
  post-it-yellow:
    background: "linear-gradient(135deg, {colors.yellow} 0%, {colors.yellow-deep} 100%)"
    description: "Yellow sticky variant. Soft 135° gradient from light to deep yellow."
  post-it-blue:
    background: "linear-gradient(135deg, {colors.blue} 0%, {colors.blue-deep} 100%)"
    description: "Blue sticky variant."
  post-it-pink:
    background: "linear-gradient(135deg, {colors.pink} 0%, {colors.pink-deep} 100%)"
    description: "Pink sticky variant."
  post-it-green:
    background: "linear-gradient(135deg, {colors.green} 0%, {colors.green-deep} 100%)"
    description: "Green sticky variant."
  post-it-orange:
    background: "{colors.orange}"
    description: "Orange sticky variant. Flat fill (no gradient) — the only post-it that ships flat."
  post-it-purple:
    background: "{colors.purple}"
    description: "Purple sticky variant. Flat fill."
  post-it-white:
    background: "#fff"
    border: "2px solid {colors.ink}"
    description: "White note variant. Carries a 2px ink border (because pure white otherwise disappears into cream/paper backgrounds). Used as a 'plain note' in timelines or comparisons."
  pin:
    width: 16px
    height: 16px
    position: "::before, top: -12px, centered"
    background: "radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)"
    boxShadow: "0 2px 4px {colors.shadow-deep}, inset -2px -2px 4px rgba(0,0,0,0.2)"
    description: "Red thumbtack mark sitting at the top-center of a post-it via ::before. Radial-gradient gives it a 3D bead-shaped highlight; inset shadow adds dimension. The default pin color."
  pin-blue:
    background: "radial-gradient(circle at 30% 30%, #4dabf7, #1864ab)"
    description: "Blue thumbtack variant."
  pin-green:
    background: "radial-gradient(circle at 30% 30%, #69db7c, #2f9e44)"
    description: "Green thumbtack variant."
  pin-gold:
    background: "radial-gradient(circle at 30% 30%, #ffd43b, #f59f00)"
    description: "Gold thumbtack variant."
  tape:
    width: 80px
    height: 25px
    position: "::after, top: -15px, centered, rotate(-2deg)"
    background: "rgba(255, 255, 255, 0.4)"
    border: "1px solid rgba(255, 255, 255, 0.3)"
    description: "Masking-tape mark across the top-center of a post-it via ::after. Translucent white, slightly rotated. Often combined with .pin so a single note has both tape and a tack."
  card-rotation:
    rotation: "±1° to ±15°"
    description: "Every post-it carries a small rotation. Statement and feature cards: ±1° to ±3°. Accent / floating notes: ±5° to ±15° (more dramatic to read as 'casually applied'). Rotations alternate direction across adjacent notes."
  feature-icon:
    width: 60px
    height: 60px
    border: "3px solid {colors.ink}"
    borderRadius: "50%"
    fontFamily: "'Shrikhand', cursive"
    fontSize: 1.5rem
    description: "Round ink-bordered icon containing a single character (letter, number, or symbol) in Shrikhand display. Used as a category marker at the top of feature post-its."
  versus-circle:
    width: 60px
    height: 60px
    background: "{colors.ink}"
    color: "{colors.paper}"
    borderRadius: "50%"
    fontFamily: "'Shrikhand', cursive"
    fontSize: 1.2rem
    boxShadow: "0 2px 8px {colors.shadow-deep}"
    description: "Ink-filled circle with cream text used between two compare-cards. Centered between the two cards with absolute positioning; reads as a 'vs' / 'and' connector."
  photo-frame:
    background: "#fff"
    padding: "1rem"
    boxShadow: "2px 3px 15px {colors.shadow}"
    rotation: "±1° to ±2°"
    description: "Polaroid-style image frame. White paper with 1rem padding around the inner image area; same drop shadow as post-its; small rotation. The inner image area has a 4:3 aspect ratio."
  chart-canvas:
    background: "#fff"
    padding: "2.5rem"
    boxShadow: "2px 3px 15px {colors.shadow}"
    rotation: "±1°"
    description: "White paper card hosting an inline SVG chart. Same drop shadow as post-its and photo-frames; small rotation. Charts use the post-it color palette for fills."
  stat-row:
    borderBottom: "1px dashed rgba(45, 42, 38, 0.2)"
    padding: "1rem 0"
    description: "A label-and-value row inside a stat post-it. Label in Zilla Slab body color; value in Shrikhand stat-value. Bottom-divider is a dashed ink-alpha hairline."
  doodle:
    opacity: 0.15
    stroke: "{colors.ink}"
    strokeWidth: 3
    description: "Decorative SVG mark placed absolutely in slide corners — a circle, squiggle, triangle, line, or X+ pair. All at 0.15 opacity, all in 3px ink stroke. Slides have 0–2 doodles each."
  timeline-connector:
    height: 60px
    pathStyle: "Q (quadratic) bezier curve at 0.3 opacity, stroke-dasharray '8 4', polygon arrowhead at end"
    description: "Dashed quadratic-bezier line between timeline nodes. Curve direction alternates row to row (concave up, concave down). Always ends with a triangle arrowhead."
  custom-cursor:
    cursor: "URL data-svg red-and-white thumbtack, 24×24, hotspot 12×12"
    description: "Browser cursor replaced with a tiny SVG thumbtack circle (red outer, white center) when hovering over any slide. Reinforces the 'pinning ideas to a board' metaphor."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Scatterbrain is a **Post-it-note-and-cork-board presentation system**. Every content block is a colored sticky note (`{components.post-it}`) layered onto one of three textured background variants — cork board, desk paper, or warm gradient — with red / blue / green / gold thumbtacks pinning the notes and translucent masking tape sometimes added on top. The visual metaphor is total: the deck is a creative-workshop wall, a brainstorming board, or a thinker's desk, and the content is the cluster of sticky notes pinned across it.

The typeface stack pairs three Google Fonts with distinct emotional roles. **Shrikhand** is the display voice — a chunky decorative display serif with playful curves and high contrast. Used at weight 400 (the only weight available) for every headline, statement, feature icon glyph, stat value, and oversized callout. Its loud, friendly personality is the system's primary signal: it reads as hand-lettered marker pen rather than typeset publication. **Zilla Slab** is the body voice — a friendly modern slab serif with humanist proportions. Used at weights 300–700 for body paragraphs, list items, and labels. Its slab serifs match the warm hand-drawn register of Shrikhand without competing for attention. **Caveat** is the hand-script voice — a casual cursive. Used for personal notes, side annotations, label-script eyebrows, stat-divider quips, and any moment that should read as "scribbled on the note in pen."

The color philosophy is **pastel sticky-note palette on tactile paper backgrounds**. Seven sticky-note colors (`yellow`, `blue`, `pink`, `green`, `orange`, `purple`, plus bordered `white`) provide categorical variety; each has a deeper sibling that drives the 135° gradient fill. The ink (`{colors.ink}` — #2d2a26) is a soft warm charcoal rather than pure black, sitting comfortably on warm pastels. Three background variants — cork (`bg-cork`), paper (`bg-paper`), warm gradient (`bg-warm`) — provide tactile variation across slides so the deck doesn't read as monotonous. The pastels are pale enough that ink text remains legible on every sticky-note color without inversion.

Depth comes from **soft drop shadows + small rotations + layered tactile elements** (pins, tape, doodles). The signature treatment: every post-it carries a soft blurred drop shadow (`2px 3px 15px {colors.shadow}`) that suggests a slight lift off the surface, plus a small rotation (±1° to ±15°) that reads as hand-placed rather than grid-snapped. Optional pins (red thumbtacks via `::before`) and tape (translucent white via `::after`) add tactile depth without using box-shadow tricks.

**Density philosophy: medium.** Each slide is anchored by 1–4 sticky notes plus 1–2 accent decorations (floating side-notes, doodles, decorative shapes). A slide with one large centered post-it reads as a manifesto moment; a slide with three feature-cards reads as a layout slide; a slide with one main post-it plus 2–4 small floating accent post-its reads as a hero spread. Crowding the canvas with simultaneous overlapping notes collapses the playful energy into chaos. The correct density is enough notes to feel like a creative-process spread, with enough negative space to read each note clearly.

**Key Characteristics:**
- Three textured background variants: cork (`{components.bg-cork}`), paper (`{components.bg-paper}`), warm gradient (`{components.bg-warm}`). Each slide picks one.
- A fixed SVG grain overlay at 4% opacity sits above all content, reinforcing the paper register.
- Seven sticky-note colors: yellow, blue, pink, green, orange, purple, white-bordered. Each gradient-filled (except orange / purple / white).
- Every post-it carries a soft drop shadow + small rotation. Rotations alternate direction across adjacent notes.
- Red thumbtacks (and blue / green / gold variants) via `::before`. Masking tape via `::after`. Often combined on a single note.
- Display headlines in Shrikhand (chunky display serif). Body in Zilla Slab (friendly slab). Personal annotations in Caveat (casual script).
- Decorative SVG doodles (circles, squiggles, triangles, X marks) live in slide corners at 0.15 opacity.
- Custom thumbtack cursor reinforces the "pinning ideas to a board" metaphor.

## Colors

### Palette

**Sticky-note colors** (gradient-filled or flat):
- **Yellow** (`{colors.yellow}` — #ffe066 → `{colors.yellow-deep}` — #ffd43b): Classic sticky-note yellow. Most common note color. The system's "default" sticky.
- **Blue** (`{colors.blue}` — #a5d8ff → `{colors.blue-deep}` — #74c0fc): Soft sky blue. The system's "secondary" sticky.
- **Pink** (`{colors.pink}` — #ffc9c9 → `{colors.pink-deep}` — #ff9f9f): Soft rose pink. The system's "warm accent" sticky.
- **Green** (`{colors.green}` — #b2f2bb → `{colors.green-deep}` — #8ce99a): Mint green. The system's "cool accent" sticky.
- **Orange** (`{colors.orange}` — #ffcc80): Warm peach-orange. Flat fill, no gradient. Used as a tertiary accent for variety.
- **Purple** (`{colors.purple}` — #d0bfff): Lavender purple. Flat fill, no gradient. Used as a tertiary accent for variety.

**Special note colors**:
- **White** (`#fff`): A bordered white sticky used in timelines and comparisons where a "plain" or "neutral" note is needed. Always carries a 2px ink border because pure white otherwise disappears into the cream/paper backgrounds.

**Paper / surface colors**:
- **Cream** (`{colors.cream}` — #faf8f3): The lightest paper variant. Used inside the `bg-paper` and `bg-warm` background gradients.
- **Paper** (`{colors.paper}` — #f7f5f0): The body background — sits just behind every slide as the page color visible through the bg overlays. Used as the inverted text color on dark ink surfaces.

**Ink / text colors**:
- **Ink** (`{colors.ink}` — #2d2a26): The structural color. All headlines, all body text, all borders, all doodle strokes. Slightly softer than pure black for warmth.
- **Ink Light** (`{colors.ink-light}` — #5c5750): Secondary text color for body paragraphs, captions, and de-emphasized text.

**Shadow tokens**:
- `{colors.shadow}` (rgba(45, 42, 38, 0.15)): Soft drop shadow — used on every post-it.
- `{colors.shadow-deep}` (rgba(45, 42, 38, 0.25)): Stronger contact shadow — used as the second layer of the post-it drop shadow.

### Defaults
- **Default surface background**: pick one of `{components.bg-cork}` / `{components.bg-paper}` / `{components.bg-warm}` per slide. Cork is the default for tactile / wall-of-notes moments; paper for desk / focused-content moments; warm-gradient for hero / atmospheric moments.
- **Default post-it color**: `{components.post-it-yellow}` — yellow is the most-common sticky and reads as the system's baseline.
- **Default headline color**: `{colors.ink}` (#2d2a26) — Shrikhand display in soft warm charcoal on every post-it.
- **Default body text color**: `{colors.ink-light}` (#5c5750) for paragraph body; `{colors.ink}` for list items and emphasized body.
- **Default border color**: `{colors.ink}` for the white-note 2px border and for the feature-icon round border. Most sticky notes have no border (the gradient fill defines them).
- **Default pin color**: `{components.pin}` (red) — the system's "default" thumbtack. Use blue / green / gold variants to match the post-it color underneath when visual variety is needed.
- **Default tape**: applied sparingly — typically on hero / statement post-its where the note feels "officially posted" with both a pin and a strip of tape.
- **Default text color on ink surfaces**: `{colors.paper}` (#f7f5f0).
- **Default decorative doodle color**: `{colors.ink}` at 0.15 opacity, 3px stroke.

The seven sticky-note colors have **no fixed semantic meaning** — yellow is not "warning," green is not "success." They serve as a categorical palette where the choice signals "which note in the cluster is this." Cycle through colors for visual variety; pair gradient-filled notes (yellow, blue, pink, green) with flat-filled notes (orange, purple) for textural variation.

## Typography

### Font Family
The system has three Google Fonts each with a distinct role:

- **Shrikhand** (display): A chunky decorative display serif with high stroke contrast, playful curves, and a hand-lettered marker-pen feel. Single weight (400). Used for every display moment — headlines, statements, titles, feature-icon glyphs, stat values, versus-circle text. Its loud personality is the system's primary identity; substituting another display serif loses the workshop voice.
- **Zilla Slab** (body): A friendly modern slab serif with humanist warmth. Multi-weight (300–700, with italic variants 300 and 400). Used at weight 400 for body paragraphs (the default), 300 for the lightest captions, 500–700 for emphasis. The slabs read as warm-handed rather than mechanical.
- **Caveat** (hand-script): A casual cursive with multiple weights (400–700). Used for personal notes, side annotations, label-script eyebrows (uppercase tracked 0.15em), closing-slide sign-offs, decorative quips inside stat-divider rows.

Italic exists for Zilla Slab (300 and 400 italic) but is rarely used — emphasis comes from weight switching or face switching, not from italics. Underline is not used.

### Type Scale

| Token | Size (clamp) | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.display-hero}` | 2.5–4.5rem | Shrikhand | 400 | Cover or closing oversized headline |
| `{typography.statement}` | 2–3.5rem | Shrikhand | 400 | Centered statement or pulled quote |
| `{typography.headline}` | 1.8–3rem | Shrikhand | 400 | Primary slide headline / section headline |
| `{typography.title}` | 1.3–1.8rem | Shrikhand | 400 | Sub-region or card title |
| `{typography.caption-subtitle}` | 1.3rem | Zilla Slab | 400 | Slide subtitle below a hero headline |
| `{typography.body}` | 1–1.25rem | Zilla Slab | 400 | Standard paragraph body |
| `{typography.list-item}` | 1.1rem | Zilla Slab | 400 | Bulleted / check-marked list row |
| `{typography.handwritten}` | 1.2–1.6rem | Caveat | 400 | Decorative quip, personal note |
| `{typography.handwritten-lg}` | 1.4–2rem | Caveat | 600 | Larger handwritten subtitle |
| `{typography.handwritten-sm}` | 1.2–1.4rem | Caveat | 500 | Small accent label |
| `{typography.label-script}` | 0.9rem | Caveat | 400 | Tracked-caps eyebrow label |
| `{typography.stat-value}` | 1.8rem | Shrikhand | 400 | Numerical value in a stat-row |

### Defaults
- **Default size for a primary section headline (inside a post-it)**: `{typography.headline}` (1.8–3rem clamp) in Shrikhand.
- **Default size for a cover or closing oversized headline**: `{typography.display-hero}` (2.5–4.5rem clamp).
- **Default size for a centered manifesto / pulled-quote statement**: `{typography.statement}` (2–3.5rem clamp).
- **Default size for paragraph body**: `{typography.body}` (1–1.25rem clamp) in Zilla Slab 400.
- **Default size for list rows (bulleted, check-marked, or compare-list)**: `{typography.list-item}` (1.1rem) in Zilla Slab 400.
- **Default size for a side note or quip**: `{typography.handwritten}` (1.2–1.6rem clamp) in Caveat 400.
- **Default size for an eyebrow label above a card headline**: `{typography.label-script}` (0.9rem) in Caveat, uppercase, 0.15em tracking.
- **Default size for a stat value**: `{typography.stat-value}` (1.8rem) in Shrikhand.
- **Default weight for Shrikhand**: 400 (the only weight).
- **Default weight for Zilla Slab body**: 400. For emphasized body: 500–700. For light captions: 300.
- **Default weight for Caveat**: 400 for casual notes; 500–700 for emphasis.

When unsure between `{typography.headline}` and `{typography.title}` for a card's primary text, reach for `{typography.headline}` if the card is the slide's dominant element; reach for `{typography.title}` if it is one of several smaller cards.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every display headline is set in Shrikhand.** Substituting Zilla Slab or another display face loses the workshop voice. Even small titles (1.3rem) inside feature cards use Shrikhand.
- **Every body paragraph and list item is set in Zilla Slab.** Setting body in Shrikhand reads as overproduced and unreadable.
- **Every casual / personal note is set in Caveat.** This includes side notes, decorative quips ("Jot it down before you forget!", "OK", ":)"), and stat-divider personal observations. Switching to italic Zilla loses the hand-drawn voice.
- **Every label-script eyebrow is uppercase with 0.15em tracking.** Caveat at normal tracking reads as a body cursive; the uppercase + tracking turns it into a categorical label.
- **Every feature-icon round border is 3px ink with a Shrikhand glyph inside.** Variations (2px border, sans-serif glyph) break the icon's visual signature.
- **Every post-it that hosts a primary headline gets a thumbtack pin via `::before`.** A pinless headline-post-it reads as floating and undefined.
- **Every hero / statement post-it carries both a pin and a strip of tape** (`.pin .tape` classes together). This is the system's "officially posted" treatment for the most-emphasized note.

### Typography Principles
The system's typographic rhythm comes from **three-face contrast**: Shrikhand display (loud, decorative, friendly serif) → Zilla Slab body (steady, readable, slab serif) → Caveat hand-script (personal, casual, cursive). A slide that uses only one face reads as monotonous; a slide that combines all three reads as workshop-correct.

Line-height: tight on display (1.1), generous on body (1.6–1.7), moderate on hand-script (1.3–1.4). Letter-spacing on display is subtly positive (0.02em) which gives Shrikhand a touch more openness than its default; body has no tracking; hand-script labels carry 0.15em uppercase tracking.

## Layout

### Canvas System
The system targets `100vw × 100vh`. Each `.slide` is absolutely positioned to fill the viewport with `display: none` by default; the `.active` slide is `display: flex` centered. Navigation is JS-driven via arrow keys, space, PageUp/Down, Home/End, touch swipe, and mouse wheel (with 700ms lock to prevent multi-skip).

### Slide Composition Patterns
The system supports several composition patterns without prescribing layouts:
- **Centered single-card**: one large post-it (statement, closing, RSVP-style).
- **2-column or 3-column grid**: aligned grid of post-its with small rotations.
- **Chart + legend**: a white chart-card on one side, a colored post-it legend on the other.
- **Image + text**: a polaroid-style photo-frame on one side, a text-post-it cluster on the other.
- **Free cluster**: a hero post-it surrounded by 2–4 small accent post-its at various rotations and positions.
- **Timeline rows**: alternating left/right node + dashed-curve connector + content card per row.
- **Compare**: two post-its side by side with a centered ink versus-circle between them.

In every pattern, individual post-its sit on one of the three background textures with small rotations and decorative doodle marks in unoccupied corners.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.slide-pad}` | 3rem | Slide outer padding |
| `{spacing.post-it-pad-lg}` | 3rem 4rem | Hero / title post-it interior padding |
| `{spacing.post-it-pad-statement}` | 3.5rem 4rem | Statement post-it interior padding |
| `{spacing.post-it-pad-md}` | 2.5rem | Standard post-it interior padding |
| `{spacing.post-it-pad-sm}` | 1.5rem | Small accent post-it interior padding |
| `{spacing.gap-lg}` | 3rem | Multi-column grid gap |
| `{spacing.gap-md}` | 2.5rem | Feature grid gap |
| `{spacing.gap-sm}` | 2rem | Timeline row gap |

### Persistent Chrome
The system has no persistent slide chrome — no progress bar, no slide counter, no nav hint. The custom thumbtack cursor is the only persistent visual signal. Navigation is purely keyboard / swipe / wheel driven.

## Depth and Elevation

### Soft Drop Shadow (Primary Technique)
The system's defining depth treatment is the **soft drop shadow** on every post-it, photo-frame, chart-card, and diagram-canvas: `2px 3px 15px {colors.shadow}, 0 1px 3px {colors.shadow-deep}`. The 15px-blur outer shadow with 2px horizontal and 3px vertical offset suggests the note hovers slightly above the cork or paper surface. The 1px-blur inner shadow with 1px vertical offset adds the contact shadow at the bottom edge. Together they read as "lifted note pinned to a board."

This is the **only system that defines depth via soft blurred shadows** — most other templates in this library prohibit them. Scatterbrain embraces them because the visual metaphor depends on the tactile lift of a paper note off a textured surface.

### Rotation (Secondary Technique)
Every post-it carries a small rotation (±1° to ±15°). Hero / statement / feature post-its take small rotations (±1° to ±3°); accent / floating / closing-cluster post-its take larger rotations (±5° to ±15°). Rotations alternate direction across adjacent notes so the cluster reads as casually applied, not grid-snapped.

### Tactile Layering (Pins + Tape)
Optional layered marks on individual post-its provide additional depth:
- **Pin** (`{components.pin}`) — a 16px round red thumbtack via `::before` at the top-center of the note. The radial-gradient highlight + inset shadow + drop shadow make it read as a 3D bead.
- **Tape** (`{components.tape}`) — an 80×25px translucent white tape strip via `::after` at the top-center, slightly rotated.

Pins and tape can combine on a single note (the `.pin.tape` class pair). Color variants of pins (`pin-blue`, `pin-green`, `pin-gold`) match the underlying note color for visual cohesion.

### Background Texture (Atmospheric Layer)
The three background variants (`bg-cork`, `bg-paper`, `bg-warm`) and the full-viewport grain overlay (`{components.grain-overlay}` at 4% opacity) provide the foundational textural ground. Without the background variants the deck reads as floating notes on white; with them, the deck reads as physically grounded on cork, desk paper, or morning light.

## Shapes and Treatment

### Border Radius
| Value | Use |
|---|---|
| 0px | All post-its, chart-cards, photo-frames, diagram-canvases, compare-cards |
| 50% (circle) | Feature-icon round border, versus-circle, thumbtack pins |
| 3px | Chart bar `<rect>` corner radius (inline SVG) |
| Custom (no fixed token) | Photo-frame inner image area follows the polaroid aspect ratio 4:3 |

Most surfaces are strict rectangles. Round shapes are reserved for icons, pins, and the versus-marker. The chart bars carry a subtle 3px round corner (inside SVG) for friendliness.

### Border Weights
- **2px solid `{colors.ink}`** — used on the white-note border and on chart SVG `<rect>` strokes.
- **3px solid `{colors.ink}`** — used on feature-icon round border and on doodle SVG paths.
- **1px dashed rgba(ink, 0.2)** — used as stat-row hairline divider.
- **1px solid rgba(ink, 0.1)** — used as compare-list row divider.

Borders are universally ink (warm charcoal). Colored borders do not appear.

### Decorative Element Types

**Post-it** (`{components.post-it}`) — Colored sticky-note in one of seven variants (yellow, blue, pink, green, orange, purple, bordered-white). Padding from the `{spacing.post-it-pad-*}` scale. Always carries the soft drop shadow. Almost always carries a small rotation. Usually carries a pin and sometimes tape.

**Pin** (`{components.pin}`) — Red thumbtack via `::before`. Default color red; variants blue, green, gold. Sits at top-center of the note.

**Tape** (`{components.tape}`) — Translucent white masking-tape mark via `::after` at top-center of the note, slightly rotated.

**Feature icon** (`{components.feature-icon}`) — 60px round ink-bordered circle with a Shrikhand glyph (single character) inside. Used at the top of feature post-its as a category marker.

**Versus circle** (`{components.versus-circle}`) — Ink-filled circle with cream Shrikhand text, centered between two compare-post-its with absolute positioning. Carries its own drop shadow.

**Photo frame** (`{components.photo-frame}`) — Polaroid-style white card with 1rem padding around a 4:3 inner image area. Same drop shadow as post-its; small rotation.

**Chart canvas** (`{components.chart-canvas}`) — White card hosting an inline SVG chart. Same drop shadow as post-its; small rotation. SVG charts use the post-it color palette (yellow, blue, pink, green) for bars / segments. Axis labels in Zilla Slab; value labels in Caveat.

**Diagram canvas** — White card hosting a circular donut / pie SVG. Same treatment as chart canvas. SVG segments use post-it palette; legend rows use ink text.

**Stat row** (`{components.stat-row}`) — Label-value row inside a stat post-it. Zilla Slab label + Shrikhand stat-value, separated by a dashed ink-alpha bottom border.

**Timeline node + connector** — Each timeline row has a left post-it (timeline node with phase-label Caveat caption) + a center dashed-bezier SVG connector + a right white-bordered post-it (timeline content body). Row direction alternates (left/right) via `flex-direction: row-reverse` on even rows.

**Doodle SVG** (`{components.doodle}`) — Decorative SVG mark placed absolutely in slide corners: circle, squiggle, triangle, line, X+ pair. 3px ink stroke at 0.15 opacity. Slides have 0–2 doodles each.

**Custom cursor** — SVG thumbtack cursor (red outer circle + white center) replaces the default cursor when hovering over slides.

## Do's and Don'ts

### Do
- Pick a background variant per slide: `{components.bg-cork}` for "wall of notes" energy, `{components.bg-paper}` for "desk surface" focus, `{components.bg-warm}` for "morning light" atmosphere. Vary across slides for tactile variety.
- Keep the SVG grain overlay (`{components.grain-overlay}`) on every slide at 4% opacity. It is the texture that ties the deck to its paper register.
- Use Shrikhand for every display moment (headlines, titles, feature icons, stat values) and Zilla Slab for every body paragraph and list item.
- Use Caveat for casual / personal notes — side annotations, decorative quips ("Jot it down before you forget!", ":)"), and label-script eyebrows. The hand-script is the system's most distinctive voice.
- Give every post-it a small rotation (±1° to ±15°). Alternate rotation direction across adjacent notes; nothing should align to a grid.
- Apply the standard soft drop shadow (`2px 3px 15px shadow, 0 1px 3px shadow-deep`) to every post-it, photo-frame, chart-card, and diagram-canvas.
- Pin every primary post-it with a red thumbtack via `::before`. Use color-matched pin variants (blue / green / gold) when the post-it color suggests it.
- Combine pin + tape on hero / statement post-its for the "officially posted" treatment.
- Place small SVG doodles (circles, squiggles, triangles) in slide corners at 0.15 opacity as decorative punctuation. 1–2 doodles per slide is plenty.
- Cycle through post-it colors (yellow → blue → pink → green → orange → purple) for visual variety in multi-card grids. Don't repeat one color across all cards.

### Don't
- Don't omit background textures and let post-its float on a plain white viewport. The textured backgrounds are the system's foundational visual ground.
- Don't substitute another display face for Shrikhand. The chunky decorative serif is the system's identity; replacing it with a sans or another serif loses the workshop voice.
- Don't substitute another script face for Caveat. The casual cursive voice anchors the "scribbled by hand" register.
- Don't use Zilla Slab for headlines or Shrikhand for body paragraphs. The pairing is locked: Shrikhand display + Zilla Slab body + Caveat script.
- Don't assign semantic meaning to post-it colors (yellow = warning, green = good). The colors are categorical only.
- Don't rotate post-its more than ±15°. Beyond that, hand-placed becomes wonky.
- Don't rotate every post-it in the same direction. Alternate ±directions across adjacent notes; uniformity reads as tilted-canvas, not hand-placement.
- Don't use pure white as a post-it fill without the 2px ink border. White-on-cream backgrounds becomes invisible.
- Don't omit the pin on a headline post-it. Pinless headlines read as floating and undefined.
- Don't crowd a slide with overlapping post-its. The playful energy collapses when notes pile up; the correct density is 1–4 main notes plus 1–2 small accent / floating notes.

## Responsive Behavior

The system targets `100vw × 100vh` and uses `clamp()` throughout for fluid scaling. A single media query at `max-width: 900px` reflows multi-column grids and timelines to single-column, neutralizes some rotations (versus-circle becomes inline rather than absolute), and stacks compare-cards vertically.

### Scaling Behavior
- Display headlines scale via `clamp(2.5rem, 5vw, 4.5rem)` patterns — fluid between minimum and maximum.
- Body text scales from 1rem at minimum to 1.25rem at maximum.
- Post-it padding does not scale by viewport — fixed at the values in the spacing scale.
- Drop shadows, pin sizes, tape sizes, and decorative SVG sizes are fixed regardless of viewport.

### Presenter Behavior
- Slides advance via `ArrowRight`, `ArrowDown`, `Space`, or `PageDown`.
- Slides reverse via `ArrowLeft`, `ArrowUp`, or `PageUp`.
- `Home` jumps to first, `End` to last.
- Touch swipe horizontal advances/reverses on mobile.
- Mouse wheel advances/reverses, locked for 700ms between scrolls to prevent multi-skip on trackpads.
- The custom thumbtack cursor reinforces the metaphor on every hover.

### Print Behavior
A `@media print` rule sets `page-break-after: always` on each slide with `min-height: 100vh`. Printing produces a sequential page-per-slide output.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin | Chinese | Weight mapping |
|---|---|---|---|
| Display / Headline / Statement / Title / Stat-value / Feature-icon glyph | Shrikhand (400) | **站酷快乐体 ZCOOL KuaiLe** | regular (single weight) |
| Body / List-item / Caption-subtitle | Zilla Slab (400) | **悠哉字体 Yozai** | regular |
| Hand-script (Caveat) — Latin only | Caveat (400 / 500 / 600) | *(no CJK substitute)* | n/a |

### Mixed-Content Strategy

**Strategy A — display CJK + body CJK, each with its own personality.** Scatterbrain's whole register is playful-tactile-warmth, and the Chinese pairing should land in the same emotional register. **ZCOOL KuaiLe (站酷快乐体)** is a chunky decorative display face with rounded curves and a hand-drawn marker-pen feel — it is the closest CJK match for Shrikhand's chunky decorative serif voice. Both faces share the "loud and friendly" personality that defines the workshop-board aesthetic. **Yozai (悠哉字体)** is a warm rounded body face derived from M+ Rounded — it carries the same friendly humanist quality as Zilla Slab's slab serif, with soft terminals that feel like written notes rather than typeset text. Together the two CJK faces preserve the playful-chunky-display + warm-friendly-body rhythm that makes Scatterbrain's voice work.

### Loading

```html
<link href="https://chinese-fonts-cdn.deno.dev/packages/zcool-kuaile/dist/ZCOOLKuaiLe-Regular/result.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/cn-fontsource-yozai-regular/font.css" rel="stylesheet">
```

Then append the CJK families to the appropriate font stacks:
```css
/* Display roles */
font-family: 'Shrikhand', 'ZCOOL KuaiLe', cursive;
/* Body roles */
font-family: 'Zilla Slab', 'Yozai', serif;
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

- **The 0.02em positive tracking on Shrikhand display must drop to 0** on ZCOOL KuaiLe. Tracked Chinese display characters look broken.
- **Display line-height should open from 1.1 to 1.2–1.3** for ZCOOL KuaiLe — the rounded chunky strokes need more vertical breathing.
- **Feature-icon round borders work beautifully with a single Chinese character** (新, 巧, 趣) inside the 60px circle at ZCOOL KuaiLe. The chunky display weight makes the single character read as a stamped category mark.
- **Versus circles work with short Chinese words** (对比, 与) at smaller display weight; the cream-on-ink contrast carries through.
- **The label-script Caveat eyebrow (uppercase tracked 0.15em) becomes the trickiest translation.** Options: (1) keep eyebrows in Latin (`CHAPTER ONE`, `THE SETUP`) for the hand-script signature; (2) replace with a Yozai eyebrow at 0.9rem, no tracking, no uppercase — which loses the categorical-label affordance. Option (1) preserves the system's most distinctive small voice and works well when the Latin eyebrow sits above a Chinese headline (the deck reads as a Chinese article with an English kicker, which is a common editorial convention).
- **Personal notes / decorative quips in Caveat (`Jot it down before you forget!`, `:)`) should stay Latin** — the casual ballpoint script has no acceptable Chinese substitute. On Chinese-primary slides, treat hand-script moments as Latin margin notes; this can actually deepen the workshop voice (the deck reads as a Chinese brainstorm with English asides, which is plausible for any modern Chinese creative team).
- **Post-it pins, tape, drop shadows, rotations, custom cursor, doodle SVGs, background textures** are all glyph-agnostic — they carry the playful-tactile system equally well behind Chinese content.
- **Stat-row label-and-value pattern** works cleanly with Chinese labels (用户数量, 转化率) in Yozai and Latin numerical values in ZCOOL KuaiLe.

### Known CJK Gap

Caveat — the system's most distinctive voice (the casual ballpoint hand-script that anchors every personal note) — has no CJK equivalent. There are handwritten-style Chinese web fonts (悠果手写体, 站酷庆科黄油体), but the cultural register of casual cursive handwriting differs sharply between Latin and CJK traditions, and no Chinese face will read as "the same voice as Caveat." The recommended workaround is to retain Caveat for Latin margin annotations even on otherwise-Chinese slides — the Chinese-body-with-English-handwriting pattern is common in modern Chinese editorial design and lands as authentic rather than as a translation gap.

## Iteration Guide

1. Every new slide picks one of three background variants (`{components.bg-cork}`, `{components.bg-paper}`, `{components.bg-warm}`). Vary across slides for tactile variety.
2. Every new content block is a post-it in one of seven colors (yellow, blue, pink, green, orange, purple, bordered-white). Yellow is the default; cycle through colors for multi-card variety.
3. Every new post-it carries a small rotation. Hero / statement post-its: ±1–3°. Accent / floating post-its: ±5–15°. Alternate directions across neighbors.
4. Every new post-it carries the standard soft drop shadow (`2px 3px 15px shadow, 0 1px 3px shadow-deep`).
5. Every new primary post-it carries a pin via `::before` (red default; blue / green / gold variants for color cohesion).
6. Hero / statement / closing post-its add a tape strip via `::after` for the "officially posted" treatment.
7. Headlines use Shrikhand at sizes from `{typography.title}` (1.3rem) for small card titles up to `{typography.display-hero}` (4.5rem) for cover/closing. Body uses Zilla Slab. Personal notes use Caveat.
8. Feature post-its open with a 60px round ink-bordered feature-icon containing a single Shrikhand character (A/B/C, 1/2/3, !/✓/✗).
9. Decorative SVG doodles (circles, squiggles, triangles, X marks) live in 1–2 unoccupied corners per slide at 0.15 opacity, 3px ink stroke.
10. Charts and diagrams sit inside a white chart-canvas (`{components.chart-canvas}`) with the same drop shadow + small rotation as post-its. SVG fills use the post-it palette (yellow, blue, pink, green).

## Known Gaps

- The system loads three Google Fonts (Shrikhand, Zilla Slab, Caveat). Shrikhand is single-weight (400 only); attempting a heavier weight will fall back. Self-hosting is recommended for production.
- The custom SVG thumbtack cursor (`{components.custom-cursor}`) does not render on all browsers identically — Safari and Firefox may scale or position the cursor hotspot differently than Chrome. On touch-only devices the cursor is irrelevant.
- The background textures (`bg-cork`, `bg-paper`, `bg-warm`) use combinations of CSS gradients and inline SVG data-URI patterns. Rendering is consistent across modern browsers but the tonal warmth varies slightly with screen color profiles.
- Pins (`::before`) and tape (`::after`) consume both pseudo-element slots on a post-it. If additional decorative marks are needed (a corner curl, a stain, etc.), they would require a real child element instead of pseudo-elements.
- The soft drop shadow on every post-it adds rendering overhead. Slides with 10+ post-its may show slight shadow rendering lag on lower-end devices.
- The custom cursor and absolute-positioned pins / tape do not interact with screen readers as expected. The decorative elements should remain hidden from assistive tech.
- Inline SVG charts (bar, donut, pie) are hardcoded — bar heights, segment paths, and labels are baked into the SVG. There is no data-binding layer; new chart values require manual SVG path / position recalculation.
- The custom cursor (red thumbtack) appears on every slide including text-heavy ones, which may be visually noisy when users are reading body paragraphs. Treat the cursor as a deck-wide accent, not a per-slide affordance.
- The mouse-wheel navigation lock (700ms) is unusual and may surprise users expecting smooth-scroll. Trackpad users especially may find the wheel-step behavior counter-intuitive.
