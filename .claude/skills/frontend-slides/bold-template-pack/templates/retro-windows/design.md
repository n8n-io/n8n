---
version: alpha
name: Retro Windows
description: A Windows 95 / 98 desktop-OS aesthetic rendered as a presentation system. Every slide is a window — beveled chrome, navy gradient title bar, MS Sans Serif body type, with chart areas, group boxes, and panels arranged as if they were software UI from 1995. The palette is the original Win9x system colors (gray button-face, navy title bars, white sunken inputs) with retro accent hues (DOS green, brick red, mustard yellow, teal cyan) reserved for status text and chart data. Pixel-font (Press Start 2P) and terminal-font (VT323) appear sparingly for nostalgic punctuation. The effect is half playful nostalgia, half functional dashboard — a deck that reads as a software product running on a CRT monitor.

colors:
  bg-gray: "#c0c0c0"
  bg-light: "#d4d0c8"
  bg-dark: "#808080"
  white: "#ffffff"
  black: "#000000"
  text-dark: "#222222"
  blue-navy: "#000080"
  blue-bright: "#0000a0"
  blue-light: "#1084d0"
  green-retro: "#008000"
  red-retro: "#800000"
  yellow-retro: "#808000"
  cyan-retro: "#008080"
  text-gray: "#555555"

color-aliases:
  btn-face: bg-light
  btn-highlight: white
  btn-shadow: "#404040"
  btn-dark-shadow: black

typography:
  body:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  text-xl:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
  text-lg:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
  text-md:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  text-sm:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  text-xs:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  metric-xl:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.1
  title-bar:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: 0.5px
  group-box-title:
    fontFamily: "MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.0
  pixel-display:
    fontFamily: "'Press Start 2P', cursive"
    fontSize: "20–24px"
    fontWeight: 400
    lineHeight: 1.8
  terminal:
    fontFamily: "'VT323', monospace"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.2
  nav-hint:
    fontFamily: "'VT323', monospace"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.0

spacing:
  slide-pad: "24px 32px 44px 32px"
  win-body-pad: "20px 24px 24px 24px"
  panel-pad: 16px
  group-box-pad: "20px 18px 16px 18px"
  panel-sunken-pad: 12px
  gap-1: 6px
  gap-2: 10px
  gap-3: 16px
  gap-4: 24px

canvas:
  width: 100vw
  height: 100vh

