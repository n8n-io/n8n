---
version: alpha
name: Long Table
description: A warm, single-ink editorial system in the register of a supper-club poster, a small-batch zine, or a Risograph-printed program. The entire system runs in one ink color — a warm rust terracotta (#B53D2A) — on a buttery cream paper ground (#FAF1E2), with a subtle 4px radial-dot texture overlay giving the surface its "printed paper" quality. Display type runs in Bricolage Grotesque at weight 700–800 in uppercase; body and metadata run in Fraunces serif at weight 400–600 with optical-size axis engaged. Pill buttons, outlined edition badges, italic-edition numerals, and dashed/solid 1.5px borders complete the printed-program vocabulary.

colors:
  paper: "#FAF1E2"
  paper-d: "#F2E5CF"
  paper-vd: "#E8D7B6"
  ink: "#B53D2A"
  ink-dp: "#8E2D1F"
  rule: "#B53D2A"
  ink-32: "rgba(181, 61, 42, 0.32)"
  ink-78: "rgba(181, 61, 42, 0.78)"
  ink-50: "rgba(181, 61, 42, 0.5)"

color-aliases:
  rule: ink
  ink-32-canonical: "Same ink #B53D2A at 32% opacity, used for dashed dividers and subtle internal rules"
  ink-78-canonical: "Same ink #B53D2A at 78% opacity, used for de-emphasized metadata"

typography:
  display-jumbo-numeral:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(180px, min(22vw, 38vh), 480px)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: -0.02em
    fontStyle: italic
  display-cover:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(82px, min(8.8vw, 15vh), 180px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: -0.012em
    textTransform: uppercase
  display:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(72px, min(7.6vw, 13vh), 160px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.012em
    textTransform: uppercase
  headline-xl:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(60px, min(6.4vw, 10.5vh), 140px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.012em
    textTransform: uppercase
  headline:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(56px, min(6vw, 10vh), 120px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.012em
    textTransform: uppercase
  headline-md:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(48px, min(5vw, 8.4vh), 100px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: -0.012em
    textTransform: uppercase
  quote:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(40px, min(4.4vw, 7.4vh), 96px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -0.012em
    textTransform: uppercase
  card-title:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(28px, 2.4vw, 44px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: -0.008em
    textTransform: uppercase
  course-name:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(20px, 1.5vw, 28px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.005em
    textTransform: uppercase
  info-value:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(20px, 1.6vw, 28px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.005em
    textTransform: uppercase
  edition-label-tracked:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(15px, 1.1vw, 18px)"
    fontWeight: 700
    letterSpacing: 0.18em
    textTransform: uppercase
  who-tag:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(15px, 1.05vw, 18px)"
    fontWeight: 700
    letterSpacing: -0.005em
    textTransform: uppercase
  body-serif-italic-lg:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(20px, 1.5vw, 28px)"
    fontWeight: 400
    lineHeight: 1.45
    fontStyle: italic
  body-serif-italic:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(17px, 1.2vw, 22px)"
    fontWeight: 400
    lineHeight: 1.5
    fontStyle: italic
  body-roman:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(15px, 1vw, 17px)"
    fontWeight: 400
    lineHeight: 1.45
  edition-label:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(20px, 1.6vw, 30px)"
    fontWeight: 400
    lineHeight: 1
    fontStyle: italic
  tagline:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(18px, 1.4vw, 26px)"
    fontWeight: 400
    lineHeight: 1.35
    fontStyle: italic
  stats:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(17px, 1.2vw, 22px)"
    fontWeight: 400
    lineHeight: 1.4
    fontStyle: italic
  pill-text:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(15px, 1.1vw, 20px)"
    fontWeight: 400
    lineHeight: 1
    fontStyle: italic
  meta-tag:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(14px, 0.95vw, 16px)"
    fontWeight: 400
    lineHeight: 1.4
    fontStyle: italic
  info-key:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(14px, 0.95vw, 16px)"
    fontWeight: 400
    letterSpacing: 0.16em
    textTransform: uppercase
    fontStyle: italic
  pagenum:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(14px, 0.95vw, 16px)"
    fontWeight: 400
    letterSpacing: 0.02em
    fontStyle: italic
  nav-hint:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(11px, 0.78vw, 13px)"
    fontWeight: 400
    letterSpacing: 0.02em
    fontStyle: italic

spacing:
  slide-pad-h-default: "clamp(60px, 5vw, 110px)"
  slide-pad-h-wide: "clamp(80px, 7vw, 160px)"
  slide-pad-h-narrow: "clamp(120px, 12vw, 280px)"
  slide-pad-top-default: "clamp(96px, 10vh, 160px)"
  slide-pad-top-cover: "clamp(60px, 6vh, 100px)"
  slide-pad-bottom-default: "clamp(110px, 11vh, 170px)"
  slide-pad-bottom-wide: "clamp(150px, 14vh, 220px)"
  gap-section: "clamp(28px, 3vh, 50px)"
  gap-content: "clamp(18px, 2vh, 32px)"
  gap-row: "clamp(14px, 1.6vh, 24px)"
  gap-tight: "clamp(10px, 1.2vh, 18px)"
  border-weight: "1.5px"
  rule-dashed-color: "{colors.ink-32}"

canvas:
  width: 100vw
  height: 100vh

components:
  pill:
    description: "Outlined rounded-rectangle (border-radius 999px → fully pill) holding short italic Fraunces text. The system's CTA / action button. Border is 1.5px solid {colors.ink}; padding is generous (~12px / 28px); text-color is {colors.ink}."
    border: "1.5px solid {colors.ink}"
    borderRadius: "999px"
    padding: "clamp(8px, 1vh, 14px) clamp(20px, 2vw, 32px)"
    typography: "{typography.pill-text}"
  pill-divider:
    typography: "{typography.pill-text}"
    opacity: 0.7
    description: "A small italic Fraunces divider character (typically · or /) used inline between adjacent pills."
  ed-badge:
    description: "A small circular outlined badge (~38px) holding a single italic Fraunces digit. The edition / chapter ordinal marker. Border is 1.5px solid {colors.ink}; background is transparent."
    width: "clamp(34px, 2.6vw, 44px)"
    height: "clamp(34px, 2.6vw, 44px)"
    border: "1.5px solid {colors.ink}"
    borderRadius: "50%"
  rect-tag:
    description: "Outlined rectangular tag — like the pill but with sharp corners. Holds short italic Fraunces text. Used as a category / status / metadata chip when the pill's roundness isn't appropriate."
    border: "1.5px solid {colors.ink}"
    padding: "clamp(7px, 0.9vh, 12px) clamp(14px, 1.4vw, 22px)"
    typography: "{typography.pill-text}"
  card-outlined:
    description: "A 1.5px ink-outlined rectangular content card. Holds a card-top metadata row (separated below by a 1px @ 32%-opacity rule), a Bricolage card-name, a Fraunces body description, and a meta-row at the bottom (separated above by a 1px dashed @ 32%-opacity rule). The system's primary content card pattern."
    border: "1.5px solid {colors.ink}"
    padding: "clamp(20px, 2vh, 32px) clamp(20px, 1.8vw, 30px)"
    internalDivider-solid: "1px solid {colors.ink-32}"
    internalDivider-dashed: "1px dashed {colors.ink-32}"
  paper-texture:
    description: "Subtle radial-dot texture overlay on the stage. A 4px-tile background-image of 0.5px radial-gradient dots in {colors.ink-50} at 10% opacity. Sits absolutely on the stage with pointer-events disabled, giving the paper its Risograph / printed-stock quality. This is on every slide."
    backgroundImage: "radial-gradient(circle at 1px 1px, {colors.ink-50} 0.5px, transparent 1px)"
    backgroundSize: "4px 4px"
    opacity: 0.1
  topbar-divider:
    description: "A 1.5px ink solid border-bottom under a slide topbar (where a Bricolage headline sits beside a small Fraunces label). The horizontal rule beneath the topbar is the system's universal page-divider device."
    borderBottom: "1.5px solid {colors.ink}"
  pagenum:
    position: "absolute"
    placement: "right: clamp(36px, 3.6vw, 80px); bottom: clamp(40px, 4vh, 64px)"
    typography: "{typography.pagenum}"
    color: "{colors.ink}"
    description: "Italic Fraunces page number at the bottom-right of every slide."
  nav-hint:
    position: "fixed"
    placement: "left: clamp(36px, 3.6vw, 80px); bottom: clamp(40px, 4vh, 64px)"
    typography: "{typography.nav-hint}"
    color: "{colors.ink}"
    opacity: 0.45
    description: "A faint italic Fraunces hint string at the bottom-left of the viewport (e.g. '← → to navigate'). Bonus interactivity affordance."
  ledger-row:
    description: "A horizontal ledger-style row in a calendar/schedule context. Multi-column grid (typical: 80px / 130px / 1.6fr / 0.9fr / auto) with a 1px @ 32%-opacity ink border-bottom. Each cell is a tag, label, or pill. Reads as a guestbook / restaurant-reservation log."
    rowPad: "clamp(11px, 1.3vh, 18px) 0"
    borderBottom: "1px solid {colors.ink-32}"
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Long Table is a **single-ink editorial system** in the register of a supper-club poster, a Risograph zine, or a small-press dinner program. The foundational premise is monochromatic: every visible mark in the system — every headline, every paragraph, every border, every rule, every pill, every page number — is rendered in a single warm rust terracotta ink (`{colors.ink}` — #B53D2A) on a buttery cream paper ground (`{colors.paper}` — #FAF1E2). The only chromatic variation is opacity: the same ink at 100% for primary marks, at 78% for de-emphasized metadata, at 32% for dashed internal dividers, at 10% for the paper-texture dots.

The single-ink constraint is the system's identity. The aesthetic borrows from one-color screen printing, letterpress posters, and Risograph stationery — formats where each additional color is a separate printing pass and therefore a deliberate decision. By committing to one ink, the system achieves the calm authority of a printed object rather than the polish of a digital surface.

A signature **paper-texture overlay** sits on every slide: a 4px-tile radial-dot pattern in 50%-opacity ink at 10% opacity, applied via the `.stage::before` pseudo-element. The dots are invisible at conversational viewing distance but visible up close — they give the cream surface its "printed paper" feel and are an essential part of the design system, not optional decoration.

The typographic stack is a two-face pairing:

- **Bricolage Grotesque** at weights 700 and 800 in **strict uppercase** carries every display moment — covers, headlines, card titles, course names, quote bodies, info values, who-tags. Bricolage is a wide, slightly-condensed grotesque with strong personality; its uppercase set has the impact of a hand-lettered poster. The optical-size axis (`opsz` 12..96) is engaged.
- **Fraunces** at weight 400–600 carries every body paragraph, every metadata field, every pill, every page number, every edition label. **Italic Fraunces is the default body style** — the slanted serif is the system's body voice, lending warmth and editorial personality. Roman Fraunces appears only for specific tight cases (info keys, the description body inside index cards). The optical-size axis (`opsz` 9..144) is engaged for both styles.

A massive **italic Fraunces edition numeral** at up to 480px is the system's signature display anchor — it replaces the hand-drawn illustration that would traditionally fill the cover/featured slide right-half, giving the slide a typographic centerpiece in the same ink as the rest of the page.

Depth is **flat and printed**. There are no shadows, no gradients, no blur, no glow. Elevation is communicated entirely through 1.5px solid ink borders on cards, badges, pills, and tags; 1px solid or 1px-dashed internal dividers at 32% opacity; and the texture overlay's atmospheric quality. The whole system reads as ink soaked into paper.

**Density philosophy: rich-but-curated.** Long Table reads as authoritative when slides carry substantive content — a cover with a hero title plus a tagline plus action pills plus stats plus a big edition numeral; an index slide with a topbar headline plus three rich cards; a menu slide with five course rows with name + description + pairing. The slides are full but never crowded — each region carries one focused element with breathing room around it. A slide that holds only a headline reads as missing-its-program; a slide that holds 8 competing content blocks reads as broken. Reach for one major typographic moment (Bricolage display) anchored by 2–4 supporting groups (cards, pills, ledger rows, info-value pairs) per slide.

**Key Characteristics:**
- One ink color (`{colors.ink}` — warm rust terracotta) on cream paper (`{colors.paper}`). Opacity variants are the only color variation.
- Bricolage Grotesque weight 700–800 uppercase for every display moment; Fraunces 400–600 italic-default for every body and metadata moment.
- Subtle 4px radial-dot paper texture on every slide via `.stage::before` — invisible at distance, present up close.
- Pill buttons (border-radius 999px), edition badges (circular), rect-tags (sharp-cornered), and outlined cards (1.5px solid) — all single-weight ink outlines, no fills.
- A massive italic Fraunces edition numeral (up to 480px) is the system's hero typographic anchor on cover-class slides.
- 1.5px structural borders, 1px @ 32%-opacity solid or dashed internal dividers. No thicker borders, no shadows.
- Page number (italic Fraunces) at every slide's bottom-right; nav-hint (italic Fraunces at 45% opacity) at the bottom-left.
- The system is single-ink by design — adding any second color (a navy, a green, a yellow) shatters the printed-program register.

## Colors

### Palette
- **Paper / Cream** (`{colors.paper}` — #FAF1E2): The dominant warm buttery cream surface. Reads as good-quality paper stock — not white, not beige, somewhere between. The default slide background, and the only background fill the system uses.
- **Paper Dark** (`{colors.paper-d}` — #F2E5CF): A slightly darker cream for secondary surfaces or tonal separation. Available in the token system but used sparingly.
- **Paper Very Dark** (`{colors.paper-vd}` — #E8D7B6): A deeper cream for accent surfaces. Reserved.
- **Ink / Warm Rust Terracotta** (`{colors.ink}` — #B53D2A): The single ink color. Every text run, every border, every rule, every pill outline, every page number — all in this one color. The system's structural and expressive color.
- **Ink Deep** (`{colors.ink-dp}` — #8E2D1F): A deeper rust reserved for emphasis. Available in the token system but used sparingly in the published slides.
- **Rule** (`{colors.rule}` — #B53D2A): An alias for `{colors.ink}` — same hex, used semantically when referring to a rule line.
- **Ink @ 78%** (`{colors.ink-78}` — rgba(181,61,42,0.78)): The ink at 78% opacity. Used for de-emphasized metadata text where slightly lower contrast is desired (e.g., pairing notes in menu rows, meta-tags under quotes).
- **Ink @ 50%** (`{colors.ink-50}` — rgba(181,61,42,0.5)): The ink at 50% opacity. Used inside the paper-texture radial-dot gradient.
- **Ink @ 32%** (`{colors.ink-32}` — rgba(181,61,42,0.32)): The ink at 32% opacity. Used for internal dividers — solid 1px lines and 1px dashed lines inside cards, between ledger rows, between course rows.

### Defaults
- **Default slide background**: `{colors.paper}`. Every slide. There is no alternate surface in this system.
- **Default text color**: `{colors.ink}`. Every text run.
- **Default border color**: `{colors.ink}` at 1.5px solid for structural borders; `{colors.ink-32}` at 1px solid or dashed for internal dividers.
- **Default headline color**: `{colors.ink}`.
- **Default body color**: `{colors.ink}`.
- **Default page-number / nav-hint color**: `{colors.ink}` (full opacity for pagenum; 45% opacity for nav-hint).
- **Default de-emphasized metadata color**: `{colors.ink-78}` — when a small piece of supporting text needs to recede from a primary line.

The palette is intentionally single-ink. There is no "accent color" to reach for — the design language depends on the one-ink constraint. If a moment needs to stand out, scale up the type (Bricolage 800 at 180px) or reach for the italic Fraunces edition numeral; do not introduce a second color.

## Typography

### Font Family
The system loads exactly two web fonts from Google Fonts, both with optical-size axes:

- **Bricolage Grotesque** with `opsz` 12..96 and weights 400, 600, 700, 800. **In the published slides, only 700 and 800 are used.**
- **Fraunces** with `opsz` 9..144, both roman and italic styles, weights 400, 500, 600. **In the published slides, all three weights of italic and weight 400/600 of roman are used.**

The two-face role split is strict: **Bricolage uppercase carries every display moment** (covers, headlines, card titles, course names, quote bodies, info values, who-tags, edition labels with tracking). **Fraunces italic carries every body moment** (paragraphs, leads, metadata, taglines, pills, page numbers, info keys, edition labels without tracking). **Fraunces roman** is reserved for specific tight roles (info keys in info-rows where italic tracking would feel out of place, and the description body inside index cards where roman is more readable).

The optical-size axis is critical: the same Fraunces face renders with subtly different letterforms at 14px metadata sizes versus 480px hero-numeral sizes — small sizes pick up sturdier strokes; large sizes pick up finer detail. Self-hosted fallbacks without `opsz` will lose this quality.

### Display, Body, and Chrome Scale

| Token | Size | Family | Weight / Style | Use |
|---|---|---|---|---|
| `{typography.display-jumbo-numeral}` | up to 480px | Fraunces | 400 italic | Hero edition numeral (cover-class typographic anchor) |
| `{typography.display-cover}` | up to 180px | Bricolage | 800 uppercase | Cover-scale Bricolage title |
| `{typography.display}` | up to 160px | Bricolage | 800 uppercase | Section-opener / manifesto headline |
| `{typography.headline-xl}` | up to 140px | Bricolage | 800 uppercase | Featured-edition title |
| `{typography.headline}` | up to 120px | Bricolage | 800 uppercase | Topbar headline on index / calendar slides |
| `{typography.headline-md}` | up to 100px | Bricolage | 800 uppercase | Menu / programme title |
| `{typography.quote}` | up to 96px | Bricolage | 700 uppercase | Pull-quote / testimonial body |
| `{typography.card-title}` | up to 44px | Bricolage | 800 uppercase | Title inside an outlined card |
| `{typography.course-name}` | up to 28px | Bricolage | 700 uppercase | Course / item name in a ledger row |
| `{typography.info-value}` | up to 28px | Bricolage | 700 uppercase | Value in a key/value info row |
| `{typography.edition-label-tracked}` | up to 18px | Bricolage | 700 uppercase / 0.18em | Big-edition label beneath a hero numeral |
| `{typography.who-tag}` | up to 18px | Bricolage | 700 uppercase | Attribution name in a quote row |
| `{typography.body-serif-italic-lg}` | up to 28px | Fraunces | 400 italic | Lead paragraph in a manifesto / letter |
| `{typography.body-serif-italic}` | up to 22px | Fraunces | 400 italic | Standard body paragraph / lede |
| `{typography.body-roman}` | up to 17px | Fraunces | 400 roman | Card description body (tighter setting for legibility at small size) |
| `{typography.edition-label}` | up to 30px | Fraunces | 400 italic | "EDITION N." italic label beside an edition badge |
| `{typography.tagline}` | up to 26px | Fraunces | 400 italic | Tagline / subtitle beneath a cover title |
| `{typography.stats}` | up to 22px | Fraunces | 400 italic | Stats line ("N seats · M cities · L hours") |
| `{typography.pill-text}` | up to 20px | Fraunces | 400 italic | Text inside a pill button or rect-tag |
| `{typography.meta-tag}` | up to 16px | Fraunces | 400 italic | Card metadata (city tag, num tag, seats tag, date tag) |
| `{typography.info-key}` | up to 16px | Fraunces | 400 italic / 0.16em / UPPER | Key in a key/value info row |
| `{typography.pagenum}` | up to 16px | Fraunces | 400 italic | Page number at the bottom-right of every slide |
| `{typography.nav-hint}` | up to 13px | Fraunces | 400 italic / 45% opacity | Navigation hint at the bottom-left of the viewport |

### Defaults
- **Default size for a primary slide headline**: `{typography.headline}` (up to 120px) in Bricolage 800 uppercase.
- **Default size for a cover-scale title**: `{typography.display-cover}` (up to 180px).
- **Default size for the hero typographic anchor on cover-class slides**: `{typography.display-jumbo-numeral}` (italic Fraunces up to 480px) — the system's signature hero element.
- **Default size for a body paragraph**: `{typography.body-serif-italic}` (up to 22px) in italic Fraunces.
- **Default size for a lede paragraph**: `{typography.body-serif-italic-lg}` (up to 28px).
- **Default size for body text inside a card**: `{typography.body-roman}` (up to 17px) in **roman** Fraunces — the roman is more readable at small sizes than italic.
- **Default size for an "EDITION N." label**: `{typography.edition-label}` (up to 30px) in italic Fraunces, paired with an `{components.ed-badge}` circular ordinal.
- **Default weight for any Bricolage display moment**: 800. (Weight 700 is reserved for the quote body and course/who-tag elements; weight 800 is the primary display weight.)
- **Default weight for any Fraunces body moment**: 400.

When unsure, reach for `{typography.headline}` (up to 120px) for a routine slide headline. The 140–180px tier is for featured-edition titles and covers; the 160px tier is for section openers. Use the jumbo edition numeral when the slide is a cover-class moment and needs a hero anchor.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every Bricolage display element is UPPERCASE with negative letter-spacing (-0.005em to -0.012em).** A sentence-case Bricolage headline does not exist in this system. The uppercase + negative-tracking + weight 800 combination is the system's display voice.
- **Every Fraunces body element is italic by default.** Roman Fraunces appears only for specific tight cases (info-key in info-rows, body inside index cards). When in doubt, italic.
- **The edition badge (`{components.ed-badge}`) is always paired with an italic edition label** — the circle ordinal and the "EDITION N." text are one unit. Using one without the other reads as broken.
- **Every card / pill / rect-tag / badge carries a 1.5px solid ink border with no fill.** The single-weight outlined-shape vocabulary is the system's structural language. Filled shapes do not exist.
- **The paper-texture overlay (`{components.paper-texture}`) is on every slide.** Removing it (or running the system on a pure flat cream without texture) loses the printed-paper quality.
- **Every slide carries the page-number marker** at bottom-right in italic Fraunces. The page-number is the system's spine — without it, slides feel unanchored.
- **Internal dividers inside cards alternate between 1px solid @ 32% opacity (above content) and 1px dashed @ 32% opacity (below content).** The solid/dashed pairing is the system's card-rhythm device.

### Typography Principles
The weight 800 + uppercase + negative letter-spacing combination is the system's Bricolage voice. Switching any of those three properties (e.g., weight 700 uppercase, or weight 800 sentence case, or default tracking) reads as a different design system. The Fraunces italic-default + opsz-axis combination is the system's body voice — using a non-opsz fallback face flattens the quality at small sizes.

Underline is not used. Bold within body paragraphs uses Fraunces weight 600 (not 700/800). Color emphasis does not exist because there is only one color. The system's only emphasis mechanisms are: scale (bigger Bricolage), weight shift inside body (Fraunces 400 → 600), italic ↔ roman switch, and opacity (full → 78%).

## Layout

### Canvas System
The system targets a fluid viewport — each `.slide` is `100vw × 100vh` with absolute positioning. Slides stack inside a `.stage` container with the paper-texture overlay sitting absolutely on the stage. Only one `.slide.active` is visible at a time; opacity transitions between slides take 280ms.

### Padding Scale (uses `clamp()` ranges)
| Token | Range | Use |
|---|---|---|
| `{spacing.slide-pad-h-default}` | clamp(60px, 5vw, 110px) | Default horizontal slide padding |
| `{spacing.slide-pad-h-wide}` | clamp(80px, 7vw, 160px) | Wider horizontal padding for featured / calendar slides |
| `{spacing.slide-pad-h-narrow}` | clamp(120px, 12vw, 280px) | Narrow horizontal padding for menu / quote slides (forces content into a column) |
| `{spacing.slide-pad-top-default}` | clamp(96px, 10vh, 160px) | Default top padding |
| `{spacing.slide-pad-top-cover}` | clamp(60px, 6vh, 100px) | Cover top padding (less, to give the title room) |
| `{spacing.slide-pad-bottom-default}` | clamp(110px, 11vh, 170px) | Default bottom padding (leaves room for page-num chrome) |
| `{spacing.slide-pad-bottom-wide}` | clamp(150px, 14vh, 220px) | Wider bottom padding for featured / quote slides |
| `{spacing.gap-section}` | clamp(28px, 3vh, 50px) | Between major content sections |
| `{spacing.gap-content}` | clamp(18px, 2vh, 32px) | Between related content blocks |
| `{spacing.gap-row}` | clamp(14px, 1.6vh, 24px) | Between row-level elements (course rows, ledger rows) |
| `{spacing.gap-tight}` | clamp(10px, 1.2vh, 18px) | Between tightly coupled elements |

### Chrome Anatomy
Every slide carries a **page-number marker** at the bottom-right (italic Fraunces, ~16px max). The viewport also carries a **nav-hint** at the bottom-left (italic Fraunces, 45% opacity), suggesting keyboard navigation. These two chrome elements are the system's universal slide anchors.

Slides with a topbar (index, calendar) carry a Bricolage headline on the left + a small italic Fraunces label-tag on the right, separated below by a 1.5px solid ink horizontal rule. The topbar-divider is the system's universal page-divider device.

### Border-Radius
- **999px** — pill buttons (fully pill-shaped)
- **50%** — circular edition badges
- **0** — every other shape (cards, rect-tags, info-cards, ledger rows, internal dividers)

The system uses sharp corners for content containers and pill/circle for action and ordinal markers. No medium border-radius values (4px, 8px, 12px) exist.

## Depth and Elevation

### Flat, No Shadows
The system uses **zero shadows**. No box-shadow, no text-shadow, no filter, no gradient. Elevation is communicated entirely through:

1. **1.5px solid ink borders** on cards, pills, badges, rect-tags — the outlined-shape vocabulary is the system's structural depth.
2. **1px solid or dashed internal dividers at 32% opacity** inside cards and between rows — the subtle horizontal lines give cards their internal rhythm.
3. **The paper-texture overlay** at 10% opacity on every slide — the dotted texture sits atmospherically beneath all content, giving the page its print-stock quality.
4. **Opacity layering on text** — primary at 100%, de-emphasized metadata at 78%, near-invisible dividers at 32%.

The absence of shadow is itself the depth language. Adding `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` shatters the printed-paper feel.

### Paper Texture as Atmospheric Depth
The radial-dot texture on `.stage::before` is part of the depth system — it is not optional decoration. The texture gives the cream surface a quality that flat #FAF1E2 lacks: a sense that the surface is paper stock with grain, not a CSS background fill. The 4px tile size with 0.5px radial dots in 50%-opacity ink at 10% overall opacity is calibrated to be invisible at conversational viewing distance and just-visible at close inspection.

## Shapes and Treatment

### Border Weight and Style
- **1.5px solid `{colors.ink}`** — the universal structural border. Cards, pills, edition badges, rect-tags, topbar dividers, who-row top borders, info-card outlines.
- **1px solid `{colors.ink-32}`** — internal solid dividers inside cards (between card-top metadata and the card title), between ledger rows, between course rows.
- **1px dashed `{colors.ink-32}`** — internal dashed dividers inside cards (between the card body and the meta-row at the bottom), between info-rows in info-cards.

Borders are never thicker than 1.5px. Never colored beyond ink (full or 32%). Never dotted (dotted is reserved for the paper-texture pattern). The solid/dashed pairing inside cards is the system's signature rhythm device.

### Decorative Element Types

**Paper Texture Overlay** (`{components.paper-texture}`) — A 4px-tile radial-dot pattern in 50%-opacity ink at 10% overall opacity on `.stage::before`. The system's atmospheric base; on every slide.

**Pill Button** (`{components.pill}`) — An outlined fully-rounded-rectangle (border-radius 999px) holding short italic Fraunces text. The system's CTA / action button. Pills cluster in action rows (e.g., cover action row).

**Pill Divider** (`{components.pill-divider}`) — A small italic Fraunces character (typically `·` or `/`) at 70% opacity placed between pills in a row.

**Edition Badge** (`{components.ed-badge}`) — A ~38px circular outlined badge holding a single italic Fraunces digit. The system's edition / chapter ordinal marker; always paired with an italic "EDITION N." label.

**Rect Tag** (`{components.rect-tag}`) — An outlined sharp-cornered rectangular tag holding short italic Fraunces text. The sharp-cornered cousin of the pill; used where roundness isn't appropriate.

**Outlined Card** (`{components.card-outlined}`) — A 1.5px ink-outlined rectangular card. Holds a card-top metadata row (separated below by a 1px @ 32% solid divider), a Bricolage card title, a Fraunces body description, and a meta-row at the bottom (separated above by a 1px @ 32% dashed divider). The system's primary content card.

**Topbar with Divider** — A Bricolage headline on the left + a small italic Fraunces label-tag on the right, separated below by a 1.5px solid ink horizontal rule. The system's universal section opener.

**Info-Card** — A wider outlined card with internal info-rows (key / value pairs separated by 1px @ 32% dashed dividers). Used as a featured-edition supporting panel.

**Ledger Row** (`{components.ledger-row}`) — A multi-column grid row with a 1px @ 32% solid border-bottom. Holds tags, labels, and pills aligned in columns. The system's calendar / schedule / index pattern.

**Course Row** — A 64px / 1fr / auto grid row with a 1px @ 32% solid border-bottom. Holds a Fraunces num-tag, an item (Bricolage name + Fraunces description), and a Fraunces pairing tag. The menu / programme pattern.

**Italic Jumbo Edition Numeral** — A massive italic Fraunces digit at up to 480px. The system's signature hero typographic anchor on cover-class slides, paired with a small tracked Bricolage label beneath and an italic Fraunces meta line.

**Page Number** (`{components.pagenum}`) — Italic Fraunces at the bottom-right of every slide.

**Nav Hint** (`{components.nav-hint}`) — Italic Fraunces at 45% opacity at the bottom-left of the viewport, suggesting keyboard navigation.

## Do's and Don'ts

### Do
- Commit to single-ink rendering. Every text, border, rule, badge, and pill is `{colors.ink}` — the warm rust terracotta. Use opacity (78%, 32%, 10%) for variation, never a different hue.
- Apply the paper-texture overlay to every slide. The 4px radial-dot pattern at 10% opacity is part of the design system, not optional polish.
- Run every Bricolage display element at weight 800 (or 700 for quote / course-name / who-tag) in strict uppercase with negative letter-spacing.
- Run every Fraunces body element in italic by default. Use roman only for info-keys (where italic tracking would feel out of place) and card body descriptions (where italic at small size is less readable).
- Reach for the italic Fraunces jumbo numeral (up to 480px) as the hero typographic anchor on cover-class slides. It's the system's signature.
- Pair every edition badge with an italic "EDITION N." Fraunces label — the circle ordinal and the text label are one unit.
- Use the outlined-card pattern (1.5px ink border + internal 1px @ 32% solid divider above content + 1px @ 32% dashed divider below content) for primary content cards. The solid/dashed pairing is the system's rhythm.
- Use the pill (border-radius 999px) and the rect-tag (sharp corners) intentionally — pill for actions, rect for metadata / status. Don't conflate them.
- Place the page-number marker (italic Fraunces, bottom-right) on every slide. The marker is the system's spine.
- Keep slides rich-but-curated: one major Bricolage display moment + 2–4 supporting groups (cards, pills, ledger rows, info pairs). Single-element slides feel underweight; 8-element slides feel broken.

### Don't
- Don't introduce a second ink color. The system is single-ink — adding a navy, green, yellow, or any second hue shatters the printed-program register.
- Don't fill any shape. Cards, pills, badges, rect-tags are outline-only. Filled rectangles in the ink color do not exist.
- Don't use box-shadow, gradient, blur, or filter on any element. The system is flat printed paper.
- Don't omit the paper-texture overlay. A flat #FAF1E2 background without the dot pattern reads as digital, not paper.
- Don't run Bricolage in sentence case. Bricolage is always uppercase with negative tracking and weight 700 or 800.
- Don't render Fraunces in roman by default. Italic is the body voice; roman is the exception for specific tight cases.
- Don't use thicker borders (2px+). The 1.5px structural border weight is the system's commitment.
- Don't use a medium border-radius (4px, 8px, 12px). The system uses 999px (pill), 50% (badge), or 0 (everything else).
- Don't pair the edition badge with a non-Fraunces label or skip the label entirely. The badge-and-label unit is the system's edition marker.
- Don't crowd a slide with 8 small elements. Reach for fewer, larger groups with breathing room.

## Responsive Behavior

The system uses **`clamp()` units throughout** — every size, padding, gap, and rule scales fluidly between minimum and maximum based on viewport width and height. The same composition renders correctly on a 1280×720 laptop, a 1920×1080 monitor, and a 2560×1440 display without media queries.

### Scaling Behavior
- Bricolage display sizes clamp between a min (e.g. 60px), a vw/vh-based middle value, and a max (e.g. 140px). The `min()` inner function combines width-based and height-based caps so headlines never overflow on short viewports.
- Fraunces body sizes follow the same pattern but with smaller ranges.
- Padding and gaps scale linearly with vw/vh.
- The 1.5px structural border and 1px @ 32% internal dividers are fixed-pixel and do not scale, which means at larger viewports the borders appear proportionally finer. This is by design.

### Presenter Behavior
- Slides advance via keyboard navigation (handled by deck JavaScript).
- Only one `.slide.active` is visible at a time; non-active slides are `opacity: 0; pointer-events: none`.
- Slide-to-slide transition is a 280ms opacity fade.
- The nav-hint at the bottom-left ("← → to navigate") tells the viewer how to advance.

### Print / Export
There is no `@media print` rule in the system. Print export will render only the active slide; multi-slide print requires per-slide rendering or a dedicated print stylesheet.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Chinese Face | Weight | Why |
|---|---|---|---|
| Display / cover / headline (Bricolage roles, 96–180px) | 思源宋体 Noto Serif SC | 700 | Mincho heavy weight carries the printed-program mass that Bricolage 800 provides in Latin |
| Card title / course-name / info-value (28–44px) | 思源宋体 Noto Serif SC | 700 | Same Mincho voice at smaller sizes for consistency |
| Hero edition numeral (480px italic Fraunces) | 思源宋体 Noto Serif SC | 400 | Use a Chinese ordinal character (一二三 / 春夏秋) for the hero anchor instead of a Western digit |
| Body / lede / tagline (Fraunces italic roles) | 思源宋体 Noto Serif SC | 400 | Mincho body voice — warmth without italic, since Chinese has no italic |
| Pill text / meta-tag / pagenum | 思源宋体 Noto Serif SC | 400 | Keep all chrome in Mincho 400; the system's single-ink discipline carries through |
| Info-key / edition-label-tracked (uppercase tracked roles) | 思源宋体 Noto Serif SC | 400 with 0.16em letter-spacing | Maintains the tracked-chrome feel |

### Mixed-Content Strategy

Use **Strategy A** — switch the entire face stack to Noto Serif SC across all roles, replacing both Bricolage Grotesque (display) and Fraunces (body). Long Table is a minimal single-ink data / program system where the typographic personality is carried more by the **single-ink rust terracotta**, the **outlined-shape vocabulary**, and the **paper-texture overlay** than by the specific Latin faces. Going all-Mincho in Chinese preserves the printed-program register cleanly without the per-glyph baseline wobble that Strategy C would introduce on a system this typographically dense. Stack:

```css
/* Bricolage roles (display, headline, card-title, course-name, info-value) */
font-family: 'Bricolage Grotesque', 'Noto Serif SC', sans-serif;
/* Fraunces roles (body, lede, tagline, pill, pagenum, edition-label) */
font-family: 'Fraunces', 'Noto Serif SC', Georgia, serif;
```

When the deck content is pure Chinese, override both font stacks to lead with Noto Serif SC. Bricolage roles get weight 700 (matches 800 mass in Mincho), Fraunces roles get weight 400.

### Loading

Add to the existing Google Fonts `<link>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

### Universal CJK Adjustments

These adjustments apply to **every CJK block** in this system, regardless of size or role:

- **Loosen line-height by 0.05–0.08.** CJK glyphs are full-width squares with more visual weight than Latin letterforms; line-heights tuned for Latin (0.86–0.95 on display, 1.45–1.5 on body) read as cramped in Chinese. Bump display to 1.0–1.1 and body to 1.55–1.65.
- **Remove negative letter-spacing on CJK headlines.** Bricolage display uses -0.005em to -0.012em tracking, which collides Chinese glyphs into each other. For CJK runs, set `letter-spacing: 0` — or a tiny positive `0.02em` if the headline feels visually packed.
- **Never `text-transform: uppercase` on CJK text.** Chinese has no case; the CSS property does nothing on Han glyphs but will silently break any mixed-script line where the Bricolage portion was meant to be capitalized. (This matters here — every Bricolage display element in the source is `text-transform: uppercase`.)
- **Use Chinese full-width punctuation** (`，。：；！？「」『』（）`) inside Chinese sentences, not the Latin equivalents (`,.:;!?""''()`). Mixing punctuation systems within one sentence reads as a typesetting error.
- **No period (。) at the end of CJK headlines.** Chinese headlines follow the same rule as Latin — title-style lines drop terminal punctuation. Body paragraphs keep their 。
- **Apply Pangu spacing (盘古之白) at the boundary between CJK and Latin runs.** A space (or 0.25em margin) belongs between a Chinese character and an adjacent Latin word or digit, e.g. `2026 年 5 月` not `2026年5月`. Either type the spaces manually or use a `pangu.js`-style auto-spacer.
- **One font per sentence.** Don't switch between Noto Serif SC weight 400 and 700 inside the same sentence — pick the weight that matches the role (headline = 700, body = 400) and commit to it for the whole run.

### Aesthetic Notes for This System

Long Table's whole voice is "supper-club poster / Risograph zine / small-press dinner program" — single-ink rust terracotta on cream, outlined shapes, paper-texture overlay. In Chinese, the system's identity does not depend on the specific Latin faces (Bricolage and Fraunces); it depends on the **single-ink commitment**, the **1.5px outlined-shape vocabulary**, the **4px radial-dot paper texture**, and the **rich-but-curated density**. Going all-Noto-Serif-SC preserves every one of those identity markers cleanly.

The default-italic body rule does not translate to Chinese (Chinese has no italic concept; slanted Han glyphs read as broken, not as a body voice). In Chinese, every Fraunces-italic role simply becomes **Noto Serif SC weight 400 upright** — the warmth comes from the Mincho character itself, not from the slant. This is the right trade-off for this system.

The hero italic Fraunces jumbo numeral (up to 480px) is the system's signature anchor in Latin — a single italic digit acting as a typographic centerpiece. In Chinese, **use a Chinese ordinal or season character instead of a Western digit**: 「三」、「五」、「春」、「秋」, rendered in Noto Serif SC at weight 400. The Han glyph's denser visual weight at 480px balances the cover slide better than a Western digit would; the cream paper background and warm rust ink carry the printed-program feel through unchanged.

The system's outlined-shape vocabulary (pills, edition badges, rect-tags, outlined cards) works identically in Chinese — no adjustments needed. The "EDITION N." label paired with the circular badge becomes 「第三期」or 「第 03 期」inside the circle, with the meta-label below in Noto Serif SC 400. The 32%-opacity solid / dashed internal divider rhythm is purely structural and unaffected by language.

### Known CJK Gap

The Fraunces italic-default body voice is one of Long Table's most distinctive typographic moves in Latin — italic Mincho-style serif body that gives the system its lyrical, hand-written warmth. Chinese has no equivalent: there is no commonly-available "italic Mincho" face on the Google Fonts CDN, and slanted Han glyphs read as broken regardless. The Chinese rendering loses the italic-default character — every body line becomes upright Noto Serif SC weight 400. This is a real loss of personality, partially compensated by Noto Serif SC's own warmth at body sizes, but Chinese-content Long Table decks read measurably more "neutral magazine" than "supper-club poster." For decks where this matters, lean harder on the **single-ink color** and the **paper-texture overlay** to carry the warmth that the italic body would have carried in Latin.

## Iteration Guide

1. Any new mark on a slide is in `{colors.ink}` — full opacity for primary, 78% for de-emphasized metadata, 32% for internal dividers. No second color.
2. Any new headline is Bricolage Grotesque weight 800 uppercase with negative letter-spacing. Pick the size from the headline ladder (96 / 100 / 120 / 140 / 160 / 180px max) — do not invent a new size.
3. Any new body paragraph is Fraunces italic at weight 400. Use roman only for info-keys (tracked uppercase) and card-body descriptions.
4. Any new edition / ordinal marker uses the `{components.ed-badge}` (circular outline) paired with an italic "EDITION N." Fraunces label.
5. Any new action button is the `{components.pill}` (border-radius 999px); any new metadata tag is the `{components.rect-tag}` (sharp corners). Don't conflate the two.
6. Any new card is the `{components.card-outlined}` pattern: 1.5px ink border, internal 1px @ 32% solid divider above content, internal 1px @ 32% dashed divider below content.
7. Any new ledger / schedule / calendar row uses the multi-column grid + 1px @ 32% solid border-bottom pattern (`{components.ledger-row}`).
8. Any new section opener uses the topbar pattern: Bricolage headline + small italic Fraunces label on the right + 1.5px solid ink horizontal rule beneath.
9. Any new cover-class moment reaches for the italic Fraunces jumbo edition numeral as the hero typographic anchor — paired with a small tracked Bricolage label beneath and a italic Fraunces meta line.
10. Every slide carries the page-number marker. If you skip it, the slide will feel unanchored.

## Known Gaps

- The two Google Fonts (Bricolage Grotesque with `opsz` 12..96, Fraunces with `opsz` 9..144) are loaded via `<link>`. Offline rendering will fall back to system sans (for Bricolage) and Georgia (for Fraunces) — which loses the optical-size axis and the personality of both faces. Self-hosting recommended for offline / print reliability.
- The `opsz` optical-size axis is critical to quality at large display sizes (480px jumbo numeral) and small metadata sizes (14px page-number). Fallback faces without `opsz` will look noticeably flat at the extremes.
- The system is single-ink by design. If a deck needs a second emphasis color (a "callout" or "warning" hue), the system cannot accommodate it without breaking the printed-program register. Use Bricolage scale + opacity + italic/roman switch as the only emphasis mechanisms.
- The paper-texture overlay uses a `background-image` radial-gradient that may render with subtle compression artifacts on some browsers at high zoom. The texture is essential to the system identity; do not remove it as a "performance optimization."
- Body paragraphs are italic by default. For deck content where italic at body scale is hard to read (long technical paragraphs, code samples), the system has no clean fallback — italic is the body voice. Keep paragraphs short and lyrical.
- The CSS has several empty rule blocks (`.body-it { ... }`, `.s-cover .stats .num { font-weight: 600; }` etc.) where the original commented-out italic / weight properties have been stripped. The intended treatment in many places is "italic Fraunces at weight 400" — the default style — but the empty blocks make this implicit rather than explicit. Treat italic as the default everywhere the comments hint at it.
- The system loads Bricolage weights 400 and 600 and Fraunces weights 500 — these are not actively used in the published CSS. Using them would introduce intermediate weights that break the single-weight commitment per face.
- The fallback `.body-it` and `.body-ro` utility classes are defined but use the explicit class names sparingly in the markup. Most slides set typography per-element rather than via the utility classes — copy the per-element styles when authoring new slides, not the utilities.
- The hero italic Fraunces jumbo numeral at 480px is a literal numeral character — there is no glyph alternation or kerning fix for specific characters. The "0" and "8" glyphs may need optical adjustment at extreme sizes; check rendering at the target viewport.
- The system has no `@media print` rule. Print export will not paginate; treat Long Table as screen-first.
