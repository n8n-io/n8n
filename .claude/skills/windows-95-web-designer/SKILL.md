---
name: windows-95-web-designer
description: Modern web applications with authentic Windows 95 aesthetic. Gradient title bars, Start menu paradigm, taskbar patterns, 3D beveled chrome. Extrapolates Win95 to AI chatbots, mobile UIs, responsive
  layouts. Activate on 'windows 95', 'win95', 'start menu', 'taskbar', 'retro desktop', '95 aesthetic', 'clippy'. NOT for Windows 3.1 (use windows-3-1-web-designer), vaporwave/synthwave, macOS, flat design.
allowed-tools: Read,Write,Edit,Glob,Grep
metadata:
  category: Design & Creative
  tags:
  - windows
  - web
  - designer
  pairs-with:
  - skill: windows-3-1-web-designer
    reason: Both create retro Microsoft OS-themed web apps evolving from Win31 to Win95 design language
  - skill: neobrutalist-web-designer
    reason: Win95 thick borders and high-contrast colors share DNA with neobrutalist design principles
  - skill: web-design-expert
    reason: Win95 aesthetic requires general web design expertise for modern responsive implementation
---

# Windows 95 Web Designer

Creates modern 2026 web applications with authentic Windows 95 aesthetic. Not recreating 1995—**extrapolating Win95 to modern contexts**: AI assistants as Clippy descendants, mobile as pocket PCs, responsive as multi-monitor.

## When to Use

**Use for:**
- Web apps with Win95 authenticity (windags.ai, retro dashboards)
- AI chatbot interfaces (Clippy-style assistants, wizard dialogs)
- Mobile-responsive Win95 UIs (pocket PC paradigm)
- Start menu navigation patterns
- Taskbar-based layouts
- Desktop icon grids
- Win95 Plus! theme variations

**Do NOT use for:**
- Windows 3.1 aesthetic → use **windows-3-1-web-designer** (flatter, Program Manager style)
- Vaporwave/synthwave → use **vaporwave-glassomorphic-ui-designer** (neons, gradients)
- macOS/iOS styling → use **native-app-designer**
- Flat/Material design → use **web-design-expert**

## Win95 vs Win31: Critical Differences

