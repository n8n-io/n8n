# Component specification

A tree component that displays hierarchical data in a collapsible structure. It supports virtualization for performance with large datasets and provides flexible rendering through slots.

- **Component Name:** N8nTree
- **Figma Component:** [Tree](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?m=auto&node-id=2536-2108)
- **Reka UI Component:** [Tree](https://reka-ui.com/docs/components/tree)

## Public API Definition

**Props**

- `items: IMenuItem[]` - Tree data structure using IMenuItem type with hierarchical children
- `estimateSize?: number` - Estimated height of each tree item (in px) - used for virtualization | `default: 32`
- `getKey?: (item: IMenuItem) => string` - Optional function to get unique key from each item | `default: item.id`
- `modelValue?: string[]` - The controlled selected values of the Tree. Can be bind as `v-model`
- `expanded?: string[]` - The controlled expanded state of tree items. Can be bind as `v-model:expanded`
- `defaultExpanded?: string[]` - The expanded state when initially rendered
- `multiple?: boolean` - Whether multiple items can be selected
- `disabled?: boolean` - When `true`, prevents user interaction with the Tree

**Events**

- `update:modelValue(value: string[])` - Emitted when selection changes
- `update:expanded(value: string[])` - Emitted when expanded items change

**Slots**

- `default`: `{ item: TreeItem<IMenuItem>; handleToggle: () => void; isExpanded: boolean }` - Main content for each tree item

### Template usage example

```typescript
<script setup lang="ts">
import type { IMenuItem } from '@n8n/design-system/types'

const items = ref<IMenuItem[]>([
  {
    id: 'folder-1',
    label: 'Documents',
    icon: 'folder',
    children: [
      {
        id: 'file-1',
        label: 'README.md',
        icon: 'file-text',
      },
      {
        id: 'file-2',
        label: 'package.json',
        icon: 'file-code',
      }
    ]
  },
  {
    id: 'folder-2',
    label: 'Images',
    icon: 'image',
    children: [
      {
        id: 'file-3',
        label: 'logo.png',
        icon: 'image',
      }
    ]
  }
])

const expanded = ref(['folder-1'])
const selected = ref<string[]>([])
</script>

<template>
  <N8nTree
    v-model="selected"
    v-model:expanded="expanded"
    :items="items"
  >
    <template #default="{ item, handleToggle, isExpanded }">
      <div class="tree-item">
        <N8nIconButton
          v-if="item.value.children?.length"
          size="mini"
          type="highlight"
          :icon="isExpanded ? 'chevron-down' : 'chevron-right'"
          @click="handleToggle"
        />
        <N8nIcon :icon="item.value.icon" />
        <span>{{ item.value.label }}</span>
      </div>
    </template>
  </N8nTree>
</template>
```

```typescript
<script setup lang="ts">
// With custom getKey function
const customItems = ref([
  {
    uuid: 'abc-123',
    name: 'Custom Item',
    subItems: [...]
  }
])

function getCustomKey(item: any) {
  return item.uuid
}
</script>

<template>
  <N8nTree
    :items="customItems"
    :get-key="getCustomKey"
  >
    <template #default="{ item }">
      <span>{{ item.value.name }}</span>
    </template>
  </N8nTree>
</template>
```
