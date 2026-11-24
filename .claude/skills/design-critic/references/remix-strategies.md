# Remix Strategies

Actionable improvement techniques organized by issue type.

## Quick Wins (&lt; 30 minutes)

### Low Contrast Fix

**Issue:** Text fails WCAG contrast requirements

**Strategy:**
```typescript
// 1. Identify failing pairs
const failingPairs = contrastCheck(design);

// 2. Reference catalog for WCAG-verified alternatives
const wcagPairs = colorPalettes.neobrutalism.vibrant;

// 3. Suggest replacement
const fix = {
  current: { bg: '#FFFFFF', text: '#9CA3AF' }, // 2.4:1 FAIL
  suggested: { bg: '#FFFFFF', text: '#374151' }, // 7.2:1 PASS AAA
  improvement: '+15 accessibility points'
};
```

**Quick CSS:**
```css
/* Before */
.text-muted { color: #9CA3AF; }

/* After - use 600 weight gray */
.text-muted { color: #4B5563; }
```

### Focus States Missing

**Issue:** No visible focus indicators for keyboard navigation

**Strategy:**
```css
/* Add to global styles */
:focus-visible {
  outline: 2px solid var(--focus-color, #2563EB);
  outline-offset: 2px;
}

/* For neobrutalism */
:focus-visible {
  outline: 3px solid #000;
  outline-offset: 3px;
}
```

### Touch Target Too Small

**Issue:** Clickable area &lt; 44x44px on mobile

**Strategy:**
```css
/* Minimum touch target */
.btn, a, button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* Or use pseudo-element to extend hit area */
.small-link {
  position: relative;
}
.small-link::before {
  content: '';
  position: absolute;
  inset: -8px;
}
```

## Medium Effort (1-2 hours)

### Improve Typography Hierarchy

**Issue:** All text feels same weight, no clear structure

**Strategy:**

1. **Define a type scale:**
```css
:root {
  --step-0: 1rem;      /* 16px body */
  --step-1: 1.25rem;   /* 20px */
  --step-2: 1.563rem;  /* 25px */
  --step-3: 1.953rem;  /* 31px */
  --step-4: 2.441rem;  /* 39px */
  --step-5: 3.052rem;  /* 49px */
}
```

2. **Apply consistently:**
```css
h1 { font-size: var(--step-5); font-weight: 700; line-height: 1.1; }
h2 { font-size: var(--step-4); font-weight: 600; line-height: 1.2; }
h3 { font-size: var(--step-3); font-weight: 600; line-height: 1.3; }
p { font-size: var(--step-0); line-height: 1.6; }
```

3. **Reference catalog:**
```typescript
// From typography.neobrutalism
const fontPairing = {
  display: "Archivo Black",  // Headings
  body: "Public Sans"        // Body text
};
```

### Fix Layout Clutter

**Issue:** Elements too close, no breathing room

**Strategy:**

1. **Implement spacing system:**
```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

2. **Apply section spacing:**
```css
section { margin-block: var(--space-16); }
.card { padding: var(--space-6); }
.card > * + * { margin-top: var(--space-4); }
```

3. **Use the "squint test":** Blur your eyes - do groups still make sense?

### Modernize Dated Elements

**Issue:** Design feels 2020-2022

**Strategy - Update shadows:**
```css
/* Before: Old Material Design shadow */
.card { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

/* After: Modern layered shadow */
.card {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.05),
    0 4px 8px rgba(0,0,0,0.1),
    0 16px 32px rgba(0,0,0,0.08);
}

/* Or: Neobrutalism */
.card {
  box-shadow: 6px 6px 0 #000;
  border: 2px solid #000;
}
```

**Strategy - Update buttons:**
```css
/* Before: Gradient button (dated) */
.btn { background: linear-gradient(to bottom, #3B82F6, #2563EB); }

/* After: Solid with subtle hover */
.btn {
  background: #3B82F6;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}
```

## High Impact (Half day)

### Restructure Information Architecture

**Issue:** Content buried, user journey unclear

**Process:**

1. **Audit current structure:**
   - List all pages/sections
   - Map current navigation
   - Identify orphaned content

2. **Define user goals:**
   - What are the top 3 things users want?
   - What's the primary conversion action?

3. **Reorganize by priority:**
```
Homepage
├── Hero (Problem + Solution in 5 seconds)
├── Social Proof (Above fold if possible)
├── Features (3-5 max, benefit-focused)
├── How It Works (3 steps)
├── Pricing (if applicable)
├── FAQ (collapse)
└── Footer CTA (repeat primary action)
```

4. **Simplify navigation:**
   - Max 5-7 top-level items
   - Group related under dropdowns
   - Clear CTA button in nav

### Add Micro-interactions

**Issue:** UI feels static, no feedback

**Strategy:**

1. **Button press feedback:**
```css
.btn:active {
  transform: translateY(1px);
  box-shadow: none;
}
```

2. **Input focus animation:**
```css
.input {
  border: 2px solid #E5E7EB;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}
```

3. **Card hover lift:**
```css
.card {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
```

4. **Loading states:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    #E5E7EB 25%,
    #F3F4F6 50%,
    #E5E7EB 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  to { background-position: -200% 0; }
}
```

### Full Trend Migration

**Issue:** Want to adopt a new design trend (e.g., neobrutalism)

**Process:**

1. **Audit existing components**
2. **Map to trend requirements**
3. **Update token system:**
```css
:root {
  /* Neobrutalism tokens */
  --shadow-brutalist: 4px 4px 0 #000;
  --border-brutalist: 2px solid #000;
  --radius-brutalist: 0;

  /* Colors - vibrant or vintage */
  --color-primary: #FFEB3B;
  --color-secondary: #FF5252;
  --color-accent: #2196F3;
}
```

4. **Update components systematically:**
   - Buttons first (most visible)
   - Cards second
   - Forms third
   - Navigation last

5. **Test consistency across pages**

## Improvement Points Reference

| Fix | Expected Point Improvement |
|-----|---------------------------|
| Add focus states | +8-12 accessibility |
| Fix contrast | +10-20 accessibility |
| Add touch targets | +5-8 accessibility |
| Implement type scale | +10-15 typography |
| Add spacing system | +10-15 layout |
| Update shadows | +5-10 modernity |
| Add hover states | +5-8 usability |
| Add loading states | +5-8 usability |
| Trend alignment | +10-20 modernity |
