# Motion

Guidance to design and implement web animations that feel natural and purposeful.

## Rules

- Only use animation sparingly.
- Prefer animations in `_motion.scss` mixin from `design-system`
- Use existing `--duration-*` and `--easing-*` tokens over custom values
- Size duration to the element. Small elements should animate quickly. Larger ones more slowly.
- Help elements appear from nowhere by animating from `scale(0.95)`, not `scale(0)`
- Do animate on enter/exit transitions, state changes, or responses to user actions
- Dont animate on keyboard interactions, hover effects for frequently used elements, anything user interacts with at high frequency
- Prefer animating `transform` and `opacity`. These skip layout and paint stages, running entirely on the GPU.
- Avoid animating `padding`, `margin`, `height`, `width`
-

## Common fixes

| Pattern | Fix |
| --- | --- |
| `transition-all` or `transition: all` | Name the changing properties |
| Shaky/jittery animations | Add `will-change: transform` |
| Hover causes flicker | Animate child element, not parent |
| Something still feels off | Add subtle blur (under 20px) to mask it |
| Hover triggers on mobile | Use `@media (hover: hover) and (pointer: fine)` |
| `height: "auto"` animated on a container | The measured height |
