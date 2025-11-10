# Component specification

A generic tree component that displays hierarchical data in a collapsible structure. It supports virtualization for performance with large datasets, provides flexible rendering through slots, and can work with any data type that implements the `TreeItem` interface.

- **Component Name:** N8nTree
- **Figma Component:** [Tree](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?m=auto&node-id=2536-2108)
- **Reka UI Component:** [Tree](https://reka-ui.com/docs/components/tree)

## Generic Type Support

The Tree component is generic and can work with any data type that extends the base `TreeItem` interface:

```typescript
interface TreeItem {
  id: string;
  children?: TreeItem[];
}
```

By default, it uses `IMenuItem` but can be used with custom types for different use cases.

## Public API Definition

**Props**

- `items: T[]` - Tree data structure using generic type T (defaults to IMenuItem)
- `estimateSize?: number` - Estimated height of each tree item (in px) - used for virtualization | `default: 32`
- `getKey?: (item: T) => string` - Optional function to get unique key from each item | `default: item.id`
- `modelValue?: string[]` - The controlled selected values of the Tree. Can be bind as `v-model`
- `expanded?: string[]` - The controlled expanded state of tree items. Can be bind as `v-model:expanded`
- `defaultExpanded?: string[]` - The expanded state when initially rendered
- `multiple?: boolean` - Whether multiple items can be selected
- `disabled?: boolean` - When `true`, prevents user interaction with the Tree

**Events**

- `update:modelValue(value: string[])` - Emitted when selection changes
- `update:expanded(value: string[])` - Emitted when expanded items change

**Slots**

- `default`: `{ item: FlattenedItem<T>; handleToggle: () => void; handleSelect: () => void; isExpanded: boolean, hasChildren: boolean }` - Main content for each tree item.
### Template usage example

#### Basic Usage (with IMenuItem - and MenuItem component)

```vue
<script setup lang="ts">
import type { IMenuItem } from '@n8n/design-system/types'

const items = ref<IMenuItem[]>([...])

</script>

<template>
  <N8nTree :items="items">
		<template #default="{ item, handleToggle, isExpanded, hasChildren }">
			<MenuItem :key="item.value.id" :item="item.value">
				<template v-if="hasChildren" #toggle>
					<N8nIconButton
						size="mini"
						type="highlight"
						:icon="isExpanded ? 'chevron-down' : 'chevron-right'"
						icon-size="medium"
						aria-label="Expand"
						@click="handleToggle"
					/>
				</template>
			</MenuItem>
  </N8nTree>
</template>
```

```vue
<script setup lang="ts">
interface CustomItem extends TreeItem {
  uuid: string
  name: string
  children?: CustomItem[]
}

const customItems = ref<CustomItem[]>([
  {
    id: 'should-not-be-used',
    uuid: 'abc-123',
    name: 'Custom Item',
    children: [
      {
        id: 'should-not-be-used',
        uuid: 'def-456',
        name: 'Child Item'
      }
    ]
  }
])

function getCustomKey(item: CustomItem) {
  return item.uuid
}
</script>

<template>
  <N8nTree
    :items="customItems"
    :get-key="getCustomKey"
  >
    <template #default="{ item }">
      <span>{{ item.value.name }} ({{ item.value.uuid }})</span>
    </template>
  </N8nTree>
</template>
```
