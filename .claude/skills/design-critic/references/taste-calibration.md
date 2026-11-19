# Taste Calibration

Reference points and examples for developing consistent aesthetic judgment.

## Aesthetic Reference Points

### What "Excellent" (90+) Looks Like

**Stripe.com**
- Why it scores high:
  - Obsessive attention to spacing (8px grid, visible in every element)
  - Micro-interactions everywhere (hover, focus, scroll)
  - Typography is flawless (clear scale, perfect line-height)
  - Color palette is cohesive and professional
  - Accessibility is built-in (not an afterthought)

**Linear.app**
- Why it scores high:
  - Dark mode done right (contrast without harshness)
  - Animations are purposeful (not decorative)
  - Information density without clutter
  - Keyboard-first design (power user friendly)
  - Consistent visual language across all screens

**Raycast.com**
- Why it scores high:
  - Clean typography with perfect hierarchy
  - Subtle gradients that feel modern, not dated
  - Excellent empty states and loading states
  - Responsive without feeling like an afterthought

### What "Good" (75-89) Looks Like

**Most well-designed SaaS products**
- Solid foundations, maybe missing polish in edge cases
- Good responsive behavior, might break at odd sizes
- Consistent color use, but accent might feel arbitrary
- Type hierarchy present, but scale might not be tight

### What "Fair" (60-74) Looks Like

**Template-based sites with minimal customization**
- "It works" but doesn't delight
- Spacing feels arbitrary (not on a grid)
- Colors are safe but boring
- Typography is readable but uninspired
- Interactions are basic (hover underlines, that's it)

### What "Poor" (40-59) Looks Like

**Rushed MVP, no design resources**
- Obvious bootstrap/template without customization
- Clashing colors
- Inconsistent spacing
- Multiple font families without purpose
- No hover states or focus states

### What "Critical" (0-39) Looks Like

**Abandoned or amateur**
- Comic Sans or similar font crimes
- Pure white on pure black (harsh)
- No consideration for accessibility
- Mobile experience completely broken
- Autoplay video with sound

## Trend-Specific Excellence

### Neobrutalism - Award Level

```css
/* From neobrutalism.dev - reference implementation */
.button {
  background: #FFD93D;
  border: 3px solid #1D1C1C;
  border-radius: 0;
  padding: 12px 24px;
  font-family: 'Archivo Black', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 6px 6px 0 #1D1C1C;
  transition: all 0.2s ease-out;
}

.button:hover {
  transform: translate(-3px, -3px);
  box-shadow: 9px 9px 0 #1D1C1C;
}

.button:active {
  transform: translate(3px, 3px);
  box-shadow: 3px 3px 0 #1D1C1C;
}
```

**Key excellence factors:**
- Shadow moves with transform (feels physical)
- Colors are bold but not jarring
- Typography is chunky and confident
- Transition timing feels snappy

### Glassmorphism - Award Level

```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
}
```

**Key excellence factors:**
- Blur amount is balanced (not too frosted)
- Border catches light (inset shadow on edge)
- Works on varied backgrounds
- Content remains readable

### Minimal Dark Mode - Award Level

```css
:root {
  --bg-primary: #0A0A0B;
  --bg-secondary: #141416;
  --bg-tertiary: #1C1C1F;
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --accent: #3B82F6;
  --accent-hover: #60A5FA;
}
```

**Key excellence factors:**
- Not pure #000 (too harsh)
- Text is not pure #FFF (subtle off-white)
- Distinct background levels for depth
- Accent color is vibrant against dark

## Common Taste Mistakes

### "Designers love it, users hate it"

**Symptom:** Beautiful but unusable
- Tiny text for aesthetic
- Low contrast "because it looks cleaner"
- Hidden navigation (mystery meat)
- Animations that delay tasks

**Correction:** Beauty should enhance usability, not fight it

### "More is more"

**Symptom:** Every trend at once
- Glassmorphism + Neobrutalism (clash)
- 5+ fonts
- Gradients + Hard shadows + Soft shadows
- Every color in the rainbow

**Correction:** Pick one trend and commit

### "Safe is good"

**Symptom:** Forgettable, generic
- Gray everything
- Stock photos
- Template structure unchanged
- No personality

**Correction:** Take one bold stance (color, typography, layout)

### "Trends > Fundamentals"

**Symptom:** Trendy but broken
- Glassmorphism with unreadable text
- Neobrutalism that's just ugly
- Dark mode with no accessibility

**Correction:** Fundamentals first, trends are seasoning

## Calibration Exercises

### Exercise 1: Score These

Practice scoring real sites against the rubric:
1. Your own recent project (be harsh)
2. A competitor's site
3. An admired site in your space
4. A random Product Hunt launch

### Exercise 2: Identify the Trend

Look at 10 sites and identify:
- Primary design trend
- 3 elements that signal the trend
- 1 violation of the trend's rules

### Exercise 3: Before/After

Find redesign case studies and:
- Score the before
- Score the after
- Identify the specific improvements
- Map to the 6 dimensions

## Reference Sites by Trend

| Trend | Reference Sites |
|-------|-----------------|
| Neobrutalism | gumroad.com, figma.com, mailchimp.com |
| Glassmorphism | metamask.io, apple.com |
| Dark Mode | linear.app, vercel.com, raycast.com |
| Maximalism | spotify.com (Wrapped), liquideath.com |
| Minimal | apple.com, stripe.com |
| Retro/Y2K | poolside.fm, figma.com (old) |
| Claymorphism | notion.so (illustrations) |
