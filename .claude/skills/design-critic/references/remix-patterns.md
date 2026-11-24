# Remix Patterns

Common design improvements with before/after guidance.

## Quick Wins (Under 5 Minutes)

### 1. Contrast Boost

**Before**: Text at 3.5:1 contrast, failing WCAG AA
**After**: Text at 4.5:1+ contrast

**How**:
```css
/* Before - failing */
color: #999;
background: #fff;  /* 2.85:1 - FAIL */

/* After - passing */
color: #767676;
background: #fff;  /* 4.54:1 - PASS */
```

**Impact**: +5-10 Accessibility score

---

### 2. Focus State Addition

**Before**: No visible focus indicator
**After**: Clear 2-3px focus ring

**How**:
```css
:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

**Impact**: +5-8 Accessibility score, +3 Usability

---

### 3. Touch Target Expansion

**Before**: 32x32px buttons
**After**: 44x44px minimum

**How**:
```css
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}
```

**Impact**: +5 Accessibility, +5 Usability

---

### 4. Spacing Consistency

**Before**: Random spacing (12px, 17px, 23px)
**After**: 8px grid system

**How**:
```css
/* Use only these values */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
```

**Impact**: +5-10 Layout score

---

## Medium Effort (Under 30 Minutes)

### 5. Typography Scale Fix

**Before**: Random font sizes (13px, 15px, 17px, 22px)
**After**: Mathematical scale (1.25 ratio)

**How**:
```css
--text-xs: 12px;    /* 16 / 1.25 / 1.067 */
--text-sm: 14px;    /* 16 / 1.14 */
--text-base: 16px;  /* Base */
--text-lg: 20px;    /* 16 * 1.25 */
--text-xl: 25px;    /* 16 * 1.25^2 */
--text-2xl: 31px;   /* 16 * 1.25^3 */
--text-3xl: 39px;   /* 16 * 1.25^4 */
```

**Impact**: +10-15 Typography score

---

### 6. Color Harmony Fix

**Before**: 5 unrelated accent colors
**After**: 60-30-10 color rule

**The Rule**:
- 60%: Dominant (background, large areas)
- 30%: Secondary (cards, sections)
- 10%: Accent (CTAs, highlights)

**How**:
```css
:root {
  /* 60% - Dominant */
  --color-bg: #fafafa;
  --color-surface: #ffffff;

  /* 30% - Secondary */
  --color-text: #1a1a1a;
  --color-border: #e5e5e5;

  /* 10% - Accent */
  --color-primary: #0066cc;
  --color-primary-hover: #0052a3;
}
```

**Impact**: +10-15 Color Harmony score

---

### 7. CTA Hierarchy Fix

**Before**: Multiple competing buttons of same weight
**After**: Clear primary/secondary/tertiary

**How**:
```css
/* Primary - high visual weight */
.btn-primary {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

/* Secondary - medium weight */
.btn-secondary {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

/* Tertiary - low weight */
.btn-tertiary {
  background: transparent;
  color: var(--color-primary);
  text-decoration: underline;
}
```

**Impact**: +10 Usability, +5 Layout

---

### 8. Whitespace Breathing Room

**Before**: Content cramped, no margins
**After**: Generous padding, clear sections

**How**:
```css
/* Section spacing */
section {
  padding: 64px 0;
}

/* Card breathing room */
.card {
  padding: 24px;
  margin-bottom: 24px;
}

/* Paragraph spacing */
p + p {
  margin-top: 16px;
}
```

**Impact**: +10-15 Layout score

---

## High Impact (2+ Hours)

### 9. Full Accessibility Overhaul

**Scope**:
1. Audit all color contrasts
2. Add focus states everywhere
3. Implement skip links
4. Add ARIA labels
5. Test with screen reader

**Impact**: +20-30 Accessibility score

---

### 10. Design System Implementation

**Scope**:
1. Create design tokens (colors, spacing, typography)
2. Build component library
3. Document usage patterns
4. Enforce consistency

**Impact**: +15-20 across all dimensions

---

### 11. Micro-interaction Layer

**Scope**:
1. Add hover states to all interactive elements
2. Implement loading states
3. Add success/error feedback
4. Consider subtle animations

**Examples**:
```css
/* Button micro-interaction */
.button {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**Impact**: +15 Modernity, +10 Usability

---

### 12. Trend Modernization

**From Dated to Current**:

| Dated Pattern | Modern Replacement |
|---------------|-------------------|
| Hamburger on desktop | Visible nav items + overflow dropdown |
| Hero carousel | Single hero with motion |
| Skeuomorphic shadows | Subtle, modern shadows |
| Busy gradients | Solid colors or subtle gradient |
| Stock photos | Illustrations or authentic photos |
| Flat design | Subtle depth (neo-brutalism, neumorphism) |

**Impact**: +15-25 Modernity score

---

## Pattern-Specific Remixes

### Card Improvement

**Before**:
- No shadow or weak shadow
- Cramped content
- No hover state

**After**:
```css
.card {
  padding: 24px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

---

### Form Improvement

**Before**:
- Unclear labels
- No validation states
- Poor error messaging

**After**:
```css
/* Clear label */
label {
  font-weight: 500;
  margin-bottom: 4px;
  display: block;
}

/* Input with focus */
input {
  border: 2px solid #e5e5e5;
  border-radius: 4px;
  padding: 12px;
  transition: border-color 0.15s ease;
}

input:focus {
  border-color: #0066cc;
  outline: none;
}

/* Error state */
input.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 14px;
  margin-top: 4px;
}
```

---

### Navigation Improvement

**Before**:
- Everything same weight
- No active state
- Poor mobile experience

**After**:
```css
/* Clear nav styling */
nav a {
  padding: 8px 16px;
  color: var(--color-text);
  transition: color 0.15s ease;
}

nav a:hover {
  color: var(--color-primary);
}

nav a.active {
  color: var(--color-primary);
  font-weight: 600;
  border-bottom: 2px solid var(--color-primary);
}
```
