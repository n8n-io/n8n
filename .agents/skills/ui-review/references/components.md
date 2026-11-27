# Components

Guidance on constructing, using, and building components, particularly from N8n\* primitives.

## Rules

- Build on top of `N8n*` components from `@n8n/design-system`.
- Check `@n8n/design-system` for an existing component before you build.
- Prefer using existing components rather than creating new ones.
- No raw interactive elements when `N8n*` component exists. Exceptions must have a one-line comment that says why.
- Never copy or rebuild a design system component. Wrappers for logic and providers are allowed.
- Follow the rule of two. When a second feature needs the same UI pattern, move it into the DS (or a shared features/shared component) before you merge the second copy.
- Prefer using stateful primitives, through v-model:open or similar.
- Wrappers stay thin. A feature component that wraps a DS primitive may change data and props. It may not restyle the primitive's own parts with :deep() or global classes.

## Common fixes

| Pattern | Fix |
| --- | --- |
| Uses `<button>`, `<Primitive as="button">`, or `<div role="button">` with its own styles. | Use `N8nButton` or `N8nIconButton` |
| A clickable `<div>` or button toggles a local `expanded` ref. The component has its own animation and no keyboard or ARIA support. | Use `N8nCollapsiblePanel` or `N8nAnimatedCollapsibleContent`. |
| A `<div>` or `ElTag` copies badge styles. | Use `N8nBadge`. |
| Menu from `DropdownMenuRoot`, `DropdownMenuContent`, and other reka-ui parts. It repeats portal, z-index, dismiss, and focus logic. | Use `N8nDropdownMenu`, `N8nContextMenu`, or `N8nActionDropdown`. |
| Uses `<table>` or `ElTable` with its own sticky header, sort, and cell styles. | Use `N8nDataTableServer` or `N8nDatatable`. |
| Using `ElDialog` or `ElDrawer`. | Use `N8nDialog` for dialogs. |
| Using `<input>` with its own focus, border, and clear-button styles. | Use `N8nInput` with prefix and clear slots. |
| A card or tile acts as a selector. It has its own active style and animation, and no `aria-pressed` or `aria-selected`. | Use `N8nCard` with `N8nButton`. For selection, use `N8nListbox` or `N8nRadioGroup`. |
| Two or more components render the same buttons, selects, and dividers with copied state. | Use one renderer. Build its parts from `N8nButton`, `N8nSelect`, and `N8nCard`. |
| A `loader` icon with `spin` prop or custom spinning animation. | Use `N8nSpinner` with `type='dots'` |
