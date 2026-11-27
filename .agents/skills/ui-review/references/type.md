# Type

Guidance on properly sized, set, and scaled type.

## Rules

- Prefer `N8nText` to render UI text over styled semantic tags. Use the `step` value to properly size text. Use `tag` to define semantic tag.
- Always use font sizes from design-system. Never use hard-coded values.
- Only use `--font-family` on UI. Use `--font-family--monospace` for code.
- Prefer use `--font-weight--regular` or `--font-weight--medium`. Set medium with `<N8nText bold />`.
- Stick to 1-2 font-sizes per UI section. Prefer using color, opacity, and weight to create contrast.
- Default to `--font-size--sm` or `<N8nText step="sm" />` for most UI text. Consider `md` and `xs` sizes for headings and captions respectively. This does not apply to Markdown or user-generated text (e.g. inputs).
- Links should always be underlined.
- Always use sentence case for headings and labels.
- Create contrast by using `text-light` or `--text-color--subtler`.
- Apply `font-variant-numeric: tabular-nums` to timers, counters, prices and numeric table columns, so every digit keeps one width and nothing shifts. Leave figures in prose proportional.
- Use `utils.utils-ellipsis` mixin to truncate text.
- On mobile, use `--font-size--md` for inputs to avoid zoom on Safari.

## Common fixes

| Pattern | Fix |
| --- | --- |
| `line-height` in `px` or `rem` | A variable from design system |
| `letter-spacing` in `px` | Use variable from design system |
| `text-wrap: balance` on a paragraph | `text-wrap: pretty` |
| `text-align: justify` in application UI | `text-align: start` |
| A timer, counter, price or numeric column without `tabular-nums` | `font-variant-numeric: tabular-nums` |
| `...`, `--` or a hyphenated range in rendered strings | `…`, an em dash or an en dash |
| `text-decoration-skip-ink: none` | Remove it. Use `text-underline-position: from-font` or set `text-underline-offset` as needed. |
| `<input>` with `font-size: var(--font-size--sm)` or `14px` and no mobile override | Set its font size to `--font-size--md` on mobile |
| Mixed-direction value such as a name, number or URL without `<bdi>` or `dir` | Wrap it in `<bdi>` |
