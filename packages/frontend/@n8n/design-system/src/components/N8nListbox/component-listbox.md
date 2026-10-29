# Component specification

A single-select list. Arrow keys move a highlight over the whole item. Enter or Space selects the highlighted item. The item slot holds the row content, so the highlight and the focus ring cover that content.

- **Component Name:** N8nListbox, N8nListboxItem
- **Figma Component:** TBD
- **Reka UI Component:** [Listbox](https://reka-ui.com/docs/components/listbox)

## Public API Definition

**Listbox props**

- `modelValue?: string` - The selected value. Bind it with `v-model`.
- `defaultValue?: string` - The selected value on first render. Use it when the parent does not bind `v-model`.
- `label?: string` - Accessible name for the list.
- `disabled?: boolean` - The user cannot move the highlight or change the value. | `default: false`
- `selectionBehavior?: 'replace' | 'toggle'` - `replace` keeps one value. `toggle` clears the value when the user activates the selected item. | `default: 'replace'`
- `orientation?: 'vertical' | 'horizontal'` - Up and down, or left and right, move the highlight. | `default: 'vertical'`
- `dir?: 'ltr' | 'rtl'` - Reading direction. Omit it to inherit the page direction.
- `highlightOnHover?: boolean` - Pointer movement moves the highlight. | `default: false`

**Listbox events**

- `update:modelValue(value: string)` - The selected value changed.

**Listbox slots**

- `default` - Items to show in the list.

**ListboxItem props**

- `value: string` - Value this item selects. Unique among the items in the list.
- `disabled?: boolean` - The user cannot highlight or select this item.

**ListboxItem events**

- `select(event)` - The user activates the item. Call `preventDefault` on the event to keep the current value.

**ListboxItem slots**

- `default` - Row content. The highlight and the focus ring cover this content.

## Behavior

- One item in the list has the highlight. Arrow keys move it. Home and End move it to the ends.
- Tab moves through the controls inside the focused item, then to the next item. Shift+Tab moves back. Tab leaves the list at either end.
- Up and Down move the highlight when the item has focus. A control inside the item keeps those keys.
- The highlight paints the whole item. The focus ring follows the same box and paints above a track that overlaps the item.
- Enter or Space selects the highlighted item and emits `update:modelValue`.
- A click selects that item.
- `selectionBehavior="replace"` keeps the value when the user activates the selected item again.
- `highlightOnHover` stays off unless the caller sets it. Hover still paints the item.
- The list does not take focus when it mounts.
- A disabled item stays in the list. Arrow keys skip it. A click on it does not change the value.
- Call `preventDefault` in the item `select` handler when that row should run another action and keep the current value.

## Accessibility

- The list is a `listbox`. Set `label` so it has an accessible name.
- Each item is an `option`.
- The selected item sets `aria-selected="true"`.
- Up and Down move the highlight when the item has focus. Tab moves through the controls inside the item, then to the next item. Enter or Space selects the item.

## Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nListbox, N8nListboxItem } from '@n8n/design-system';

const version = ref('v2');
</script>

<template>
	<N8nListbox v-model="version" label="Versions">
		<N8nListboxItem value="v2">v2</N8nListboxItem>
		<N8nListboxItem value="v1">v1</N8nListboxItem>
	</N8nListbox>
</template>
```
