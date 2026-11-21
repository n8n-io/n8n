# Responsive Design Calculations

Reference for breakpoint math, fluid typography, and responsive layout patterns.

---

## Table of Contents

- [Breakpoint System](#breakpoint-system)
- [Fluid Typography](#fluid-typography)
- [Responsive Spacing](#responsive-spacing)
- [Container Queries](#container-queries)
- [Grid Systems](#grid-systems)

---

## Breakpoint System

### Standard Breakpoints

```
┌─────────────────────────────────────────────────────────────┐
│                    BREAKPOINT RANGES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  xs        sm         md         lg         xl        2xl   │
│  │─────────│──────────│──────────│──────────│─────────│     │
│  0      480px      640px      768px     1024px    1280px    │
│                                                      1536px │
│                                                             │
│  Mobile   Mobile+    Tablet    Laptop    Desktop   Large    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Breakpoint Values

| Name | Min Width | Target Devices |
|------|-----------|----------------|
| xs | 0 | Small phones |
| sm | 480px | Large phones |
| md | 640px | Small tablets |
| lg | 768px | Tablets, small laptops |
| xl | 1024px | Laptops, desktops |
| 2xl | 1280px | Large desktops |
| 3xl | 1536px | Extra large displays |

### Mobile-First Media Queries

```css
/* Base styles (mobile) */
.component {
  padding: var(--spacing-sm);
  font-size: var(--fontSize-sm);
}

/* Small devices and up */
@media (min-width: 480px) {
  .component {
    padding: var(--spacing-md);
  }
}

/* Medium devices and up */
@media (min-width: 768px) {
  .component {
    padding: var(--spacing-lg);
    font-size: var(--fontSize-base);
  }
}

/* Large devices and up */
@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-xl);
  }
}
```

### Breakpoint Utility Function

```javascript
const breakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

function mediaQuery(breakpoint, type = 'min') {
  const value = breakpoints[breakpoint];
  if (type === 'min') {
    return `@media (min-width: ${value}px)`;
  }
  return `@media (max-width: ${value - 1}px)`;
}

// Usage
const styles = `
  ${mediaQuery('md')} {
    display: flex;
  }
`;
```

---

## Fluid Typography

### Clamp Formula

```css
font-size: clamp(min, preferred, max);

/* Example: 16px to 24px between 320px and 1200px viewport */
font-size: clamp(1rem, 0.5rem + 2vw, 1.5rem);
```

### Fluid Scale Calculation

```
preferred = min + (max - min) * ((100vw - minVW) / (maxVW - minVW))

Simplified:
preferred = base + (scaling-factor * vw)

Where:
  scaling-factor = (max - min) / (maxVW - minVW) * 100
```

### Fluid Typography Scale

| Style | Mobile (320px) | Desktop (1200px) | Clamp Value |
|-------|----------------|------------------|-------------|
| h1 | 32px | 64px | `clamp(2rem, 1rem + 3.6vw, 4rem)` |
| h2 | 28px | 48px | `clamp(1.75rem, 1rem + 2.3vw, 3rem)` |
| h3 | 24px | 36px | `clamp(1.5rem, 1rem + 1.4vw, 2.25rem)` |
| h4 | 20px | 28px | `clamp(1.25rem, 1rem + 0.9vw, 1.75rem)` |
| body | 16px | 18px | `clamp(1rem, 0.95rem + 0.2vw, 1.125rem)` |
| small | 14px | 14px | `0.875rem` (fixed) |

### Implementation

```css
:root {
  /* Fluid type scale */
  --fluid-h1: clamp(2rem, 1rem + 3.6vw, 4rem);
  --fluid-h2: clamp(1.75rem, 1rem + 2.3vw, 3rem);
  --fluid-h3: clamp(1.5rem, 1rem + 1.4vw, 2.25rem);
  --fluid-body: clamp(1rem, 0.95rem + 0.2vw, 1.125rem);
}

h1 { font-size: var(--fluid-h1); }
h2 { font-size: var(--fluid-h2); }
h3 { font-size: var(--fluid-h3); }
body { font-size: var(--fluid-body); }
```

---

## Responsive Spacing

### Fluid Spacing Formula

```css
/* Spacing that scales with viewport */
spacing: clamp(minSpace, preferredSpace, maxSpace);

/* Example: 16px to 48px */
--spacing-responsive: clamp(1rem, 0.5rem + 2vw, 3rem);
```

### Responsive Spacing Scale

| Token | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| --space-xs | 4px | 4px | 4px |
| --space-sm | 8px | 8px | 8px |
| --space-md | 12px | 16px | 16px |
| --space-lg | 16px | 24px | 32px |
| --space-xl | 24px | 32px | 48px |
| --space-2xl | 32px | 48px | 64px |
| --space-section | 48px | 80px | 120px |

### Implementation

```css
:root {
  --space-section: clamp(3rem, 2rem + 4vw, 7.5rem);
  --space-component: clamp(1rem, 0.5rem + 1vw, 2rem);
  --space-content: clamp(1.5rem, 1rem + 2vw, 3rem);
}

.section {
  padding-top: var(--space-section);
  padding-bottom: var(--space-section);
}

.card {
  padding: var(--space-component);
  gap: var(--space-content);
}
```

---

## Container Queries

### Container Width Tokens

| Container | Max Width | Use Case |
|-----------|-----------|----------|
| sm | 640px | Narrow content |
| md | 768px | Blog posts |
| lg | 1024px | Standard pages |
| xl | 1280px | Wide layouts |
| 2xl | 1536px | Full-width dashboards |

### Container CSS

```css
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--spacing-md);
  padding-right: var(--spacing-md);
}

