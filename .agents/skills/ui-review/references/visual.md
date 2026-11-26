# Visual

Guidance on visual polish across surfaces and icons.

## Rules

- When nesting elements share visible borders, the outer radius should be `inner radius + (padding + border width)`. Beyond `--radius--2xl` or where padding is asymmetric, treat layers as separate surfaces.
- Where geometric centering looks off, nudge by eye. Use the `transform` property with `translate()` to nudge elements.
- Use shadows sparingly. Only use `--shadow--xs` unless surface is deliberately floating (e.g. popover, dialog).
- When using borders with shadows, add `background-clip: padding-box` to element to tidy up murky edges.
- Give content images a `1px` box-shadow or outline inset. Use `--color--white-alpha-100` in dark mode and `--color--black-alpha-100` in light.
- Give scrollable dialogs, drawers, menus and side panels `overscroll-behavior: contain`, so scrolling past their end never scrolls the page behind.

## Common fixes

| Pattern | Fix |
| --- | --- |
| Padded parent and child with the same `border-radius` | Add the padding to the outer radius |
| `box-shadow: 0 0 0 1px` ring with no `border` beside it | `border: 1px solid transparent` |
| `fill="#..."` or `stroke="#..."` inside an icon SVG | `currentColor` |
| `overflow: auto` or `overflow-y: auto` on a dialog, drawer or menu with no `overscroll-behavior` | `overscroll-behavior: contain` |