| Feature | Windows 3.1 | Windows 95 |
|---------|-------------|------------|
| Title bar | Solid navy (#000080) | **Gradient** (dark→light blue) |
| Window controls | Single menu button | **Three buttons** (−, □, ×) |
| Navigation | Program Manager | **Start Menu + Taskbar** |
| Fonts | Bitmap/System | **MS Sans Serif, Tahoma** |
| Icons | 32×32 flat | **32×32 with drop shadow** |
| Depth | Bevels only | Bevels **+ subtle gradients** |

---

## Core Design System

### Color Palette

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Desktop Teal | #008080 | `--win95-desktop` | Desktop background |
| System Gray | #c0c0c0 | `--win95-gray` | Window chrome, buttons |
| Title Blue (Dark) | #000080 | `--win95-title-dark` | Title gradient start |
| Title Blue (Light) | #1084d0 | `--win95-title-light` | Title gradient end |
| Button Face | #dfdfdf | `--win95-button-face` | Button surface |
| Button Highlight | #ffffff | `--win95-highlight` | Top/left bevels |
| Button Shadow | #808080 | `--win95-shadow` | Bottom/right bevels |
| Button Dark Shadow | #000000 | `--win95-dark-shadow` | Outer shadow edge |
| Window Background | #ffffff | `--win95-window-bg` | Content areas |
| Selection Blue | #000080 | `--win95-selection` | Selected items |
| Selection Text | #ffffff | `--win95-selection-text` | Text on selection |

### The Win95 Title Bar Gradient

**THE signature Win95 element** - horizontal gradient from dark to light blue:

```css
.win95-titlebar {
  background: linear-gradient(90deg, #000080 0%, #1084d0 100%);
  color: white;
  font-family: 'Tahoma', 'MS Sans Serif', sans-serif;
  font-weight: bold;
  font-size: 11px;
  padding: 3px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.win95-titlebar-inactive {
  background: linear-gradient(90deg, #808080 0%, #b5b5b5 100%);
}
```

### Window Control Buttons

Win95 has THREE distinct buttons (not Win31's single menu):

```css
.win95-controls {
  display: flex;
  gap: 2px;
}

.win95-control-btn {
  width: 16px;
  height: 14px;
  background: var(--win95-gray);
  border: none;
  font-size: 9px;
  font-family: 'Marlett', sans-serif; /* Win95 symbol font */

  /* 3D bevel */
  box-shadow:
    inset -1px -1px 0 var(--win95-dark-shadow),
    inset 1px 1px 0 var(--win95-highlight),
    inset -2px -2px 0 var(--win95-shadow),
    inset 2px 2px 0 var(--win95-button-face);
}

.win95-control-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight);
}
```

### Typography

| Use | Font | Fallback | Size |
|-----|------|----------|------|
| UI Labels | Tahoma | MS Sans Serif, Arial | 11px |
| Title bars | Tahoma Bold | Arial Bold | 11px |
| Menus | Tahoma | Arial | 11px |
| Code | Fixedsys | Courier New | 12px |
| Pixel headings | MS Sans Serif | VT323 (web) | 12-14px |

**Web-safe approximations:**
```css
:root {
  --font-win95-ui: 'Tahoma', 'Segoe UI', 'Arial', sans-serif;
  --font-win95-mono: 'Fixedsys Excelsior', 'Courier New', monospace;
  --font-win95-pixel: 'VT323', 'Courier New', monospace;
}
```

---

## Modern Extrapolations

### AI Chatbots: The Clippy Paradigm

Win95 would present AI as a **helpful assistant character** in a wizard dialog:

```
┌─ AI Assistant ──────────────────────────[−][□][×]─┐
│ ┌────────────────────────────────────────────────┐│
│ │  ┌─────┐                                       ││
│ │  │ 📎  │  "It looks like you're writing a     ││
│ │  │     │   letter. Would you like help?"      ││
│ │  └─────┘                                       ││
│ │                                                ││
│ │  ○ Get help with writing                       ││
│ │  ○ Just type without help                      ││
│ │  ○ Don't show this tip again                   ││
│ │                                                ││
│ └────────────────────────────────────────────────┘│
│                              [  OK  ] [ Cancel ] │
└──────────────────────────────────────────────────┘
```

**Key patterns:**
- Character avatar (not just chat bubbles)
- Radio button choices (not freeform)
- Wizard step indicators
- "Tip of the Day" styling
- Yellow notepad backgrounds for suggestions

### Mobile: The Pocket PC Paradigm

Win95 on mobile extrapolates to **pocket-sized desktop**:

```
┌────────────────────────┐
│ Start │ 📶 🔋 3:45 PM  │  ← Status bar as taskbar
├────────────────────────┤
│ ┌──────┐ ┌──────┐     │
│ │ 📁   │ │ 🌐   │     │  ← Desktop icon grid
│ │Files │ │Browse│     │
│ └──────┘ └──────┘     │
│ ┌──────┐ ┌──────┐     │
│ │ 💬   │ │ ⚙️   │     │
│ │Chat  │ │Setup │     │
│ └──────┘ └──────┘     │
├────────────────────────┤
│ [Start] [📧2] [💬] [📁]│  ← Taskbar with open apps
└────────────────────────┘
```

**Key patterns:**
- Start button in bottom-left (hamburger is NOT Win95)
- Taskbar shows open apps as buttons
- Desktop is icon grid (not app drawer)
- Status bar mimics system tray
- Swipe up = Start menu (not gestures)

### Responsive: Multi-Monitor as Breakpoints

Win95 mentally modeled multiple displays. Apply this:

| Breakpoint | Win95 Metaphor | Layout |
|------------|----------------|--------|
| Mobile (&lt;640px) | Pocket PC | Single window, taskbar bottom |
| Tablet (640-1024px) | Laptop | Cascading windows, taskbar |
| Desktop (&gt;1024px) | Full desktop | Multiple windows, desktop icons |

### Dark Mode: Plus! Themes

Windows 95 Plus! had theme packs. Dark mode extrapolation:

```css
/* Plus! "Mystery" theme (dark) */
[data-theme="dark"] {
  --win95-desktop: #1a1a2e;
  --win95-gray: #3d3d5c;
  --win95-title-dark: #16213e;
  --win95-title-light: #1a1a4e;
  --win95-button-face: #4a4a6a;
  --win95-highlight: #5a5a7a;
  --win95-shadow: #2a2a4a;
  --win95-window-bg: #2d2d4d;
}

/* Plus! "Golden Era" theme */
[data-theme="golden"] {
  --win95-title-dark: #8b4513;
  --win95-title-light: #daa520;
  --win95-desktop: #2e1a0d;
}
```

---

## Component Patterns

### Start Menu

```css
.win95-start-menu {
  position: fixed;
  bottom: 28px; /* Above taskbar */
  left: 0;
  width: 200px;
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               var(--win95-dark-shadow) var(--win95-highlight);
  box-shadow: 2px 2px 0 var(--win95-dark-shadow);
}

.win95-start-menu-sidebar {
  width: 24px;
  background: linear-gradient(0deg, #000080 0%, #1084d0 100%);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: white;
  font-weight: bold;
  padding: 4px;
}

.win95-start-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: pointer;
}

.win95-start-menu-item:hover {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}
```

### Taskbar

```css
.win95-taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 28px;
  background: var(--win95-gray);
  border-top: 2px solid var(--win95-highlight);
  display: flex;
  align-items: center;
  padding: 2px 4px;
  gap: 4px;
}

.win95-start-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-weight: bold;
  font-size: 11px;
  /* 3D button styling */
}

.win95-taskbar-button {
  min-width: 140px;
  max-width: 160px;
  height: 22px;
  font-size: 11px;
  text-align: left;
  padding: 0 8px;
  /* Pressed = active window */
}

.win95-system-tray {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 2px solid var(--win95-shadow);
  padding-left: 8px;
}
```

### Dialog Boxes (for AI)

```css
.win95-dialog {
  min-width: 340px;
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               var(--win95-dark-shadow) var(--win95-highlight);
}

.win95-dialog-content {
  padding: 16px;
  display: flex;
  gap: 16px;
}

.win95-dialog-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.win95-dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px 16px;
}

.win95-button-primary {
  min-width: 75px;
  padding: 4px 12px;
  /* Add dotted focus ring for default button */
  outline: 1px dotted var(--win95-dark-shadow);
  outline-offset: -4px;
}
```

---

## Anti-Patterns

### Anti-Pattern: Hamburger Menus

**Novice thinking**: "Three lines for mobile navigation"
**Reality**: Win95 never had hamburgers—it has the Start button
**Instead**: Use Start menu pattern with labeled button

### Anti-Pattern: Floating Action Buttons

**Novice thinking**: "FAB for primary action"
**Reality**: Win95 actions are in toolbars and menus
**Instead**: Toolbar buttons or context menus

### Anti-Pattern: Card-Based Layouts

**Novice thinking**: "Cards with rounded corners and shadows"
**Reality**: Win95 uses windows and list views
**Instead**: List View, Details View, or Tiled Icons

### Anti-Pattern: Gradient Backgrounds Everywhere

**Novice thinking**: "Win95 has gradients so I'll use them on everything"
**Reality**: ONLY title bars have gradients. Everything else is solid.
**Instead**: Gradient only on active title bars; solid colors elsewhere

### Anti-Pattern: Soft Shadows

**Novice thinking**: `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`
**Reality**: Win95 has HARD pixel shadows only
**Instead**: `box-shadow: 2px 2px 0 #000000` (no blur)

---

## Quick Decision Tree

```
Is it a window chrome element?
├── Title bar? → Gradient (dark→light blue)
├── Button? → 3D bevel (white TL, black BR)
├── Input? → Inset bevel (dark TL, white BR)
└── Content area? → White or gray, flat

Is it navigation?
├── Primary nav? → Start Menu pattern
├── Section nav? → Tab control
├── Page nav? → Tree view or list
└── Actions? → Toolbar buttons

Is it a notification?
├── Important? → Modal dialog with icon
├── Informational? → Balloon tooltip (system tray)
├── Progress? → Progress bar in status bar
└── Success? → Sound + brief dialog
```

---

## CSS Variables Template

```css
:root {
  /* Core palette */
  --win95-desktop: #008080;
  --win95-gray: #c0c0c0;
  --win95-title-dark: #000080;
  --win95-title-light: #1084d0;
  --win95-button-face: #dfdfdf;
  --win95-highlight: #ffffff;
  --win95-shadow: #808080;
  --win95-dark-shadow: #000000;
  --win95-window-bg: #ffffff;
  --win95-selection: #000080;
  --win95-selection-text: #ffffff;

  /* Semantic */
  --win95-error: #ff0000;
  --win95-warning: #ffff00;
  --win95-success: #00ff00;
  --win95-info: #0000ff;

  /* Typography */
  --font-win95-ui: 'Tahoma', 'Segoe UI', 'Arial', sans-serif;
  --font-win95-mono: 'Fixedsys Excelsior', 'Courier New', monospace;

  /* Spacing (4px grid) */
  --win95-spacing-xs: 2px;
  --win95-spacing-sm: 4px;
  --win95-spacing-md: 8px;
  --win95-spacing-lg: 16px;
  --win95-spacing-xl: 24px;
}
```

---

## References

- `/references/component-library.md` - Full CSS for all Win95 components
- `/references/ai-assistant-patterns.md` - Clippy-style AI UX patterns
- `/references/mobile-pocket-pc.md` - Responsive Win95 for mobile
- `/references/plus-themes.md` - Dark mode and theme variations
- `/references/icon-system.md` - Win95 icon design and sizing

---

## Pairs With

- **windows-3-1-web-designer** - For older, flatter Win31 aesthetic
- **web-design-expert** - For brand direction alongside retro style
- **design-system-creator** - For generating full design token systems
- **frontend-architect** - For Cloudflare deployment of Win95 apps