.container--sm { max-width: 640px; }
.container--md { max-width: 768px; }
.container--lg { max-width: 1024px; }
.container--xl { max-width: 1280px; }
.container--2xl { max-width: 1536px; }
```

### CSS Container Queries

```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query container width */
@container card (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}

@container card (min-width: 600px) {
  .card {
    gap: var(--spacing-lg);
  }
}
```

---

## Grid Systems

### 12-Column Grid

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-md);
}

/* Column spans */
.col-1 { grid-column: span 1; }
.col-2 { grid-column: span 2; }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-12 { grid-column: span 12; }

/* Responsive columns */
@media (min-width: 768px) {
  .col-md-4 { grid-column: span 4; }
  .col-md-6 { grid-column: span 6; }
  .col-md-8 { grid-column: span 8; }
}
```

### Auto-Fit Grid

```css
/* Cards that automatically wrap */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

/* With explicit min/max columns */
.auto-grid--constrained {
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, 280px), 1fr)
  );
}
```

### Common Layout Patterns

**Sidebar + Content:**
```css
.layout-sidebar {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
}

@media (min-width: 768px) {
  .layout-sidebar {
    grid-template-columns: 280px 1fr;
  }
}
```

**Holy Grail:**
```css
.layout-holy-grail {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

@media (min-width: 1024px) {
  .layout-holy-grail {
    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: auto 1fr auto;
  }

  .layout-holy-grail header,
  .layout-holy-grail footer {
    grid-column: 1 / -1;
  }
}
```

---

## Quick Reference

### Viewport Units

| Unit | Description |
|------|-------------|
| vw | 1% of viewport width |
| vh | 1% of viewport height |
| vmin | 1% of smaller dimension |
| vmax | 1% of larger dimension |
| dvh | Dynamic viewport height (accounts for mobile chrome) |
| svh | Small viewport height |
| lvh | Large viewport height |

### Responsive Testing Checklist

- [ ] 320px (small mobile)
- [ ] 375px (iPhone SE/8)
- [ ] 414px (iPhone Plus/Max)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape/laptop)
- [ ] 1280px (desktop)
- [ ] 1920px (large desktop)

### Common Device Widths

| Device | Width | Breakpoint |
|--------|-------|------------|
| iPhone SE | 375px | xs-sm |
| iPhone 14 | 390px | sm |
| iPhone 14 Pro Max | 430px | sm |
| iPad Mini | 768px | lg |
| iPad Pro 11" | 834px | lg |
| MacBook Air 13" | 1280px | xl |
| iMac 24" | 1920px | 2xl+ |

---

*See also: `token-generation.md` for breakpoint token details*
