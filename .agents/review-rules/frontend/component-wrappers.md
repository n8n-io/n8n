# Wrapping a third-party component

Applies to: `packages/frontend`.

`@n8n/design-system` wraps reka-ui, Element Plus, TipTap and CodeMirror. The
recurring defect is assuming the wrapper passes something through, or that a
library default is what you want.

- **Attributes are forwarded only if the wrapper forwards them.** `N8nSelect`
  binds just `$props` and `on*` listeners to `ElSelect`, so an `aria-label`,
  `data-test-id` or native attribute set on it lands on the outer `<div>` and
  never reaches the control. Check the wrapper's `v-bind`, and prefer its own
  prop where one exists.
- **Library defaults are behaviour.** A dialog focus trap focusing the first
  tabbable child opens a filterable select on mount. Flag a handler
  suppressing a library behaviour unconditionally when one state needs it,
  e.g. a blanket `@interact-outside` `preventDefault`.
- **Vendor class names are contracts.** A `:global()` selector against one
  stops matching silently when the library renames it.
- An accessible name computing to empty for an icon-only control, or a
  `<button>` with no explicit `type`, which is `submit` inside a form.
