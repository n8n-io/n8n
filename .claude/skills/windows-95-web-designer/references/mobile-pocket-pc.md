# Mobile: The Pocket PC Paradigm

How to make Windows 95 responsive for modern mobile devices.

## Core Philosophy

Win95 on mobile isn't about shrinking desktop—it's **reimagining the pocket computer** that Windows CE hinted at. The paradigm is "desktop in your pocket," not "app drawer with icons."

Key principles:
1. **Start button stays** - Bottom-left, always visible
2. **Taskbar is navigation** - Shows open "programs"
3. **Desktop is home** - Icon grid, not infinite scroll
4. **Windows stack** - Modal overlays, not swipe navigation
5. **Status bar = System tray** - Notifications, clock, battery

---

## Layout Architecture

### Mobile Viewport (&lt; 640px)

```
┌────────────────────────────┐
│ ● ○ ○         📶 🔋 3:45 │  ← System tray (status bar)
├────────────────────────────┤
│                            │
│  ┌────┐  ┌────┐  ┌────┐   │
│  │ 📁 │  │ 🌐 │  │ ⚙️ │   │
│  │File│  │Web │  │Set │   │
│  └────┘  └────┘  └────┘   │
│                            │  ← Desktop (scrollable icon grid)
│  ┌────┐  ┌────┐  ┌────┐   │
│  │ 💬 │  │ 📧 │  │ 📅 │   │
│  │Chat│  │Mail│  │Cal │   │
│  └────┘  └────┘  └────┘   │
│                            │
│  ┌────┐                    │
│  │ 🗑️ │                    │
│  │Bin │                    │
│  └────┘                    │
│                            │
├────────────────────────────┤
│ [Start] [📧3] [💬] [📁]   │  ← Taskbar with open apps
└────────────────────────────┘
```

### CSS Grid Implementation

```css
.win95-mobile-layout {
  display: grid;
  grid-template-rows: 24px 1fr 32px;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport for mobile */
  background: var(--win95-desktop);
}

.win95-system-tray {
  background: var(--win95-gray);
  border-bottom: 2px solid var(--win95-shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
}

.win95-desktop-mobile {
  display: grid;
  grid-template-columns: repeat(auto-fill, 64px);
  gap: 8px;
  padding: 16px;
  align-content: start;
  overflow-y: auto;
}

.win95-taskbar-mobile {
  background: var(--win95-gray);
  border-top: 2px solid var(--win95-highlight);
  display: flex;
  align-items: center;
  padding: 2px 4px;
  gap: 2px;
  overflow-x: auto;
}
```

---

## Start Menu (Mobile)

Slides up from bottom, full-width:

```
┌────────────────────────────┐
│                            │
│   (Desktop dimmed)         │
│                            │
├────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Drag handle
│ ╔════════════════════════╗ │
│ ║ W                      ║ │
│ ║ i  Programs        ▶  ║ │
│ ║ n  ──────────────────  ║ │
│ ║ d  📄 Documents    ▶  ║ │
│ ║ o  ⚙️ Settings     ▶  ║ │
│ ║ w  🔍 Find             ║ │
│ ║ s  ❓ Help             ║ │
│ ║    ──────────────────  ║ │
│ ║ 9  🔌 Shut Down        ║ │
│ ║ 5                      ║ │
│ ╚════════════════════════╝ │
│ [🪟Start]                  │
└────────────────────────────┘
```

### Implementation

```css
.win95-start-menu-mobile {
  position: fixed;
  bottom: 32px; /* Above taskbar */
  left: 0;
  right: 0;
  max-height: 70vh;
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               var(--win95-dark-shadow) var(--win95-highlight);
  border-bottom: none;
  transform: translateY(100%);
  transition: transform 0.2s ease-out;
  display: flex;
}

.win95-start-menu-mobile.open {
  transform: translateY(0);
}

.win95-start-menu-sidebar-mobile {
  width: 28px;
  background: linear-gradient(0deg, #000080 0%, #1084d0 100%);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: white;
  font-weight: bold;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 4px;
}

.win95-start-menu-items-mobile {
  flex: 1;
  padding: 4px;
}

.win95-start-menu-item-mobile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  touch-action: manipulation;
}

.win95-start-menu-item-mobile:active {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}
```

---

## Windows on Mobile

Windows become full-screen modals or bottom sheets:

### Full-Screen Window

```
┌────────────────────────────┐
│ ≡ My Documents     [−][×] │  ← Condensed title bar
├────────────────────────────┤
│ File  Edit  View  Help     │  ← Optional menu bar
├────────────────────────────┤
│                            │
│  📁 Folder 1               │
│  📁 Folder 2               │
│  📄 Document.txt           │
│  📄 Notes.doc              │
│                            │  ← Content area
│                            │
│                            │
│                            │
│                            │
├────────────────────────────┤
│ 4 objects        1.2 MB   │  ← Status bar
└────────────────────────────┘
```

### Bottom Sheet Window

For dialogs, settings, quick actions:

```
┌────────────────────────────┐
│                            │
│   (Previous content        │
│    dimmed behind)          │
│                            │
├────────────────────────────┤
│ ═══════════════════════════│  ← Drag indicator
│ ┌─ Properties ─────────[×]┐│
│ │                          ││
│ │ Name: Document.txt       ││
│ │ Type: Text Document      ││
│ │ Size: 1.2 KB             ││
│ │ Modified: 1/31/2026      ││
│ │                          ││
│ │     [  OK  ] [Cancel]    ││
│ └──────────────────────────┘│
└────────────────────────────┘
```

### Implementation

