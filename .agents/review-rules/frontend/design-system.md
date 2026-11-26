# Design system

Applies to: `packages/frontend`.

Flag a style value that does not come from a design-system token:

- A hex, `rgb()`, `oklch()`, px, rem, ms or cubic-bezier literal. Name the
  token that replaces it.
- A `var()` that names a token that does not exist, e.g. a legacy
  `--color--*`. It renders as nothing, without an error.
- A colour primitive (`--color--neutral--100`) where a semantic token
  (`--text-color--*`, `--background--*`) or a component token
  (`--input--*`, `--button--*`) fits.
- A `font-weight` other than `--font-weight--regular` or
  `--font-weight--medium`, or italic text.
- A shadow other than `--shadow--xs` on a surface that does not float.

Flag a hand-rolled copy of an `N8n*` component, or a direct `element-plus`/`reka-ui` import where an equivalent exists. It arrives without hover,
focus and disabled states. Name the replacement:

- badge-styled `<div>` or `ElTag`: `N8nBadge`
- local `expanded` toggle: `N8nCollapsiblePanel`
- reka-ui `DropdownMenu*` parts: `N8nDropdownMenu` or `N8nActionDropdown`
- `<table>` or `ElTable`: `N8nDataTableServer` or `N8nDatatable`
- styled `<input>`: `N8nInput`
- card used as a selector: `N8nListBox` or `N8nRadioGroup`
- spinning `loader` icon: `N8nSpinner`
- styled `<p>`, `<span>` or `<h*>` for UI text: `N8nText` with `step`
- custom scroll container: `N8nScrollArea`

A raw interactive element where an `N8n*` exists needs a one-line comment
that says why.

Flag a mixin written out by hand: an `outline` focus ring (`focus`),
`text-overflow: ellipsis` (`utils.utils-ellipsis`), scrollbar styles
(`mixins.scroll-bar`), an edge fade (`mixins.scroll-mask`), or keyframes that
`_motion.scss` already has.

Flag structural drift:

- The second copy of one UI pattern. Move it to the design system or a shared
  component before the second copy merges.
- A feature wrapper that restyles a primitive's own parts with `:deep()` or a
  global class. Wrappers may change data and props only.

Do NOT comment on Storybook story titles, args, or doc cross-references.
