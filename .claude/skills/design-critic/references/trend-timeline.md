# Design Trend Timeline

What's current, what's dated, and when things changed.

## Current Trends (2024-2026)

### Bento Grids

**Era**: 2023-present
**Peak**: 2024-2026
**Example sites**: Apple, Linear, Vercel

**Characteristics**:
- Asymmetric grid layouts
- Cards of varying sizes
- Visual hierarchy through size
- Tight gutters, generous padding

**When to use**:
- Feature showcases
- Dashboard overviews
- Portfolio displays

**When to avoid**:
- Long-form content
- Dense data tables
- Mobile-first designs (requires stacking)

---

### Glassmorphism (Refined)

**Era**: 2020-present
**Peak**: 2021-2022, refined 2024+
**Example sites**: Apple, Linear, Stripe

**Characteristics**:
- Frosted glass effect (backdrop-filter: blur)
- Subtle transparency
- Light borders for definition
- Works on colorful/gradient backgrounds

**2020-2022 version** (often overdone):
```css
/* Over-the-top */
backdrop-filter: blur(20px);
background: rgba(255, 255, 255, 0.1);
```

**2024+ refined version**:
```css
/* Subtle and sophisticated */
backdrop-filter: blur(8px);
background: rgba(255, 255, 255, 0.7);
border: 1px solid rgba(255, 255, 255, 0.3);
```

**When to use**:
- Modals over colorful backgrounds
- Navigation overlays
- Card elements on gradient backgrounds

**When to avoid**:
- Low-contrast backgrounds (no effect visible)
- Accessibility-critical interfaces
- Heavy content areas

---

### Neobrutalism

**Era**: 2022-present
**Peak**: 2023-2024
**Example sites**: Gumroad, Figma marketing

**Characteristics**:
- Bold black borders (2-4px)
- High contrast colors
- Hard shadows (no blur)
- Raw, honest aesthetic

```css
.neo-card {
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  background: #fff;
}
```

**When to use**:
- Creative/design portfolios
- Indie products
- Marketing sites wanting personality

**When to avoid**:
- Corporate/enterprise
- Healthcare/finance
- Accessibility-critical (can be overwhelming)

---

### Variable Fonts

**Era**: 2018-present
**Peak**: 2024+
**Example sites**: Apple, Stripe, most modern sites

**Characteristics**:
- Single font file, multiple weights
- Smooth weight transitions
- Animation possibilities
- Better performance

```css
@font-face {
  font-family: 'Inter';
  src: url('Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
}

.text {
  font-variation-settings: 'wght' 450;
}
```

---

### Dark Mode First

**Era**: 2020-present
**Peak**: 2024+
**Example sites**: Vercel, Linear, GitHub

**Characteristics**:
- Dark mode as default
- Light mode as alternative
- Proper color tokens for both

**Implementation**:
```css
:root {
  --bg: #0a0a0a;
  --text: #fafafa;
  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #fafafa;
    --text: #0a0a0a;
  }
}
```

---

### Micro-interactions

**Era**: Always, but refined 2023+
**Example sites**: Stripe, Linear, Vercel

**Current patterns**:
- Subtle hover states
- Loading state animations
- Success/error feedback
- Page transitions

**Anti-patterns** (dated):
- Excessive bounce animations
- Slow transitions (&gt;300ms)
- Distracting movement
- Parallax overload

---

## Emerging Trends (Watch List)

### AI-Generated Imagery

**Era**: 2023-present
**Status**: Rapidly evolving

**Current usage**:
- Marketing illustrations
- Placeholder content
- Style exploration

**Risks**:
- Inconsistent style
- Uncanny valley
- Copyright questions

---

### Spatial Design (AR/VR Ready)

**Era**: 2024-emerging
**Status**: Early adoption

**Characteristics**:
- Z-depth consideration
- Perspective-aware layouts
- 3D-ready components

---

### Kinetic Typography

**Era**: 2024-emerging
**Status**: Used in hero sections

**Examples**:
- Animated headlines
- Text reveal on scroll
- Variable font animations

---

## Dated Patterns (Avoid)

### Hamburger Menu on Desktop

**Era**: 2015-2018
**Died**: 2019-2020
**Why dated**: Hides critical navigation, poor discoverability

**Instead**: Visible nav with overflow dropdown

---

### Carousel/Slider Hero

**Era**: 2010-2015
**Died**: 2016-2018
**Why dated**:
- Low engagement (1% click after first slide)
- Accessibility nightmare
- Mobile usability issues

**Stats**: Users interact with slide 1 only 70% of the time

**Instead**: Single hero, scroll-based sections

---

### Parallax Overload

**Era**: 2013-2016
**Died**: 2017-2018
**Why dated**:
- Performance issues
- Motion sickness
- Accessibility concerns

**Instead**: Subtle scroll-triggered animations

---

### Full Skeuomorphism

**Era**: 2008-2013
**Died**: iOS 7 (2013)
**Why dated**:
- Visual noise
- Outdated metaphors
- Performance overhead

**Note**: Subtle skeuomorphism is returning (neumorphism)

---

### Busy Gradients

**Era**: 2008-2012
**Died**: Flat design era (2013)
**Why dated**:
- Visual noise
- Hard to read text over
- Screams "2010"

**Instead**: Solid colors or subtle, modern gradients

---

### Stock Photo Heroes

**Era**: Always, but problematic 2018+
**Issue**: Feels inauthentic, cliché

**Instead**:
- Custom photography
- Illustrations
- Abstract imagery
- Real product shots

---

### Drop Shadow Excess

**Era**: 2010-2015
**Issue**: Makes elements "float" unrealistically

**Before**:
```css
box-shadow: 0 10px 30px rgba(0,0,0,0.5); /* Too heavy */
```

**After**:
```css
box-shadow: 0 1px 3px rgba(0,0,0,0.1); /* Subtle */
```

---

## Framework-Specific Trends

### React/Next.js (2024+)

- Server Components (App Router)
- Streaming SSR
- Partial prerendering
- CSS-in-JS declining, Tailwind dominant

### CSS (2024+)

- Container queries mainstream
- :has() selector adoption
- Subgrid support
- View Transitions API

### Animation (2024+)

- Framer Motion dominance
- CSS scroll-driven animations
- View Transitions
- Reduced motion respect

---

## Timeline Quick Reference

| Pattern | Peak Era | Status 2026 |
|---------|----------|-------------|
| Bento grids | 2024-2026 | Current |
| Glassmorphism | 2021-2022 | Refined, current |
| Neobrutalism | 2023-2024 | Current, niche |
| Dark mode | 2022-present | Standard |
| Micro-interactions | Always | Essential |
| Hamburger desktop | 2015-2018 | Dated |
| Carousels | 2010-2015 | Dated |
| Parallax | 2013-2016 | Dated |
| Skeuomorphism | 2008-2013 | Dated |
| Stock heroes | Always | Dated |
