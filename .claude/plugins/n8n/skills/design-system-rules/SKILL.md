# Design System Style Review Rules

Use these rules when reviewing CSS/SCSS/Vue style changes, especially in
`packages/frontend/` and `packages/frontend/@n8n/design-system/`.

## 1) Token source priority

Prefer this order when choosing visual values:

1. Semantic tokens from
   `packages/frontend/@n8n/design-system/src/css/_tokens.scss`
2. Primitives from
   `packages/frontend/@n8n/design-system/src/css/_primitives.scss`
3. Hard-coded values only when no suitable token exists

If no token exists, request a short rationale in the PR.

## 2) Hard-coded visual values

Flag hard-coded visual values and suggest token alternatives. This includes:

- Colors (`#fff`, `rgb()`, `hsl()`, `oklch()`)
- Spacing and sizing (`px`, `rem`, numeric layout constants in styles)
- Radius, border widths/styles, and shadows
- Typography values (font size, weight, line-height)
- Motion values (durations and easing like `cubic-bezier(...)`)

Severity: strong warning (expected migration to tokens/primitives when possible).

## 3) Legacy token usage

In `_tokens.scss`, the compatibility section labeled
"Legacy tokens (kept for compatibility)" is considered legacy usage.

When new or modified code uses these legacy token families, flag it as a
migration opportunity and recommend semantic token usage where available.

Severity: strong warning (discourage new usage, allow compatibility paths).

## 4) Deprecated style and component surfaces

Flag new usage of deprecated/legacy style surfaces in design-system components,
for example:

- `Button.legacy.scss` and legacy button override classes
- Legacy button variants/types (for example `highlight`, `highlight-fill`)
- Legacy component variants that exist for compatibility (for example legacy
  tabs variant)

Severity: strong warning (prefer modern semantic variants/components).

## 5) Token substitution changes

If a PR changes one token reference to another (for example
`--text-color` -> `--text-color--subtle`), flag it as a soft warning.

Ask for intent in the PR description/comment:

- Intentional design adjustment, or
- Potential accidental visual regression

Do not treat token substitution as a hard failure by default.
