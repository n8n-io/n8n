# Design Token Architecture

Complete guide to building scalable, maintainable token systems.

---

## Three-Tier Token System

The gold standard for scalable design tokens:

```css
/* TIER 1: Primitive Tokens (raw values) */
:root {
  /* Colors */
  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-900: #1e3a8a;

  /* Spacing (4px base unit) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  /* Radii */
  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
}

/* TIER 2: Semantic Tokens (intent) */
:root {
  /* Colors */
  --color-primary: var(--color-blue-500);
  --color-primary-hover: var(--color-blue-600);
  --color-background: var(--color-white);
  --color-surface: var(--color-gray-50);
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-600);
  --color-border: var(--color-gray-200);

  /* Spacing */
  --space-component-padding: var(--space-4);
  --space-component-gap: var(--space-3);
  --space-section-gap: var(--space-8);
  --space-page-margin: var(--space-6);

  /* Typography */
  --font-size-body: var(--font-size-base);
  --font-size-heading: var(--font-size-2xl);
  --font-size-caption: var(--font-size-sm);
}

/* TIER 3: Component Tokens (specific) */
:root {
  /* Button */
  --button-bg: var(--color-primary);
  --button-bg-hover: var(--color-primary-hover);
  --button-text: var(--color-white);
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
  --button-radius: var(--radius-md);

  /* Card */
  --card-bg: var(--color-surface);
  --card-border: var(--color-border);
  --card-padding: var(--space-component-padding);
  --card-radius: var(--radius-lg);

  /* Input */
  --input-border: var(--color-border);
  --input-border-focus: var(--color-primary);
  --input-padding: var(--space-3);
  --input-radius: var(--radius-md);
}
```

---

## Dark Mode with Semantic Tokens

```css
/* Light theme (default) */
:root {
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  --color-primary: #3b82f6;
}

/* Dark theme */
[data-theme="dark"] {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
  --color-primary: #60a5fa;  /* Lighter for dark bg */
}

/* Components just work */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
```

---

## Spacing Scale Philosophy

**4px base unit** is the industry standard:

| Token | Value | Use Case |
|-------|-------|----------|
| space-1 | 4px | Tight inline spacing |
| space-2 | 8px | Icon gaps, dense UIs |
| space-3 | 12px | Form element padding |
| space-4 | 16px | Standard component padding |
| space-6 | 24px | Section gaps |
| space-8 | 32px | Card padding, large gaps |
| space-12 | 48px | Section margins |
| space-16 | 64px | Page sections |

**8-point grid**: Only use multiples of 8px for major layout. 4px increments for fine-tuning.

---

## Typography Scale

Use modular scale (1.25 ratio is common):

```css
:root {
  --type-scale-ratio: 1.25;  /* Major third */

  --font-size-xs: 0.64rem;    /* 10.24px */
  --font-size-sm: 0.8rem;     /* 12.8px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.25rem;    /* 20px */
  --font-size-xl: 1.563rem;   /* 25px */
  --font-size-2xl: 1.953rem;  /* 31.25px */
  --font-size-3xl: 2.441rem;  /* 39px */
  --font-size-4xl: 3.052rem;  /* 48.8px */
}
```

---

## Multi-Brand / White-Label

```css
/* Base tokens (shared) */
:root {
  --space-4: 1rem;
  --radius-md: 0.375rem;
  --font-family-sans: system-ui, sans-serif;
}

/* Brand A tokens */
[data-brand="brand-a"] {
  --color-primary: #ff6b35;
  --color-secondary: #004e89;
  --font-family-brand: 'Montserrat', sans-serif;
}

/* Brand B tokens */
[data-brand="brand-b"] {
  --color-primary: #7c3aed;
  --color-secondary: #10b981;
  --font-family-brand: 'Inter', sans-serif;
}

/* Usage - same component works for both brands */
.button-primary {
  background: var(--color-primary);
  font-family: var(--font-family-brand);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

---

## Token Naming Conventions

### Good Names (Semantic)
```css
--color-primary
--color-text-muted
--space-component-padding
--button-bg-hover
--input-border-focus
```

### Bad Names (Presentational)
```css
--blue-button           /* What if brand changes? */
--margin-20             /* Magic number */
--large-text            /* Relative to what? */
--red-error             /* Color in name */
```

### Naming Pattern
```
--{category}-{property}-{variant}

Examples:
--color-primary-hover
--space-component-gap
--font-size-heading
--button-bg-disabled
```

---

## Token Documentation Format

```markdown
## --color-primary

**Value**: `#3b82f6`
**Category**: Color / Brand
**Dark theme**: `#60a5fa`

**Description**: Primary brand color used for CTAs and interactive elements.

**Usage**:
- Primary buttons
- Links
- Active states
- Focus rings

**Do**:
- Use for main call-to-action
- Ensure 4.5:1 contrast with text

**Don't**:
- Use for large background areas
- Use for decorative elements
- Combine with other saturated colors

**Related tokens**:
- `--color-primary-hover`
- `--color-primary-active`
- `--button-bg`
```
