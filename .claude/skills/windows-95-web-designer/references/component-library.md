# Win95 Component Library

Complete CSS implementations for all Windows 95 UI components.

## CSS Variables (Required)

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

  /* Typography */
  --font-win95-ui: 'Tahoma', 'Segoe UI', 'Arial', sans-serif;
  --font-win95-mono: 'Fixedsys Excelsior', 'Courier New', monospace;

  /* Spacing */
  --win95-spacing-xs: 2px;
  --win95-spacing-sm: 4px;
  --win95-spacing-md: 8px;
  --win95-spacing-lg: 16px;
}
```

---

## Window Frame

```css
.win95-window {
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               var(--win95-dark-shadow) var(--win95-highlight);
  box-shadow:
    inset 1px 1px 0 var(--win95-button-face),
    inset -1px -1px 0 var(--win95-shadow);
  display: flex;
  flex-direction: column;
}

.win95-window-titlebar {
  background: linear-gradient(90deg, var(--win95-title-dark) 0%, var(--win95-title-light) 100%);
  color: white;
  font-family: var(--font-win95-ui);
  font-weight: bold;
  font-size: 11px;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.win95-window-titlebar.inactive {
  background: linear-gradient(90deg, #808080 0%, #b5b5b5 100%);
}

.win95-window-title {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.win95-window-title img {
  width: 16px;
  height: 16px;
}

.win95-window-title span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win95-window-controls {
  display: flex;
  gap: 2px;
}

.win95-window-content {
  flex: 1;
  background: var(--win95-window-bg);
  margin: 2px;
  overflow: auto;
}

.win95-window-statusbar {
  background: var(--win95-gray);
  border-top: 1px solid var(--win95-shadow);
  padding: 2px 4px;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
}
```

---

## Window Control Buttons

```css
.win95-control-btn {
  width: 16px;
  height: 14px;
  background: var(--win95-gray);
  border: none;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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
  padding-top: 1px;
  padding-left: 1px;
}

/* Using Unicode for button icons (web-safe) */
.win95-btn-minimize::before { content: '−'; }
.win95-btn-maximize::before { content: '□'; }
.win95-btn-restore::before { content: '❐'; font-size: 8px; }
.win95-btn-close::before { content: '×'; }
```

---

## Buttons

### Standard Button

```css
.win95-button {
  background: var(--win95-gray);
  border: none;
  padding: 4px 12px;
  font-family: var(--font-win95-ui);
  font-size: 11px;
  cursor: pointer;
  box-shadow:
    inset -1px -1px 0 var(--win95-dark-shadow),
    inset 1px 1px 0 var(--win95-highlight),
    inset -2px -2px 0 var(--win95-shadow),
    inset 2px 2px 0 var(--win95-button-face);
}

.win95-button:active {
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight);
  padding: 5px 11px 3px 13px; /* Shift content */
}

.win95-button:focus {
  outline: 1px dotted var(--win95-dark-shadow);
  outline-offset: -4px;
}

.win95-button:disabled {
  color: var(--win95-shadow);
  text-shadow: 1px 1px 0 var(--win95-highlight);
  cursor: not-allowed;
}
```

### Default Button (with focus ring)

```css
.win95-button-default {
  outline: 1px solid var(--win95-dark-shadow);
  outline-offset: -4px;
}

.win95-button-default:focus {
  outline: 1px dotted var(--win95-dark-shadow);
}
```

---

## Form Elements

### Text Input

```css
.win95-input {
  background: var(--win95-window-bg);
  border: none;
  padding: 4px 6px;
  font-family: var(--font-win95-ui);
  font-size: 11px;
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
}

.win95-input:focus {
  outline: none;
}

.win95-input:disabled {
  background: var(--win95-gray);
  color: var(--win95-shadow);
}
```

### Textarea

```css
.win95-textarea {
  background: var(--win95-window-bg);
  border: none;
  padding: 4px 6px;
  font-family: var(--font-win95-mono);
  font-size: 12px;
  resize: both;
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
}
```

### Checkbox

```css
.win95-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: var(--font-win95-ui);
  font-size: 11px;
}

.win95-checkbox input {
  appearance: none;
  width: 13px;
  height: 13px;
  background: var(--win95-window-bg);
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
  cursor: pointer;
}

.win95-checkbox input:checked {
  background: var(--win95-window-bg) url('data:image/svg+xml,...') center no-repeat;
  /* Use checkmark SVG or Unicode ✓ */
}

.win95-checkbox input:checked::after {
  content: '✓';
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Radio Button

```css
.win95-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: var(--font-win95-ui);
  font-size: 11px;
}

.win95-radio input {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--win95-window-bg);
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
  cursor: pointer;
}

.win95-radio input:checked::after {
  content: '';
  display: block;
  width: 4px;
  height: 4px;
  background: var(--win95-dark-shadow);
  border-radius: 50%;
  margin: 4px;
}
```

### Select Dropdown

```css
.win95-select {
  background: var(--win95-window-bg);
  border: none;
  padding: 2px 20px 2px 4px;
  font-family: var(--font-win95-ui);
  font-size: 11px;
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
  background-image: url('data:image/svg+xml,...'); /* Down arrow */
  background-repeat: no-repeat;
  background-position: right 4px center;
  appearance: none;
  cursor: pointer;
}
```

---

## Menu Bar

```css
.win95-menubar {
  background: var(--win95-gray);
  border-bottom: 1px solid var(--win95-shadow);
  padding: 2px;
  display: flex;
  font-family: var(--font-win95-ui);
  font-size: 11px;
}

.win95-menubar-item {
  padding: 2px 8px;
  cursor: pointer;
}

.win95-menubar-item:hover,
.win95-menubar-item.active {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}

.win95-menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--win95-gray);
  border: 2px solid;
  border-color: var(--win95-highlight) var(--win95-dark-shadow)
               var(--win95-dark-shadow) var(--win95-highlight);
  box-shadow: 2px 2px 0 var(--win95-dark-shadow);
  min-width: 150px;
  z-index: 100;
}

.win95-menu-item {
  padding: 4px 24px 4px 24px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
}

.win95-menu-item:hover {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}

.win95-menu-separator {
  height: 1px;
  background: var(--win95-shadow);
  margin: 4px 2px;
}

.win95-menu-item-shortcut {
  color: var(--win95-shadow);
  margin-left: 16px;
}

.win95-menu-item:hover .win95-menu-item-shortcut {
  color: var(--win95-selection-text);
}
```

---

## Toolbar

```css
.win95-toolbar {
  background: var(--win95-gray);
  border-bottom: 1px solid var(--win95-shadow);
  padding: 2px 4px;
  display: flex;
  gap: 2px;
  align-items: center;
}

.win95-toolbar-button {
  width: 24px;
  height: 22px;
  background: var(--win95-gray);
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.win95-toolbar-button:hover {
  border-color: var(--win95-highlight) var(--win95-shadow)
               var(--win95-shadow) var(--win95-highlight);
}

.win95-toolbar-button:active {
  border-color: var(--win95-shadow) var(--win95-highlight)
               var(--win95-highlight) var(--win95-shadow);
  padding-top: 1px;
  padding-left: 1px;
}

.win95-toolbar-separator {
  width: 2px;
  height: 20px;
  margin: 0 4px;
  border-left: 1px solid var(--win95-shadow);
  border-right: 1px solid var(--win95-highlight);
}
```

---

## Tabs

```css
.win95-tabs {
  display: flex;
  flex-direction: column;
}

.win95-tab-list {
  display: flex;
  padding-left: 4px;
}

.win95-tab {
  padding: 4px 12px;
  background: var(--win95-gray);
  border: 1px solid;
  border-color: var(--win95-highlight) var(--win95-shadow)
               transparent var(--win95-highlight);
  border-bottom: none;
  margin-right: -1px;
  cursor: pointer;
  font-family: var(--font-win95-ui);
  font-size: 11px;
  position: relative;
  top: 1px;
}

.win95-tab.active {
  background: var(--win95-gray);
  border-bottom: 1px solid var(--win95-gray);
  z-index: 1;
}

.win95-tab-panel {
  background: var(--win95-gray);
  border: 1px solid;
  border-color: var(--win95-highlight) var(--win95-shadow)
               var(--win95-shadow) var(--win95-highlight);
  padding: 16px;
}
```

---

## Progress Bar

```css
.win95-progress {
  height: 16px;
  background: var(--win95-gray);
  box-shadow:
    inset 1px 1px 0 var(--win95-shadow),
    inset -1px -1px 0 var(--win95-highlight);
  padding: 2px;
}

.win95-progress-bar {
  height: 100%;
  background: var(--win95-selection);
  background-image: repeating-linear-gradient(
    90deg,
    var(--win95-selection) 0px,
    var(--win95-selection) 8px,
    transparent 8px,
    transparent 10px
  );
}
```

---

## Scrollbars

```css
/* Custom scrollbar styling */
.win95-scrollable::-webkit-scrollbar {
  width: 16px;
  height: 16px;
}

.win95-scrollable::-webkit-scrollbar-track {
  background: repeating-linear-gradient(
    45deg,
    var(--win95-gray) 0px,
    var(--win95-gray) 2px,
    var(--win95-shadow) 2px,
    var(--win95-shadow) 4px
  );
}

.win95-scrollable::-webkit-scrollbar-thumb {
  background: var(--win95-gray);
  box-shadow:
    inset -1px -1px 0 var(--win95-dark-shadow),
    inset 1px 1px 0 var(--win95-highlight),
    inset -2px -2px 0 var(--win95-shadow),
    inset 2px 2px 0 var(--win95-button-face);
}

.win95-scrollable::-webkit-scrollbar-button {
  background: var(--win95-gray);
  box-shadow:
    inset -1px -1px 0 var(--win95-dark-shadow),
    inset 1px 1px 0 var(--win95-highlight);
  display: block;
  height: 16px;
  width: 16px;
}
```

---

## Group Box (Fieldset)

```css
.win95-groupbox {
  border: 1px solid var(--win95-shadow);
  border-top: 1px solid var(--win95-highlight);
  padding: 16px;
  margin: 8px 0;
}

.win95-groupbox legend {
  background: var(--win95-gray);
  padding: 0 4px;
  font-family: var(--font-win95-ui);
  font-size: 11px;
}
```

---

## List View

```css
.win95-listview {
  background: var(--win95-window-bg);
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
  padding: 2px;
  overflow: auto;
}

.win95-listview-item {
  padding: 2px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-family: var(--font-win95-ui);
  font-size: 11px;
}

.win95-listview-item:hover {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}

.win95-listview-item.selected {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}

.win95-listview-item img {
  width: 16px;
  height: 16px;
}
```

---

## Tree View

```css
.win95-treeview {
  background: var(--win95-window-bg);
  box-shadow:
    inset 1px 1px 0 var(--win95-dark-shadow),
    inset -1px -1px 0 var(--win95-highlight),
    inset 2px 2px 0 var(--win95-shadow);
  padding: 4px;
  font-family: var(--font-win95-ui);
  font-size: 11px;
}

.win95-treeview-node {
  padding-left: 16px;
}

.win95-treeview-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 4px;
  cursor: pointer;
}

.win95-treeview-item:hover {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
}

.win95-treeview-toggle {
  width: 9px;
  height: 9px;
  border: 1px solid var(--win95-shadow);
  background: var(--win95-window-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  cursor: pointer;
}

.win95-treeview-toggle::before {
  content: '+';
}

.win95-treeview-toggle.expanded::before {
  content: '−';
}
```

---

## Tooltip

```css
.win95-tooltip {
  position: absolute;
  background: #ffffe1; /* Tooltip yellow */
  border: 1px solid var(--win95-dark-shadow);
  padding: 4px 8px;
  font-family: var(--font-win95-ui);
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
}
```

---

## Desktop Icons

```css
.win95-desktop-icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, 75px);
  gap: 8px;
  padding: 8px;
}

.win95-desktop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  cursor: pointer;
  text-align: center;
}

.win95-desktop-icon img {
  width: 32px;
  height: 32px;
  filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.5));
}

.win95-desktop-icon span {
  font-family: var(--font-win95-ui);
  font-size: 11px;
  color: white;
  text-shadow: 1px 1px 0 black;
  word-break: break-word;
  max-width: 70px;
}

.win95-desktop-icon.selected span {
  background: var(--win95-selection);
  color: var(--win95-selection-text);
  text-shadow: none;
}

.win95-desktop-icon:focus {
  outline: 1px dotted white;
}
```
