# Motion

Guidance to design and implement web animations that feel natural and purposeful.

## Rules

- Use animation sparingly.
- Prefer animations from the `motion.scss` mixins in `@n8n/design-system`.
- Use existing `--duration-*` and `--easing-*` tokens over custom values.
- Size duration to the element. Small elements should animate quickly. Larger ones more slowly.
- For scale-based entrances, animate from `scale(0.95)`, not `scale(0)`. Use another motion pattern when scaling is not appropriate.
- Do animate on enter/exit transitions, state changes, or responses to user actions.
- Do not animate focus or keypress feedback, hover effects on frequently used elements, or other high-frequency feedback. Keyboard-triggered state changes may use the same transition as pointer activation.
- Prefer animating `transform` and `opacity`. These properties usually avoid layout and are often compositor-friendly, but can still cause paint and compositing costs. Profile them when performance matters.
- Avoid animating `padding`, `margin`, `height`, `width`.

## Common fixes

| Pattern | Fix |
| --- | --- |
| `transition: all` | Name the changing properties |
| Shaky/jittery animations | Fix layout or paint contention first. Add a targeted `will-change` hint only if profiling shows it helps. |
| Hover causes flicker | Animate child element, not parent |
| Something still feels off | Add subtle blur (under 20px) to mask it |
| Hover triggers on mobile | Use `@media (hover: hover) and (pointer: fine)` |
| `height: auto` animated on a container | The measured height |
