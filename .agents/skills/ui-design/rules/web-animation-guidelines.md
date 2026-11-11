# Web Motion Guidelines
Design and implement web animations that feel natural and purposeful

## Timing and Duration

## Duration Guidelines

| Element Type                      | Duration  |
| --------------------------------- | --------- |
| Micro-interactions                | 100-150ms |
| Standard UI (tooltips, dropdowns) | 150-250ms |
| Modals, drawers                   | 200-300ms |

**Rules:**

- UI animations should stay under 300ms
- Larger elements animate slower than smaller ones
- Exit animations can be ~20% faster than entrance
- Match duration to distance - longer travel = longer duration

### The Frequency

Determine how often users will see the animation:

- **100+ times/day** → No animation (or drastically reduced)
- **Occasional use** → Standard animation
- **Rare/first-time** → Can be more special

**Example:** Raycast never animates because users open it hundreds of times a day.

## When to Animate

**Do animate:**

- Enter/exit transitions for spatial consistency
- State changes that benefit from visual continuity
- Responses to user actions (feedback)
- Rarely-used interactions where delight adds value

**Don't animate:**

- Keyboard-initiated actions
- Hover effects on frequently-used elements
- Anything users interact with 100+ times daily
- When speed matters more than smoothness

## Performance

Prefer animating `transform` and `opacity`. These skip layout and paint stages, running entirely on the GPU.

**Avoid animating:**

- `padding`, `margin`, `height`, `width` (trigger layout)
- `blur` filters above 20px (expensive, especially Safari)
- CSS variables in deep component trees

### Optimization Techniques

```css
/* Force GPU acceleration */
.animated-element {
  will-change: transform;
}
```

## Practical Tips

Quick reference for common scenarios. See [PRACTICAL-TIPS.md](PRACTICAL-TIPS.md) for detailed implementations.

| Scenario                        | Solution                                        |
| ------------------------------- | ----------------------------------------------- |
| Make buttons feel responsive    | Add `transform: scale(0.97)` on `:active`       |
| Element appears from nowhere    | Start from `scale(0.95)`, not `scale(0)`        |
| Shaky/jittery animations        | Add `will-change: transform`                    |
| Hover causes flicker            | Animate child element, not parent               |
| Popover scales from wrong point | Set `transform-origin` to trigger location      |
| Sequential tooltips feel slow   | Skip delay/animation after first tooltip        |
| Small buttons hard to tap       | Use 44px minimum hit area (pseudo-element)      |
| Something still feels off       | Add subtle blur (under 20px) to mask it         |
| Hover triggers on mobile        | Use `@media (hover: hover) and (pointer: fine)` |

## Easing Decision Flowchart

Is the element entering or exiting the viewport?
├── Yes → ease-out
└── No
├── Is it moving/morphing on screen?
│ └── Yes → ease-in-out
└── Is it a hover change?
├── Yes → ease
└── Is it constant motion?
├── Yes → linear
└── Default → ease-out
