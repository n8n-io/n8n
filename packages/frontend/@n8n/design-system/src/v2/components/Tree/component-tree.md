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

- `default`: `{ item: FlattenedItem<T>; handleToggle: () => void; isExpanded: boolean }` - Main content for each tree item.
### Template usage example

#### Basic Usage (with IMenuItem - default)

```vue
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

#### Generic Usage (with custom types)

```vue
<script setup lang="ts">
import type { TreeItem } from '@n8n/design-system/components/Tree'

// Define a custom tree item type
interface FileSystemItem extends TreeItem {
  name: string
  type: 'folder' | 'file'
  size?: number
  children?: FileSystemItem[]
}

const items = ref<FileSystemItem[]>([
  {
    id: 'folder-1',
    name: 'Documents',
    type: 'folder',
    children: [
      {
        id: 'file-1',
        name: 'README.md',
        type: 'file',
        size: 1024,
      },
      {
        id: 'file-2',
        name: 'package.json',
        type: 'file',
        size: 2048,
      }
    ]
  },
  {
    id: 'file-3',
    name: 'config.json',
    type: 'file',
    size: 512,
  }
])

const expanded = ref<string[]>([])
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
        <N8nIcon :icon="item.value.type === 'folder' ? 'folder' : 'file'" />
        <span>{{ item.value.name }}</span>
        <span v-if="item.value.size" class="file-size">({{ item.value.size }} bytes)</span>
      </div>
    </template>
  </N8nTree>
</template>
```

#### With custom getKey function

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
