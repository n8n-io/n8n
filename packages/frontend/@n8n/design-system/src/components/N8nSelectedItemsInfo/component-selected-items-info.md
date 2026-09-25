# N8nSelectedItemsInfo

Floating bar that shows how many list rows are selected, with bulk actions and a clear-selection button.

- **Component name:** `N8nSelectedItemsInfo`
- **W3C APG patterns:** [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

## Why?

Lists with row selection (executions, data tables, MCP access tables) show the same selection summary and bulk actions. One component keeps the layout, tokens, and test ids the same everywhere.

The component is positioned absolutely at the bottom of its closest positioned ancestor. A consumer can pass a class to change the positioning.

## Public API

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `selectedCount` | `number` | Required | Number of selected items. The component renders nothing when it is 0. |

### Events

- `deleteSelected()` when the default delete button is clicked.
- `clearSelection()` when the clear-selection button is clicked.

### Slots

- `actions` replaces the default delete button with custom bulk actions. The clear-selection button always renders after the actions.

## Examples

```vue
<N8nSelectedItemsInfo
	:selected-count="selectedCount"
	@delete-selected="handleDeleteSelected"
	@clear-selection="handleClearSelection"
/>

<N8nSelectedItemsInfo :selected-count="selectedIds.length" @clear-selection="clearSelection">
	<template #actions>
		<N8nButton variant="subtle" label="Remove access" @click="removeAccess" />
	</template>
</N8nSelectedItemsInfo>
```
