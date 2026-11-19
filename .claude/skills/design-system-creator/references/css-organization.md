# CSS Organization Patterns

Proven patterns for organizing design system stylesheets.

---

## ITCSS (Inverted Triangle CSS)

Most widely adopted pattern. Organizes by specificity:

```
styles/
├── 0-settings/           # Variables, tokens (no CSS output)
│   ├── tokens.css
│   ├── breakpoints.css
│   └── custom-properties.css
│
├── 1-tools/              # Mixins, functions (no CSS output)
│   ├── mixins.css
│   └── functions.css
│
├── 2-generic/            # Reset, normalize (low specificity)
│   ├── reset.css
│   ├── normalize.css
│   └── box-sizing.css
│
├── 3-elements/           # Bare HTML elements (type selectors)
│   ├── typography.css
│   ├── forms.css
│   ├── tables.css
│   └── links.css
│
├── 4-objects/            # Layout patterns (class selectors)
│   ├── container.css
│   ├── grid.css
│   ├── stack.css
│   └── cluster.css
│
├── 5-components/         # UI components (class selectors)
│   ├── button.css
│   ├── card.css
│   ├── modal.css
│   ├── nav.css
│   └── form-controls.css
│
├── 6-utilities/          # Helper classes (high specificity)
│   ├── display.css
│   ├── spacing.css
│   └── visibility.css
│
└── main.css              # Import order matters!
```

### main.css Import Order
```css
/* Settings & Tools */
@import '0-settings/tokens.css';
@import '0-settings/custom-properties.css';

/* Generic */
@import '2-generic/reset.css';
@import '2-generic/box-sizing.css';

/* Elements */
@import '3-elements/typography.css';
@import '3-elements/forms.css';

/* Objects */
@import '4-objects/container.css';
@import '4-objects/grid.css';

/* Components */
@import '5-components/button.css';
@import '5-components/card.css';

/* Utilities (last - highest specificity) */
@import '6-utilities/spacing.css';
@import '6-utilities/display.css';
```

---

## BEM Naming Convention

**Block__Element--Modifier**

```css
/* Block: standalone component */
.card { }

/* Element: part of a block */
.card__header { }
.card__body { }
.card__footer { }
.card__title { }
.card__image { }

/* Modifier: variant or state */
.card--featured { }
.card--compact { }
.card__title--large { }
```

### BEM in HTML
```html
<article class="card card--featured">
  <header class="card__header">
    <h2 class="card__title card__title--large">Title</h2>
  </header>
  <div class="card__body">Content</div>
  <footer class="card__footer">
    <button class="btn btn--primary">Action</button>
  </footer>
</article>
```

---

## Component File Structure

Each component gets its own file with consistent structure:

```css
/* ==========================================================================
   Button Component
   ========================================================================== */

/**
 * 1. Base button styles
 * 2. Variants (primary, secondary, ghost)
 * 3. Sizes (sm, md, lg)
 * 4. States (hover, active, disabled, focus)
 * 5. Icon buttons
 */

/* -----------------------------------------------------------------------------
   1. Base
   -------------------------------------------------------------------------- */

.btn {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--button-icon-gap, 0.5rem);

  /* Sizing */
  padding: var(--button-padding-y) var(--button-padding-x);
  min-height: var(--button-min-height);

  /* Typography */
  font-family: var(--button-font-family);
  font-size: var(--button-font-size);
  font-weight: var(--button-font-weight);
  line-height: 1;

  /* Visual */
  border: var(--button-border-width) solid transparent;
  border-radius: var(--button-radius);

  /* Interaction */
  cursor: pointer;
  transition: var(--button-transition);
}

/* -----------------------------------------------------------------------------
   2. Variants
   -------------------------------------------------------------------------- */

.btn--primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-border);
}

.btn--secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border-color: var(--button-secondary-border);
}

.btn--ghost {
  background: transparent;
  color: var(--button-ghost-text);
}

/* -----------------------------------------------------------------------------
   3. Sizes
   -------------------------------------------------------------------------- */

.btn--sm {
  --button-padding-x: var(--space-3);
  --button-padding-y: var(--space-1);
  --button-font-size: var(--font-size-sm);
}

.btn--lg {
  --button-padding-x: var(--space-6);
  --button-padding-y: var(--space-3);
  --button-font-size: var(--font-size-lg);
}

/* -----------------------------------------------------------------------------
   4. States
   -------------------------------------------------------------------------- */

.btn:hover:not(:disabled) {
  background: var(--button-primary-bg-hover);
}

.btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Layout Objects

Reusable layout primitives (from Every Layout):

```css
/* Stack: vertical rhythm */
.stack {
  display: flex;
  flex-direction: column;
}

.stack > * + * {
  margin-block-start: var(--stack-space, 1rem);
}

/* Cluster: horizontal grouping */
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cluster-space, 1rem);
}

/* Sidebar: content + sidebar */
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sidebar-gap, 1rem);
}

.with-sidebar > :first-child {
  flex-basis: var(--sidebar-width, 20rem);
  flex-grow: 1;
}

.with-sidebar > :last-child {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: 50%;
}

/* Center: constrained width + centered */
.center {
  box-sizing: content-box;
  max-inline-size: var(--center-width, 60ch);
  margin-inline: auto;
  padding-inline: var(--center-padding, 1rem);
}

/* Grid: auto-fill responsive grid */
.grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(var(--grid-min, 250px), 100%), 1fr)
  );
  gap: var(--grid-gap, 1rem);
}
```

---

## Utility Classes (Sparingly)

```css
/* Display */
.d-none { display: none; }
.d-block { display: block; }
.d-flex { display: flex; }
.d-grid { display: grid; }

/* Spacing (use tokens) */
.mt-0 { margin-top: 0; }
.mt-4 { margin-top: var(--space-4); }
.mb-4 { margin-bottom: var(--space-4); }
.p-4 { padding: var(--space-4); }

/* Text */
.text-center { text-align: center; }
.text-muted { color: var(--color-text-muted); }
.font-bold { font-weight: 700; }

/* Visibility */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Performance Considerations

```css
/* Containment for complex components */
.card {
  contain: layout style;
}

/* Will-change for animations (use sparingly) */
.modal {
  will-change: transform, opacity;
}

/* Content-visibility for long lists */
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 100px;
}

/* Prefer transform over layout properties */
.slide-in {
  transform: translateX(0);
  transition: transform 300ms ease;
}

/* Layer hints for paint optimization */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  will-change: transform;  /* Creates new layer */
}
```