components:
  crt-overlay:
    backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)"
    zIndex: 9999
    description: "Fixed, full-viewport scanline overlay at 3% black opacity that sits above all content. Imitates the horizontal phosphor lines of a CRT monitor. Pointer-events disabled."
  win-window:
    background: "{colors.bg-light}"
    border: "2px solid {colors.white} (top/left) + 2px solid {colors.black} (right/bottom)"
    boxShadow: "inset 1px 1px 0 {colors.white}, inset -1px -1px 0 #404040"
    description: "The signature framing element. Every slide is one (or more) win-window. The asymmetric border + double inset shadow creates the Win9x beveled raised effect — top-left highlighted, bottom-right shadowed."
  win-titlebar:
    background: "linear-gradient(90deg, {colors.blue-navy} 0%, {colors.blue-bright} 100%)"
    color: "{colors.white}"
    padding: "4px 8px"
    fontSize: 14px
    fontWeight: 700
    description: "Navy-blue gradient bar at the top of every window. Contains a left lockup (icon + filename in caps) and a right cluster of three minimize/maximize/close buttons (_, [], X)."
  win-titlebar-inactive:
    background: "linear-gradient(90deg, #808080 0%, #a0a0a0 100%)"
    description: "Grayed-out title bar variant for inactive/secondary windows (used when a slide contains multiple stacked windows representing different states)."
  win-btn:
    width: 20px
    height: 18px
    background: "{colors.bg-light}"
    border: "2px solid {colors.white} (top/left) + 2px solid {colors.black} (right/bottom)"
    description: "Beveled-raised mini button used inside the title bar (_, [], X) and elsewhere. Active state inverts the bevel."
  btn-retro:
    background: "{colors.bg-light}"
    border: "2px solid {colors.white} (top/left) + 2px solid {colors.black} (right/bottom)"
    padding: "6px 24px"
    fontSize: 14px
    description: "Standard Win9x command button. Beveled raised; active state inverts the bevel so the button appears pressed in."
  group-box:
    border: "2px solid #404040 (top/left) + 2px solid {colors.white} (right/bottom)"
    padding: "20px 18px 16px 18px"
    background: "{colors.bg-light}"
    description: "Sunken-bevel framed container with a title label that breaks the top border (the title sits in a small background-painted notch at top-left). The Win9x equivalent of a fieldset/legend."
  group-box-title:
    position: absolute
    top: -10px
    left: 12px
    background: "{colors.bg-light}"
    padding: "0 8px"
    fontSize: 13px
    fontWeight: 700
    description: "The title label that sits on top of a group-box's upper border, painted with the parent background to mask the border behind it."
  panel-raised:
    background: "{colors.bg-light}"
    border: "2px solid {colors.white} (top/left) + 2px solid {colors.black} (right/bottom)"
    padding: 16px
    description: "Raised-bevel panel. Used for tool palettes, button strips, and elevated content regions inside a window body."
  panel-sunken:
    background: "{colors.white}"
    border: "2px solid #404040 (top/left) + 2px solid {colors.white} (right/bottom)"
    padding: 12px
    description: "Sunken-bevel panel with a white interior. Used for text input fields, read-only data displays, and status regions. The white interior is the system's signal for 'this is content, not chrome.'"
  progress-bar:
    width: "100%"
    height: 24px
    background: "{colors.white}"
    border: "2px solid #404040 (top/left) + 2px solid {colors.white} (right/bottom)"
    padding: 2px
    description: "Sunken white well containing a solid navy fill div whose width represents the data value. The fill is `{colors.blue-navy}` solid — no gradient, no animation beyond width transition."
  retro-list:
    listStyle: none
    marker: "> (chevron)"
    markerColor: "{colors.blue-navy}"
    description: "Custom-bullet list where each item is prefixed with a navy '>' character. The chevron is set via ::before, never via list-style."
  retro-check:
    checkBoxSize: "16px"
    checkBoxBorder: "2px solid {colors.black} (top/left) + 2px solid {colors.white} (right/bottom)"
    checkMarker: "x"
    description: "Sunken white square checkbox with a literal lowercase 'x' character as the checked-state marker. Inset-beveled the opposite direction from buttons."
  retro-table:
    borderCollapse: collapse
    fontSize: 14px
    headerBackground: "{colors.bg-gray}"
    headerBorder: "1px solid #404040"
    cellBackground: "{colors.white}"
    cellBorder: "1px solid {colors.bg-gray}"
    zebraRowBackground: "#f0f0f0"
    description: "Pixel-flat data table with gray headers, white cells, light-gray border lines, and a barely-different zebra fill on alternate rows."
  marquee:
    background: "{colors.white}"
    border: "1px inset {colors.bg-gray}"
    padding: "3px 0"
    animation: "marquee 14s linear infinite"
    description: "Scrolling text inside a sunken white well. The animation translates the text from 100% right to -100% left over 14 seconds. The original Win marquee element re-implemented in CSS."
  win-icon:
    width: 18px
    height: 18px
    background: "{colors.white}"
    border: "1px solid {colors.black}"
    fontSize: 11px
    color: "{colors.blue-navy}"
    fontWeight: 700
    description: "Tiny 18px square icon next to a title-bar filename — a navy-on-white letter glyph that imitates an application icon. The glyph is a 1-character mnemonic of the window's role (P for Presentation, R for README, D for Dataview, etc.)."
  tree-item:
    fontSize: 14px
    indent: "24px per level"
    folderGlyph: "📁 (U+1F4C1)"
    fileGlyph: "📄 (U+1F4C4)"
    expandedMarker: "-"
    collapsedMarker: "+"
    description: "Explorer-style hierarchical tree view. Each row carries an expand marker (+/−), a folder or file emoji glyph, and the label text. Indentation steps by 24px per nesting level."
  separator-vertical:
    width: 2px
    background: "#404040"
    borderLeft: "1px solid {colors.white}"
    margin: "0 12px"
    description: "Beveled vertical separator between inline elements — the Win9x equivalent of a vertical rule."
  hr-retro:
    borderTop: "1px solid #404040"
    borderBottom: "1px solid {colors.white}"
    margin: "14px 0"
    description: "Beveled horizontal rule. Two stacked 1px lines (dark on top, white on bottom) create the engraved-in look."
  nav-dot:
    width: 12px
    height: 12px
    background: "{colors.bg-gray}"
    border: "2px solid {colors.white} (top/left) + 2px solid {colors.black} (right/bottom)"
    activeBackground: "{colors.blue-navy}"
    description: "Beveled square mini-dot used as a slide-indicator chip. Active state fills navy with a 4px white center square."
  chart-canvas-host:
    background: "{colors.bg-light}"
    description: "Chart.js canvas embedded inside a panel-raised. Chart colors use {colors.blue-navy}, {colors.blue-bright}, {colors.blue-light}, {colors.green-retro}, {colors.cyan-retro}, {colors.yellow-retro}. Axis labels use MS Sans Serif at 11–12px in {colors.text-dark}. Gridlines in {colors.bg-gray}."
  scrollbar:
    width: 16px
    trackBackground: "{colors.bg-gray}"
    thumbBackground: "{colors.bg-gray}"
    thumbBorder: "2px solid {colors.white} (top/left) + 2px solid {colors.black} (right/bottom)"
    description: "Custom webkit scrollbar styled as a beveled-raised gray thumb on a flat gray track. Width is fixed 16px to match Win9x default."
---

## Frontend Slides Fixed-Stage Policy

When this design system is used by the `frontend-slides` skill, generate the final deck as a **fixed 1920×1080 stage** that scales uniformly to the browser viewport. The deck should preserve a 16:9 slide canvas on every screen, including phones; it may letterbox or pillarbox, but it should not reflow slide content for mobile.

This policy has higher priority than any source-template responsive behavior described later in this file. If a later section says the original template is viewport-fluid, treat that as source history only, not as the target generation model for `frontend-slides`.

This policy applies even if the source template was originally implemented with viewport-fluid CSS such as `100vw`, `100vh`, `vw`, `vh`, or `clamp()`. Treat those values as design proportions to translate into 1920×1080 stage coordinates, not as live responsive rules in the generated deck.

Use `deck-stage.js` or an equivalent inline stage scaler for final output: render each slide at 1920×1080, scale the whole stage with one transform, and verify rendered screenshots for both text overflow and panel overlap.


## Overview

