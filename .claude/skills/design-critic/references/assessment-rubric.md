# Assessment Rubric

Detailed scoring criteria for each of the 6 design dimensions.

## Accessibility (20% weight)

| Score | Criteria |
|-------|----------|
| 90-100 | AAA contrast (7:1+), full keyboard nav, ARIA complete, skip links, focus visible |
| 75-89 | AA contrast (4.5:1+), keyboard accessible, basic ARIA, focus states |
| 60-74 | AA contrast partial, some keyboard issues, minimal ARIA |
| 40-59 | Contrast failures, poor keyboard support, no ARIA |
| 0-39 | Major contrast violations, keyboard traps, no accessibility consideration |

### What to Check

```typescript
const accessibilityChecklist = {
  contrast: {
    normal: "4.5:1 minimum (AA)",
    large: "3:1 minimum for 18px+ or 14px+ bold",
    enhanced: "7:1 for AAA compliance"
  },
  touchTargets: {
    minimum: "44x44px for mobile",
    recommended: "48x48px with 8px spacing"
  },
  focus: {
    visible: "2px offset ring, high contrast color",
    order: "Matches visual reading order"
  },
  semantics: {
    headings: "h1-h6 in logical order, no skips",
    landmarks: "main, nav, aside, footer present",
    labels: "All form inputs labeled"
  }
};
```

## Color Harmony (15% weight)

| Score | Criteria |
|-------|----------|
| 90-100 | Deliberate palette, cohesive temperature, accent used sparingly and effectively |
| 75-89 | Clear palette, minor temperature inconsistency, accent mostly appropriate |
| 60-74 | Palette present but muddy, occasional jarring combinations |
| 40-59 | No clear palette, clashing colors, inconsistent application |
| 0-39 | Random colors, no relationship, visually painful |

### Color Theory Checks

- **Temperature consistency**: All colors should lean warm OR cool (not mixed without intent)
- **Saturation balance**: Background desaturated, accents saturated
- **60-30-10 rule**: Primary (60%), secondary (30%), accent (10%)
- **State colors**: Error red, success green, warning amber should be semantically clear

## Typography (15% weight)

| Score | Criteria |
|-------|----------|
| 90-100 | Clear scale, excellent pairing, optimal measure (45-75 chars), perfect line-height |
| 75-89 | Good scale, appropriate fonts, readable but minor spacing issues |
| 60-74 | Scale present but inconsistent, font choices questionable, readability fair |
| 40-59 | No clear scale, poor font choices, readability issues |
| 0-39 | Chaotic typography, illegible, unprofessional |

### Typography Metrics

```typescript
const typographyStandards = {
  scale: "Major second (1.125), Major third (1.25), Perfect fourth (1.333)",
  lineHeight: {
    body: "1.5-1.75",
    headings: "1.1-1.3",
    compact: "1.25-1.4"
  },
  measure: {
    optimal: "45-75 characters",
    minimum: "30 characters",
    maximum: "90 characters"
  },
  weight: {
    body: "400 (regular)",
    emphasis: "600 (semi-bold)",
    headings: "500-700"
  }
};
```

## Layout (20% weight)

| Score | Criteria |
|-------|----------|
| 90-100 | Perfect grid adherence, balanced whitespace, clear visual hierarchy, responsive |
| 75-89 | Grid mostly followed, good whitespace, hierarchy clear, minor responsive issues |
| 60-74 | Grid inconsistent, whitespace uneven, hierarchy muddy |
| 40-59 | No clear grid, cluttered or too sparse, confusing hierarchy |
| 0-39 | Chaotic layout, no structure, completely unresponsive |

### Layout Checks

- **Grid adherence**: Is there an underlying 4px, 8px, or 12px grid?
- **Whitespace**: Breathing room around elements, consistent margins
- **Visual hierarchy**: Primary → secondary → tertiary content clear
- **Alignment**: Elements aligned to grid or each other
- **Proximity**: Related items grouped, unrelated items separated

## Modernity (15% weight)

| Score | Criteria |
|-------|----------|
| 90-100 | On-trend for 2026, innovative but appropriate, could win awards |
| 75-89 | Current feel, follows established trends well |
| 60-74 | Slightly dated (2023-2024 patterns), functional but not fresh |
| 40-59 | Noticeably dated (2020-2022), feels old |
| 0-39 | Severely dated (pre-2020), embarrassingly outdated |

### Trend Detection

Reference `trends2026` from the design catalog:

```typescript
const modernIndicators = {
  positive: [
    "Bento grid layouts",
    "Glassmorphism (subtle)",
    "Neobrutalism (bold shadows)",
    "Claymorphism (3D soft)",
    "Scroll-driven animations",
    "Variable fonts",
    "Dark mode support"
  ],
  dated: [
    "Parallax scrolling (overused)",
    "Card-based everything",
    "Hamburger menus on desktop",
    "Stock photo headers",
    "Hero sliders",
    "Skeuomorphic elements"
  ]
};
```

## Usability (15% weight)

| Score | Criteria |
|-------|----------|
| 90-100 | Intuitive flow, clear CTAs, minimal cognitive load, delightful micro-interactions |
| 75-89 | Good flow, CTAs visible, low cognitive load |
| 60-74 | Flow requires thought, CTAs present but not prominent, some confusion |
| 40-59 | Confusing flow, CTAs buried, high cognitive load |
| 0-39 | Unusable, CTAs invisible, user will abandon |

### Usability Heuristics (Nielsen)

1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation
