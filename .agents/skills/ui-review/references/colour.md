# Colour

Guidance for reviewing and using our colour system, ensuring accessibile usage aswell as brand expression.

## Rules

- Only use colours provided by `design-system` via tokens (e.g `--color--neutral--100` or `--background--brand`). Never hard-code colour values.
- Prefer token values (e.g `--text-color`) over using colour primitives when available.
- Use colour to establish heirarchy, particular in text or in fills. Solid fills indicate primary actions.
- User `light-dark()` when changing colours between Light and Dark themes. Aim to keep them tonally consistent.

## Common fixes

| Pattern | Fix |
| --- | --- |
| A hex, `rgb(` or `oklch(` literal in a component file where a token exists | Use token from the design system |
