# Component specification

A tree component that displays hierarchical data in a collapsible structure. It wraps [Reka UI Tree](https://reka-ui.com/docs/components/tree) with n8n styling, a default row layout (`TreeNodeDefault`), and slots for customizing icons, labels, and expand toggles. Custom row components can be supplied via the `node` prop.

- **Component Name:** N8nTree2
- **Figma Component:** [Tree](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?m=auto&node-id=2536-2108)
- **Reka UI Component:** [Tree](https://reka-ui.com/docs/components/tree)

## Component structure

```
Tree (N8nTree2)
└── TreeNode (per flattened item)
    ├── #default slot → fully custom row
    ├── custom `node` component (via `node` + `getNodeProps`)
    └── TreeNodeDefault (default row: icon, label, expand toggle)
```

## Data model

Items use the `TreeBranch` shape by default. Each node requires `id` and `label`; `icon` and `children` are optional. Individual items may also define `disabled?: boolean`.

```typescript
type TreeItem = {
  id: string;
  label: string;
  icon?: IconName;
};

interface TreeBranch extends TreeItem {
  children?: TreeBranch[];
}
```

Use `getKey` and `getChildren` when item keys or nesting are not stored on `id` / `children`.

## Public API Definition

**Props**

- `items: TreeBranch[]` — Tree data
- `getKey?: (item: TreeBranch) => string` — Unique key per item | `default: item.id`
- `getChildren?: (item: TreeBranch) => TreeBranch[] | undefined` — Child nodes | `default: item.children`
- `modelValue?: string[]` — Controlled selected item keys. Bind with `v-model`
- `defaultValue?: string[]` — Initial selected keys when uncontrolled
- `expanded?: string[]` — Controlled expanded item keys. Bind with `v-model:expanded`
- `defaultExpanded?: string[]` — Initial expanded keys when uncontrolled
- `multiple?: boolean` — Allow selecting multiple items | `default: false`
- `disabled?: boolean` — Disable the entire tree | `default: false`
- `showExpandArrow?: boolean` — Show chevron toggle on expandable rows | `default: true`
- `virtualized?: boolean` — Virtualize the flattened list for large trees | `default: false`
- `estimateSize?: number` — Estimated row height in px when virtualized | `default: 32`
- `overscan?: number` — Number of rows rendered outside the visible area when virtualized
- `textContent?: (item: TreeBranch) => string` — Label text for type-ahead when virtualized | `default: item.label`
- `node?: Component` — Custom Vue component for each row (replaces `TreeNodeDefault`)
- `getNodeProps?: (context: TreeNodeContext) => Record<string, unknown>` — Maps tree context to props for `node`. Defaults to `{ label: item.label }`

**Events**

- `update:modelValue(value: string[])` — Emitted when selection changes
- `update:expanded(value: string[])` — Emitted when expanded items change

**Slots**

All slots are forwarded from `Tree` → `TreeNode` → `TreeNodeDefault` unless `#default` replaces the entire row.

- `default`: `TreeNodeContext` — Fully custom row content. Replaces the default node renderer.
- `icon`: `{ icon?: IconName; disabled?: boolean; isSelected: boolean; ui: { class: string } }` — Leading icon area (default: item icon)
- `label`: `{ label: string; disabled?: boolean; handleSelect: () => void; ui: { class: string } }` — Label area
- `toggle`: `{ label: string; disabled?: boolean; isExpanded: boolean; handleToggle: () => void; ui: { class: string; iconClass: string; iconExpandedClass: string } }` — Expand/collapse control (shown when `showExpandArrow` and item has children)

**TreeNodeContext**

```typescript
type TreeNodeContext = {
  item: FlattenedItem<TreeBranch>;
  handleToggle: () => void;
  handleSelect: () => void;
  isExpanded: boolean;
  hasChildren: boolean;
};
```

### Template usage examples

#### Basic usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nTree2 } from '@n8n/design-system';
import type { TreeBranch } from '@n8n/design-system';

const items = ref<TreeBranch[]>([
  {
    id: 'workflows',
    label: 'Workflows',
    icon: 'bolt-filled',
    children: [{ id: 'all-workflows', label: 'All workflows', icon: 'list-tree' }],
  },
]);

const selected = ref<string[]>([]);
const expanded = ref<string[]>(['workflows']);
</script>

<template>
  <N8nTree2
    :items="items"
    v-model="selected"
    v-model:expanded="expanded"
  />
</template>
```

#### Uncontrolled

```vue
<N8nTree2
  :items="items"
  :default-value="['all-workflows']"
  :default-expanded="['workflows']"
/>
```

#### Custom key and children

```vue
<script setup lang="ts">
interface CustomItem {
  id: string;
  uuid: string;
  name: string;
  nodes?: CustomItem[];
}

const customItems = ref<CustomItem[]>([
  {
    id: 'root',
    uuid: 'abc-123',
    name: 'Custom Item',
    nodes: [{ id: 'child', uuid: 'def-456', name: 'Child Item' }],
  },
]);

function getCustomKey(item: CustomItem) {
  return item.uuid;
}

function getCustomChildren(item: CustomItem) {
  return item.nodes;
}
</script>

<template>
  <N8nTree2
    :items="customItems"
    :get-key="getCustomKey"
    :get-children="getCustomChildren"
  />
</template>
```

#### Custom node component

Pass a Vue component to `:node` and map item data with `:get-node-props`. See the `CustomNode` story in Storybook for a full inline example.

```vue
<script setup lang="ts">
import { defineComponent, ref } from 'vue';
import { N8nTree2 } from '@n8n/design-system';
import type { TreeBranch, TreeNodeContext } from '@n8n/design-system';

const CustomNode = defineComponent({
  props: {
    label: { type: String, required: true },
    isExpanded: { type: Boolean, required: true },
    isSelected: { type: Boolean, required: true },
    hasChildren: { type: Boolean, required: true },
    handleToggle: { type: Function, required: true },
    handleSelect: { type: Function, required: true },
  },
  template: `
    <button type="button" @click="handleSelect">
      {{ label }}
    </button>
  `,
});

const items = ref<TreeBranch[]>([/* ... */]);
const selected = ref<string[]>([]);
const expanded = ref<string[]>([]);

function getNodeProps({ item }: TreeNodeContext) {
  return { label: item.value.label, icon: item.value.icon };
}
</script>

<template>
  <N8nTree2
    :items="items"
    :node="CustomNode"
    :get-node-props="getNodeProps"
    v-model="selected"
    v-model:expanded="expanded"
  />
</template>
```

#### Slot customization (checkbox icon)

Use `#icon` to replace the leading icon. Row selection is handled by the default row click target (`#label` area); keep the checkbox non-interactive or use `#default` for full control.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCheckbox, N8nTree2 } from '@n8n/design-system';

const items = ref([/* TreeBranch[] */]);
const selected = ref<string[]>([]);
const expanded = ref<string[]>([]);
</script>

<template>
  <N8nTree2
    :items="items"
    multiple
    v-model="selected"
    v-model:expanded="expanded"
  >
    <template #icon="{ isSelected, disabled, ui }">
      <span v-bind="ui">
        <N8nCheckbox :model-value="isSelected" :disabled="disabled" tabindex="-1" />
      </span>
    </template>
  </N8nTree2>
</template>
```

#### Fully custom row (`#default`)

```vue
<N8nTree2 :items="items">
  <template #default="{ item, handleToggle, handleSelect, isExpanded, hasChildren }">
    <div>
      <button v-if="hasChildren" type="button" @click="handleToggle">
        {{ isExpanded ? '−' : '+' }}
      </button>
      <button type="button" @click="handleSelect">
        {{ item.value.label }}
      </button>
    </div>
  </template>
</N8nTree2>
```

## Related components

- **TreeNodeDefault** — Default row renderer used inside `Tree`. Documented separately under `Experimental/Tree/TreeNodeDefault` in Storybook.
- **N8nTree** — Legacy tree component in `@n8n/design-system/components`. Use `N8nTree2` for new work.