Retro Windows is a **Windows 95 / 98 desktop-OS aesthetic** rendered as a slide template. Every slide is structured as a `win-window` — a beveled rectangular chrome with a navy-gradient title bar, three button icons in the upper right (`_`, `[]`, `X`), and a body region containing application-style content. The composition is "this slide is software running on a 1995 desktop, and the content is what the software displays." The conceit is total: there are no slide titles in the modern presentation sense, only window titles styled as filenames (`README.DOC`, `DATAVIEW.CSV`, `METRICS.LOG`).

The typeface stack is **MS Sans Serif** (and its modern fallbacks Segoe UI / Tahoma / Verdana) as the system font for nearly all content, with **Press Start 2P** (an 8-bit pixel display face) and **VT323** (a chunky CRT terminal monospace) reserved for nostalgic punctuation — splash-screen headings, navigation hints, marquee text. The body face is small by modern standards (16px default, with most working text at 14px) which is part of the OS-UI aesthetic: software UI of the era ran at fixed pixel sizes, and the deck inherits that constraint.

The palette is the **original Win9x system color set**: button-face gray (`{colors.bg-light}` #d4d0c8), highlight white, shadow dark-gray, and a navy/blue gradient (`{colors.blue-navy}` → `{colors.blue-bright}`) reserved for active title bars and primary data fills. A second cluster of "retro accent" hues — DOS green (#008000), brick red (#800000), mustard yellow (#808000), teal cyan (#008080) — is the system's status palette: green for OK / success / live, red for warnings, yellow for "moderate" risk, cyan for tertiary chart data. Charts pull from this status palette plus the navy ladder. There are no modern saturated hues.

Depth is achieved through **bevel illusions** — every surface is either raised (highlight on top-left, shadow on bottom-right) or sunken (the inverse). The system uses no blurred drop-shadows; instead, two-tone asymmetric borders plus inset box-shadows create the illusion of bevels. This is the foundational depth grammar: buttons are raised, text inputs are sunken, group-boxes are sunken with a notch-mounted title, the active button-press state inverts the bevel.

**Density philosophy: high.** Win9x application UIs were dense — every pixel served a purpose, group-boxes were packed with controls, status bars carried multiple readouts, dialogs were tightly composed. The deck aesthetic depends on that density. A slide with one centered headline and lots of empty space reads as broken or unfinished. The correct density is the window body packed with stacked panels, group-boxes, tables, charts, button strips, and status footers — every slide should feel like an application screen with multiple regions doing concurrent work. The CRT scanline overlay reinforces this: the texture only reads when there is dense content underneath it.

**Key Characteristics:**
- Every slide is a `{components.win-window}` — beveled chrome with navy-gradient title bar and three system buttons (`_`, `[]`, `X`).
- A fixed 3px-period CRT scanline overlay (`{components.crt-overlay}`) sits above all content at 3% opacity.
- Bevel-based depth: raised (`{components.panel-raised}`, `{components.btn-retro}`) and sunken (`{components.panel-sunken}`, `{components.group-box}`) — no blurred shadows.
- The font stack is MS Sans Serif / Segoe UI / Tahoma fallback, with Press Start 2P and VT323 as nostalgic accents.
- Status colors (green / red / yellow / cyan) carry semantic meaning: green = OK, red = warning, yellow = moderate, cyan = tertiary data.
- Navy `{colors.blue-navy}` is the primary data color — progress bars, chart bars, key headlines, active nav dots.
- Lists use a navy `>` chevron prefix; checkboxes use a literal `x` character; tree views use `📁` / `📄` emoji glyphs.
- Window title text reads as filenames in uppercase with extensions (`AGENDA.TXT`, `METRICS.LOG`, `EXPLORER.EXE`).

## Colors

### Palette
- **Button Face Light** (`{colors.bg-light}` — #d4d0c8): The base chrome color for windows, panels, group boxes, buttons. The Win9x "3D Objects" system color. Slightly warm gray. The default fill for any non-content region.
- **Background Gray** (`{colors.bg-gray}` — #c0c0c0): Slightly darker gray. Used for table headers, scrollbar tracks, nav-dot inactive fills. The "Gray Background" system color.
- **Background Dark** (`{colors.bg-dark}` — #808080): Dark gray for desktop fills outside windows and for inactive title bar starts. The "Inactive Title Bar" color.
- **White** (`{colors.white}` — #ffffff): The content fill — used inside sunken panels, text inputs, table cells, progress bar wells, and as the title-bar text color. White signals "this is content, not chrome."
- **Black** (`{colors.black}` — #000000): The deepest shadow color in bevel borders and the strongest text color. Also used as button border for raised-bevel right/bottom edges.
- **Text Dark** (`{colors.text-dark}` — #222222): The default body text color. Slightly softer than pure black so body type doesn't compete with the bevel-dark shadow.
- **Text Gray** (`{colors.text-gray}` — #555555): A muted gray for secondary text, captions, and status hints.
- **Navy** (`{colors.blue-navy}` — #000080): The primary brand color — title bar starts, chart bars, progress fills, headline text, active nav dots, retro-list chevron markers. The system's "primary" color.
- **Blue Bright** (`{colors.blue-bright}` — #0000a0): Title bar gradient end. Slightly brighter and bluer than navy. Used as the second chart-bar variant.
- **Blue Light** (`{colors.blue-light}` — #1084d0): A lighter blue used as a tertiary chart-bar variant.
- **Green Retro** (`{colors.green-retro}` — #008000): DOS green. Reserved for OK status, success messages, growth percentages, "READY" / "LIVE" badges, "On Track" labels.
- **Red Retro** (`{colors.red-retro}` — #800000): Brick red. Reserved for error/warning text and the brick-red status family.
- **Yellow Retro** (`{colors.yellow-retro}` — #808000): Mustard yellow. Reserved for "moderate" risk labels and warning chart segments.
- **Cyan Retro** (`{colors.cyan-retro}` — #008080): Teal cyan. Reserved for tertiary chart segments and secondary status accents.

### Defaults
- **Default surface background**: `{colors.bg-dark}` for the desktop region behind a window, `{colors.bg-light}` for the window body.
- **Default headline / primary text color**: `{colors.blue-navy}`. Headlines in this system are navy, not black — that is the dashboard / application-title voice.
- **Default body text color**: `{colors.text-dark}` (#222222), not pure black.
- **Default secondary / caption text color**: `{colors.text-gray}` (#555555).
- **Default chart primary color**: `{colors.blue-navy}`. Secondary bars use `{colors.blue-bright}` and `{colors.blue-light}` first; categorical-segment charts then pull `{colors.green-retro}`, `{colors.cyan-retro}`, `{colors.yellow-retro}`.
- **Default progress-bar fill color**: `{colors.blue-navy}` (solid, no gradient).
- **Default status-OK color**: `{colors.green-retro}` — used on `READY`, `LIVE`, `Approved`, growth percentages, and any "things are good" badge.
- **Default status-warning color**: `{colors.red-retro}` or `{colors.yellow-retro}` — red for hard errors, yellow for moderate concerns.
- **Default title-bar background**: navy → blue-bright horizontal gradient on active windows; gray (`{colors.bg-dark}` → `#a0a0a0`) on inactive windows when the slide stacks multiple windows.
- **Default text color inside a navy title bar**: `{colors.white}` — always white-on-navy in title bars.
- **Default text color inside a sunken white panel**: `{colors.text-dark}` — dark-on-white for content text.

The accent palette (green / red / yellow / cyan) has fixed semantic meanings — do not use green for arbitrary decoration, do not use red for non-warning text. The accents are status signals, not paint.

## Typography

### Font Family
The system has three faces, each with a distinct role:

- **MS Sans Serif / Segoe UI / Tahoma / Geneva / Verdana stack** (system body): The default for nearly all text. The fallback chain works on any OS — macOS lands on Geneva or Verdana, Windows lands on Segoe UI or MS Sans Serif, Linux lands on a sans-serif fallback. The aesthetic is "what software UI looked like in 1995," and the system font stack is critical to that — never substitute a custom display sans.
- **Press Start 2P** (pixel display): An 8-bit pixel display face used sparingly. Reserved for splash-screen titles, the closing slide's send-off message, and any oversized nostalgic title moment. Always rendered in `{colors.blue-navy}`, always center-aligned. Use it once or twice per deck, not on every slide.
- **VT323** (CRT terminal monospace): A chunky monospace face that imitates a CRT terminal. Reserved for the bottom-edge navigation hint (`<-- ARROW KEYS to navigate -->`) and any "terminal output" body region. Optional — the deck functions without it.

Italic is not used. Underline is not used (interactive links can be underlined but no decorative underlining). Emphasis is achieved by weight (400 → 700) and by switching color (default → navy or default → green/red).

### Type Scale

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `{typography.text-xl}` | 32px | MS Sans Serif | 700 | Primary slide headline inside a window body |
| `{typography.metric-xl}` | 30px | MS Sans Serif | 700 | Hero metric value in a KPI tile |
| `{typography.text-lg}` | 22px | MS Sans Serif | 700 | Section heading / subheading inside a window body |
| `{typography.text-md}` | 18px | MS Sans Serif | 400 | Standard body paragraph |
| `{typography.body}` | 16px | MS Sans Serif | 400 | Default working body |
| `{typography.text-sm}` | 14px | MS Sans Serif | 400 | Captions, list items, button labels, table cells |
| `{typography.text-xs}` | 12px | MS Sans Serif | 400 | Fine print, status hints, slide counter |
| `{typography.title-bar}` | 14px | MS Sans Serif | 700 | Window title bar filename — always uppercase |
| `{typography.group-box-title}` | 13px | MS Sans Serif | 700 | Notch-mounted group-box title label |
| `{typography.pixel-display}` | 20–24px | Press Start 2P | 400 | Nostalgic splash-screen or closing display title |
| `{typography.terminal}` | 22px | VT323 | 400 | Terminal-style body or marquee text |
| `{typography.nav-hint}` | 16px | VT323 | 400 | Bottom-edge keyboard hint text |

### Defaults
- **Default size for a primary slide headline (inside window body)**: `{typography.text-lg}` (22px) in `{colors.blue-navy}` weight 700 — the application-title voice. For an oversized hero headline use `{typography.text-xl}` (32px).
- **Default size for a body paragraph**: `{typography.text-md}` (18px) for prose paragraphs; `{typography.text-sm}` (14px) for working text and list rows.
- **Default size for a window title bar filename**: `{typography.title-bar}` (14px weight 700), always uppercase, always in `{colors.white}`.
- **Default size for a metric or hero number**: `{typography.metric-xl}` (30px weight 700) in `{colors.blue-navy}`.
- **Default size for a section heading inside a window**: `{typography.text-lg}` (22px weight 700) in `{colors.blue-navy}`.
- **Default size for any caption, fine print, or status hint**: `{typography.text-xs}` (12px) in `{colors.text-gray}`.
- **Default weight for any headline or label that should command attention**: 700.
- **Default weight for body text**: 400.

When a slide carries multiple stacked windows or panels, the primary slide message goes inside the first window's body at `{typography.text-lg}`-weight-700-navy. Do not reach for a larger size unless it's an explicit hero / splash moment.

### Signature Treatments
These treatments are **non-optional whenever the corresponding element type is used**:

- **Every window title bar text is uppercase and styled as a filename** (with extension): `PRESENTATION.EXE`, `README.DOC`, `METRICS.LOG`, `AGENDA.TXT`, `DATAVIEW.CSV`, `FEATURES.INI`, `EXPLORER.EXE`, `TIMELINE.PRJ`. The filename convention is part of the aesthetic — never use modern title-case window names.
- **Every title bar carries the three-button cluster** (`_` minimize, `[]` maximize, `X` close) in the top-right. The buttons are decorative, not interactive, but they must always be present.
- **Every title bar carries a `{components.win-icon}` lockup** on the left — an 18px white-with-black-border square containing a single navy letter that mnemonically identifies the window (P, A, R, D, F, G, M, E, T).
- **Every window uses the beveled-raised chrome treatment** (white top/left + black bottom/right border + double inset shadow). Removing the bevel breaks the Windows aesthetic entirely.
- **Every body headline inside a window is `{colors.blue-navy}` weight 700.** Navy is the application-title voice; black headlines read as "wrong era."
- **Status text uses the assigned status color** with weight 700: green for OK/success/growth, red for errors, yellow for moderate. A green status word at default weight reads as incidental rather than as a label.
- **Group-box titles sit in a 0–8px-padded notch over the upper border.** The title's background is painted in `{colors.bg-light}` (the parent fill) to mask the border behind it — never let the border run through the title.

### Typography Principles
The aesthetic depends on **fixed pixel sizes**, not fluid type. The system was designed for the Win9x 96-DPI rendering environment, and the deck preserves that feel by using integer pixel font-sizes (12, 13, 14, 16, 18, 22, 30, 32). Avoid `rem`/`em`/`clamp` for body type — the OS-UI illusion breaks at sub-pixel rendered sizes.

The pixel-font (Press Start 2P) and terminal-font (VT323) are nostalgic accents, not workhorses. Using Press Start 2P for body text becomes illegible quickly; using VT323 for headlines reads as overproduced. Reserve each for one or two moments per deck.

## Layout

### Canvas System
The system targets `100vw × 100vh` with each slide positioned `position: fixed; top: 0; left: 0`. Only the `.active` slide is `display: flex`; others are `display: none`. Inside each slide, a single `{components.win-window}` (or a few stacked windows) provides the framing chrome. The window is `max-width: 1200px` and `max-height: calc(100vh - 68px)` so the desktop gray border is always visible around the chrome.

Slide outer padding is `24px 32px 44px 32px` — the extra bottom padding clears the persistent navigation chrome (nav-dots and slide-counter at the viewport's bottom edge).

### Window Anatomy
Every window has three regions stacked vertically:
1. **Title bar** (`{components.win-titlebar}`) — fixed 4px-8px padding, navy gradient, contains left icon-lockup + filename and right three-button cluster.
2. **Body** (`{components.win-body}`) — 20px 24px 24px 24px padding, fills remaining height, contains the slide's content composition.
3. **Optional status panel** at the body's bottom — a `{components.panel-raised}` or `{components.panel-sunken}` strip carrying meta info (data source, last updated, count, status badge).

A slide may contain multiple windows side-by-side (typically for timeline quarters or multi-screen comparisons). When multiple windows appear, only one carries the active navy title bar; the others carry the inactive gray gradient.

### Padding Scale
| Token | Value | Use |
|---|---|---|
| `{spacing.slide-pad}` | 24px 32px 44px 32px | Outer slide padding |
| `{spacing.win-body-pad}` | 20px 24px 24px 24px | Inside a window body |
| `{spacing.group-box-pad}` | 20px 18px 16px 18px | Inside a group-box (extra top to clear notched title) |
| `{spacing.panel-pad}` | 16px | Inside a raised panel |
| `{spacing.panel-sunken-pad}` | 12px | Inside a sunken white panel |

### Persistent Chrome
Three persistent elements live outside the slide composition:
- **Nav dots** at bottom-center — beveled square indicators, one per slide, with the active one filled navy and carrying a 4px white center square.
- **Slide counter** at bottom-right — sunken-bevel chip with `N / TOTAL` text in 12px.
- **Nav hint** at bottom-left — VT323 16px text reading `<-- ARROW KEYS to navigate -->`.

The CRT scanline overlay sits above everything at z-index 9999 — every slide, every chrome element, every chart canvas is rendered beneath it.

## Depth and Elevation

### Bevel Illusion (Primary Technique)
The system uses **two-tone asymmetric borders** plus **inset box-shadows** to simulate the Windows 95 beveled UI. There are two states:

- **Raised**: 2px solid white on top + left, 2px solid black on right + bottom, plus `inset 1px 1px 0 white, inset -1px -1px 0 #404040`. Reads as a button or panel sitting up off the surface. Used on windows, raised panels, buttons, nav dots.
- **Sunken**: 2px solid `#404040` on top + left, 2px solid white on right + bottom. Reads as a recessed input field or content well. Used on group-boxes, sunken panels, text inputs, progress-bar tracks, checkbox boxes, scrollbar tracks.

The active button press state inverts the bevel — a button that is "pressed in" swaps the highlight/shadow border directions. Hover states are absent; the OS aesthetic predates universal hover affordances.

### No Modern Shadows
The system uses **no blurred `box-shadow` values**, no `drop-shadow` filters, no rgba shadow tints. Every depth cue comes from the bevel-border technique. Adding a soft modern shadow to a window or button breaks the era immediately.

### Color-Block Depth
Beyond the bevels, **white-vs-gray contrast** provides regional depth: white panels visually project as "content / data," gray panels recede as "chrome / structure." A slide's hierarchy emerges naturally from where the white wells sit.

### CRT Scanline Overlay
The system carries one atmospheric layer: the CRT scanline overlay. A 3px-period horizontal repeating gradient at 3% black opacity sits over every slide. The overlay does not add depth, but it adds **texture** — every surface in the deck reads as "rendered on a 1995 CRT monitor" rather than "rendered on a flat screen." Removing the overlay is permissible but loses a meaningful slice of the aesthetic.

## Shapes and Treatment

### Border Radius
The system has **no rounded corners anywhere**. Every box, button, panel, window, table cell, checkbox, nav-dot, progress-bar — strict rectangles. Border-radius is `0` system-wide.

### Border Weights and Styles
- **2px solid** — the universal bevel border weight on windows, panels, buttons, nav-dots. Used in the two-tone asymmetric pattern (white+black or darkgray+white) that creates the bevel illusion.
- **1px solid** — used for thinner element borders (table cell borders, win-icon outline, hr-retro stacked lines).
- **`1px inset`** — used on the marquee container border.

Borders are never colored (no navy borders, no green borders); the bevel two-tone pattern (white + black/darkgray) is the only border vocabulary.

### Decorative Element Types

**Window** (`{components.win-window}`) — The framing primitive. A beveled-raised rectangle with a navy title bar containing icon + filename + three system buttons, and a body region containing the content. Every slide is at least one window.

**Group box** (`{components.group-box}`) — Sunken-bevel container with a notch-mounted title at the upper-left. The title sits in a 0–8px padded background-painted region that masks the border behind it, mimicking the `<fieldset><legend>` pattern of native HTML forms. Used to cluster related controls or content blocks inside a window.

**Raised panel** (`{components.panel-raised}`) — Beveled-raised gray panel. Used for tool palettes, button strips, status footers, and elevated content regions.

**Sunken panel** (`{components.panel-sunken}`) — Beveled-sunken white panel. Used for text inputs, KPI displays, status readouts, and read-only data. White interior is the cue.

**Retro button** (`{components.btn-retro}`) — Beveled-raised gray button with 6px × 24px padding. Always carries text-md (14px) MS Sans Serif weight 400. Active state inverts the bevel.

**Progress bar** (`{components.progress-bar}`) — Sunken white well containing a solid navy fill div. The fill width represents the value; no animation beyond width transition. Always 24px tall (or 16px when embedded inside a feature card).

**Retro table** (`{components.retro-table}`) — Pixel-flat data table with gray headers, white cells, light-gray border lines, and a barely-different zebra fill on alternate rows. Cell padding is 6px × 10px.

**Retro list** (`{components.retro-list}`) — Unstyled list with a navy `>` chevron prefix on each row. The chevron is set via `::before`, never via list-style.

**Retro check** (`{components.retro-check}`) — A 16px sunken-bevel white square containing a literal lowercase `x` character when checked. The bevel is inverted relative to buttons (black on top/left, white on bottom/right).

**Tree view** (`{components.tree-item}`) — Explorer-style hierarchical list. Each row carries an expand marker (+/−), a folder (`📁`) or file (`📄`) emoji glyph, and the label. 24px indentation per nesting level.

**KPI tile (group-box variant)** — A square group-box with a title label (`Revenue`, `Customers`, `Retention`, `NPS Score`), a large 30px navy metric, a green delta line (`▲ +18.3%`), and a 12px gray context line (`vs previous quarter`). Used in 4-up rows for dashboards.

**Marquee** (`{components.marquee}`) — Sunken white well containing horizontally scrolling text. The animation runs 14s linear infinite; pause-on-hover is not implemented. Used on splash and closing slides.

**Win icon** (`{components.win-icon}`) — 18px square white-on-black-bordered miniature with a single navy letter glyph. Used in the title bar as a lockup mark.

**Separator** (vertical or hr-retro) — A beveled rule. Vertical: 2px dark-gray + 1px white-left border, 12px horizontal margin. Horizontal: stacked 1px dark-gray-on-top + 1px white-on-bottom lines, 14px vertical margin.

**Hourglass / sleep glyph** (`⌛` or `💤`) — Used as a single oversized character (40–52px) on splash / closing slides as a nostalgic OS-feel cue.

## Do's and Don'ts

### Do
- Wrap every slide in a `{components.win-window}` with a navy title bar carrying a filename-style title (e.g., `METRICS.LOG`) and the three-button cluster (`_`, `[]`, `X`).
- Use the bevel border technique (white top/left + black bottom/right + inset shadows for raised; the inverse for sunken) on every panel, button, and window. This is the system's identity.
- Set primary headlines in `{colors.blue-navy}` weight 700. Navy is the application-title voice — black headlines read as wrong-era.
- Pack each slide densely. Multiple group boxes, stacked panels, KPI strips, charts, and status footers should all coexist inside one window body. Empty space reads as broken.
- Use the status colors semantically: green for OK / live / growth, red for warnings / errors, yellow for moderate concerns, cyan for tertiary data. Each color carries a meaning — do not redecorate with them.
- Render charts with the navy ladder first (`{colors.blue-navy}`, `{colors.blue-bright}`, `{colors.blue-light}`), then pull from the status palette for categorical-segment differentiation.
- Use the `>` chevron retro-list pattern for bullet lists and the literal-`x` retro-check for checkboxes. Native browser bullets and form controls break the aesthetic.
- Apply integer pixel font sizes (12, 13, 14, 16, 18, 22, 30, 32). The fixed-pixel sizing is part of the OS-UI illusion.
- Keep the CRT scanline overlay (`{components.crt-overlay}`) on every slide. It is the texture that ties the deck to its CRT-monitor metaphor.
- Style window titles as uppercase filenames with extensions (`PRESENTATION.EXE`, `AGENDA.TXT`). Title-case window names break the conceit.

### Don't
- Don't round any corner. Every shape is a strict rectangle. Border-radius is 0 system-wide except for tiny round details inside chart canvases.
- Don't use blurred `box-shadow` or `drop-shadow`. All depth is bevel-based.
- Don't introduce modern brand colors (saturated purples, oranges, magentas). The palette is limited to Win9x system grays, navy, and the four retro accents.
- Don't use color on borders. Border two-tones are white + black or darkgray + white — never navy borders, never green borders.
- Don't use `rem`/`em`/`clamp` for body type sizes. Fixed integer pixel sizes preserve the OS-UI illusion.
- Don't use Press Start 2P or VT323 for body text. They are nostalgic accents — reserved for one or two moments per deck.
- Don't use modern title-case or sentence-case window titles. Window titles are uppercase filenames with extensions.
- Don't leave a window without its three-button cluster (`_`, `[]`, `X`). Even decorative, the cluster is part of every window's signature.
- Don't introduce a hover-state visual change on buttons. The Win9x era predates universal hover; an active-state bevel inversion is the only state change.
- Don't compose a sparse slide with one centered headline and lots of empty space. The system reads as broken when it does not feel like dense application UI.

## Responsive Behavior

The system is **viewport-fluid** but **fixed-pixel**: the window chrome and body sizes flex with the viewport (`max-width: 1200px`, `max-height: calc(100vh - 68px)`), but font-sizes are integer pixels, not clamped. A single media query at `max-width: 900px` reduces slide padding to 15px-20px and collapses 4-column grids to 2-column.

### Scaling Behavior
- The window grows to fill the viewport up to 1200×(100vh-68px), then stops scaling.
- All font-sizes stay fixed: a 14px label is 14px on any screen size.
- The CRT scanline overlay's 3px period is constant regardless of viewport.

### Presenter Behavior
- Slides advance via `ArrowRight`, `ArrowDown`, or `Space`.
- Slides reverse via `ArrowLeft` or `ArrowUp`.
- `Home` jumps to the first slide, `End` to the last.
- Nav dots at the bottom are clickable.
- No touch swipe support is implemented by default.

### Print Behavior
No `@media print` rule is defined. Printing will render the active slide only.

### Chart Rendering
Charts use Chart.js loaded from a CDN. Chart colors map directly to system tokens (`{colors.blue-navy}`, `{colors.blue-bright}`, `{colors.blue-light}`, `{colors.green-retro}`, `{colors.cyan-retro}`, `{colors.yellow-retro}`). Axis labels use MS Sans Serif at 11–12px in `{colors.text-dark}`. Gridlines are 1px `{colors.bg-gray}`. Charts are rendered lazily when their slide becomes active.

## CJK & International Content

### Recommended Chinese Pairing

| Role | Latin | Chinese | Weight mapping |
|---|---|---|---|
| Title-bar / Headlines / Metric / Section heading | MS Sans Serif → Segoe UI (700) | **思源黑体 Noto Sans SC** | 700 |
| Body / Caption / List / Table cell | MS Sans Serif → Segoe UI (400) | **思源黑体 Noto Sans SC** | 400 |
| Pixel display (Press Start 2P) — Latin only | Press Start 2P | *(no CJK substitute)* | n/a |
| Terminal / Nav hint (VT323) — Latin only | VT323 | *(no CJK substitute)* | n/a |

### Mixed-Content Strategy

**Strategy A — single CJK family for all Latin-system roles.** Retro Windows is a system-font deck (MS Sans Serif / Segoe UI / Tahoma). Pairing every Latin role with a single CJK family — Noto Sans SC — preserves the "this is software UI" register: a Win9x application would have rendered its Simplified Chinese localization in a single system CJK face (MS YaHei / SimSun), not in a multi-family display + body pairing. The two nostalgic accent fonts (Press Start 2P, VT323) are Latin-only by design; never attempt a pixel-font CJK substitute — there is no acceptable equivalent that maintains the era.

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

Then append `'Noto Sans SC'` to the body font stack:
```css
font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, Geneva, Verdana, 'Noto Sans SC', sans-serif;
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

- **Window title bars become a translation puzzle.** The `FILENAME.EXT` convention is Latin-only — `METRICS.LOG` has no idiomatic Chinese equivalent. Options: (1) keep filenames in Latin (`METRICS.LOG`, `AGENDA.TXT`) for the system-UI nostalgia, and let the slide body carry Chinese content; (2) use a Chinese descriptor + Latin extension (`季度指标.LOG`, `议程.TXT`) which reads as a localized application. Option (1) is more authentic to the Win9x era; option (2) is more readable for Chinese audiences.
- **The 0.5px letter-spacing on `title-bar` typography must drop to 0** when the title bar contains CJK characters.
- **Status badges (READY, LIVE, OK, WARNING)** translate cleanly to short CJK words (就绪, 在线, 通过, 警告) at weight 700 in the assigned status color — the semantic green/red/yellow/cyan signal carries through.
- **Group-box notched titles work identically in Chinese** — `客户数据`, `销售指标`. The notch masking depends on background painting, not on glyph metrics.
- **The CRT scanline overlay is glyph-agnostic** and adds the same nostalgic texture to Chinese type as to Latin.
- **Charts axis labels and chip text** should drop to Noto Sans SC 400 at 11–12px; the fixed-pixel sizing convention applies equally to CJK.

### Known CJK Gap

The two nostalgic accent fonts (Press Start 2P, VT323) are fundamentally Latin-only — they exist as 8-bit pixel and CRT terminal callbacks to an era when CJK rendering required specialized bitmap fonts that have no modern web equivalent. If a deck needs a pixel display moment in Chinese, the only honest option is to use Noto Sans SC at large size and let go of the pixel-font character; do not substitute another "pixel-style" Chinese font (which will read as wrong-era and broken). Reserve Press Start 2P / VT323 for Latin-only moments (a splash screen with `LOADING...`, a footer with `ARROW KEYS to navigate`), and let CJK slides use Noto Sans SC throughout.

## Iteration Guide

1. Any new slide is wrapped in a `{components.win-window}` with a navy title bar containing a `{components.win-icon}` (single-letter glyph), an uppercase filename-style title (with extension like `.EXE`, `.DOC`, `.LOG`, `.TXT`, `.CSV`, `.INI`, `.PRJ`, `.BMP`), and the three-button cluster (`_`, `[]`, `X`).
2. Any new content region inside a window uses a `{components.group-box}` (sunken with notched title) for clustered related items, a `{components.panel-raised}` for tool strips and dashboards, or a `{components.panel-sunken}` for white-well content displays.
3. Any new primary headline uses `{typography.text-lg}` (22px) in `{colors.blue-navy}` weight 700. Hero / splash headlines use `{typography.text-xl}` (32px) or Press Start 2P (20–24px).
4. Any new metric tile uses the `{components.group-box}` + `{typography.metric-xl}` navy-700 + green delta + 12px gray context pattern.
5. Any new chart uses Chart.js with the navy ladder for primary data and the retro status colors for categorical segments. Always wrap the canvas in a `{components.panel-raised}`.
6. Any new bullet list uses the `{components.retro-list}` chevron pattern; any checkbox uses the `{components.retro-check}` pattern; any hierarchical tree uses the `{components.tree-item}` folder/file emoji pattern.
7. Any new button is a `{components.btn-retro}` — beveled gray, 6px × 24px padding, 14px MS Sans Serif. Buttons appear in clusters (OK / Cancel / Help, or Export / Print).
8. Any new status badge uses `{colors.green-retro}` weight 700 for OK, `{colors.red-retro}` for error, `{colors.yellow-retro}` for moderate. Always weight 700; never decorative.
9. Status footers (panel-raised strips at the bottom of a window body) carry three or four data points separated by `•` bullets — data source, last updated, count, classification.
10. Every slide must be visually dense — multiple panels stacked, a status footer at the bottom, button strips or nav-cluster decoration where space allows. Spareness breaks the aesthetic.

## Known Gaps

- The system loads two Google Fonts (Press Start 2P, VT323) from a CDN. These are optional nostalgic accents; the body font stack (MS Sans Serif, Segoe UI, Tahoma, Geneva, Verdana, sans-serif) renders correctly without any external dependency, and the deck remains aesthetically coherent if both Google fonts fail to load.
- Chart.js (4.4.7) loaded from a CDN provides the chart engine. Charts will not render if Chart.js fails to load. The slide will still render but with empty canvas regions.
- The CRT scanline overlay is a stylistic choice that does not match presenter-projector output well — on actual projection screens, the overlay can read as image noise rather than as nostalgic texture. Consider toggling the overlay off when projecting.
- The Win9x bevel illusion depends on rendering at the right zoom level — bevels are 1–2px wide and can appear as solid borders or disappear entirely at extreme zoom levels or on very high-DPI displays without browser sub-pixel rendering.
- Hover states are absent by design (the aesthetic predates universal hover). Modern audiences expecting hover affordances may find the deck unresponsive-feeling on mouse interaction.
- The retro-list `>` chevron, retro-check `x`, and tree-view emoji glyphs are character-based, not vector — they will render with whatever default font metrics the runtime provides for `>`, `x`, `📁`, `📄`.
- The marquee animation runs continuously and cannot be paused. Some accessibility audits will flag this as a `prefers-reduced-motion` violation.
- The `lib-cabinets` is set in `bgImage`-derived inline SVG noise / hatching patterns inside CSS — these are inlined data URIs and the rendered look will vary slightly across browsers.