```css
.win95-window-mobile {
  position: fixed;
  inset: 0;
  background: var(--win95-gray);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.win95-window-mobile-titlebar {
  background: linear-gradient(90deg, #000080 0%, #1084d0 100%);
  color: white;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}

.win95-bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60vh;
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               transparent var(--win95-highlight);
  border-radius: 8px 8px 0 0; /* Exception: rounded for touch */
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}

.win95-bottom-sheet.open {
  transform: translateY(0);
}

.win95-bottom-sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--win95-shadow);
  margin: 8px auto;
  border-radius: 2px;
}
```

---

## Touch Adaptations

### Larger Touch Targets

```css
/* Minimum 44px touch targets (Apple HIG) */
.win95-touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Desktop icons on mobile */
.win95-desktop-icon-mobile {
  width: 64px;
  text-align: center;
  padding: 8px;
}

.win95-desktop-icon-mobile img {
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
}

.win95-desktop-icon-mobile span {
  font-size: 11px;
  word-break: break-word;
  line-height: 1.2;
}

/* Taskbar buttons */
.win95-taskbar-button-mobile {
  min-width: 60px;
  max-width: 80px;
  height: 28px;
  padding: 0 8px;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Gestures Mapped to Win95 Actions

| Gesture | Win95 Equivalent | Action |
|---------|------------------|--------|
| Tap | Click | Select/Open |
| Long press | Right-click | Context menu |
| Swipe up from bottom | Start button | Open Start menu |
| Swipe down from top | — | System tray (notifications) |
| Pinch | — | Not supported (no zoom) |
| Two-finger tap | Right-click | Context menu |

```javascript
// Swipe up for Start menu
let startY = 0;

document.addEventListener('touchstart', (e) => {
  if (e.touches[0].clientY > window.innerHeight - 50) {
    startY = e.touches[0].clientY;
  }
});

document.addEventListener('touchend', (e) => {
  if (startY > 0) {
    const endY = e.changedTouches[0].clientY;
    if (startY - endY > 50) {
      openStartMenu();
    }
    startY = 0;
  }
});
```

---

## Responsive Breakpoints

| Breakpoint | Metaphor | Layout Changes |
|------------|----------|----------------|
| &lt; 480px | Pocket PC | Single column, large icons, simplified menu |
| 480-640px | Small tablet | 2-column icons, condensed taskbar |
| 640-1024px | Tablet landscape | Side-by-side windows possible |
| > 1024px | Desktop | Full Win95 experience |

```css
/* Pocket PC */
@media (max-width: 479px) {
  .win95-desktop-mobile {
    grid-template-columns: repeat(3, 1fr);
  }

  .win95-taskbar-button-mobile {
    display: none; /* Only show icons */
  }

  .win95-taskbar-button-mobile .icon {
    display: block;
  }
}

/* Small tablet */
@media (min-width: 480px) and (max-width: 639px) {
  .win95-desktop-mobile {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Tablet landscape */
@media (min-width: 640px) and (max-width: 1023px) {
  .win95-mobile-layout {
    grid-template-columns: 1fr 1fr;
  }

  .win95-window-mobile {
    position: relative;
    max-width: 50vw;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  /* Switch to full desktop layout */
  .win95-mobile-layout {
    display: none;
  }

  .win95-desktop-layout {
    display: block;
  }
}
```

---

## Taskbar Overflow

When too many apps are open:

```css
.win95-taskbar-mobile {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.win95-taskbar-mobile::-webkit-scrollbar {
  display: none;
}

/* Fade indicators for scroll */
.win95-taskbar-mobile::before,
.win95-taskbar-mobile::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  pointer-events: none;
}

.win95-taskbar-mobile::before {
  left: 60px; /* After Start button */
  background: linear-gradient(90deg, var(--win95-gray), transparent);
}

.win95-taskbar-mobile::after {
  right: 60px; /* Before system tray */
  background: linear-gradient(-90deg, var(--win95-gray), transparent);
}
```

---

## System Tray (Mobile)

Notifications and status icons:

```
┌────────────────────────────┐
│ 🔔 3  📶  🔋85%  3:45 PM  │
└────────────────────────────┘
```

Tap to expand:

```
┌────────────────────────────┐
│                            │
│   (Desktop dimmed)         │
│                            │
├────────────────────────────┤
│ ┌─ Notifications ───────┐  │
│ │                        │  │
│ │ 📧 New email from John │  │
│ │    2 minutes ago       │  │
│ │ ────────────────────── │  │
│ │ 💬 Chat message        │  │
│ │    5 minutes ago       │  │
│ │ ────────────────────── │  │
│ │ 📅 Meeting in 15 min   │  │
│ │    Calendar reminder   │  │
│ │                        │  │
│ │    [Clear All]         │  │
│ └────────────────────────┘  │
├────────────────────────────┤
│ 🔔 3  📶  🔋85%  3:45 PM  │
└────────────────────────────┘
```

```css
.win95-notification-panel {
  position: fixed;
  top: 24px;
  left: 0;
  right: 0;
  max-height: 50vh;
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               var(--win95-dark-shadow) var(--win95-highlight);
  overflow-y: auto;
  z-index: 200;
}

.win95-notification-item {
  padding: 12px;
  border-bottom: 1px solid var(--win95-shadow);
  display: flex;
  gap: 12px;
}

.win95-notification-item:active {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}
```

---

## Performance Considerations

1. **Reduce animations** - Win95 was snappy, not animated
2. **Minimize shadows** - Hard pixel shadows only
3. **Use system fonts** - Tahoma, Arial (fast rendering)
4. **Avoid gradients except title bars** - Flat colors render faster
5. **Lazy load windows** - Only render visible content

```css
@media (prefers-reduced-motion: reduce) {
  .win95-start-menu-mobile,
  .win95-bottom-sheet,
  .win95-window-mobile {
    transition: none;
  }
}

/* Optimize for touch scrolling */
.win95-scrollable {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```
