# Color

Guidance for reviewing and using our color system, ensuring accessible usage as well as brand expression.

## Rules

- Only use colors provided by `design-system` via tokens (e.g. `--color--neutral-100` or `--background--brand`). Never hard-code color values.
- Prefer token values (e.g. `--text-color`) over using color primitives when available.
- Use color to establish hierarchy, particularly in text or in fills. Solid fills indicate primary actions.
- Use `light-dark()` when changing colors between Light and Dark themes. Aim to keep them tonally consistent.

## Common fixes

| Pattern | Fix |
| --- | --- |
| A hex, `rgb(` or `oklch(` literal in a component file where a token exists | Use token from the design system |
