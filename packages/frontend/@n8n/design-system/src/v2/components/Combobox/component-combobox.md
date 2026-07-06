# Component specification

Allows users to search and choose one or more options from a list. It supports filtering, single and multiple selection, and is suited to larger datasets where a plain Select is not enough.

- **Component Name:** N8nCombobox2
- **Figma Component:** [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev)
- **Reka UI Component:** [Combobox](https://reka-ui.com/docs/components/combobox)

## Component structure

```
Combobox (N8nCombobox2)
├── ComboboxAnchor (trigger: input + chevron)
└── ComboboxContent (portaled dropdown)
    ├── ComboboxEmpty
    └── ComboboxItem (reka-ui wrapper)
        └── ComboboxItemDefault (default row: icon, label, check indicator)
```

## Public API Definition

**Props**

- `id?: string`
- `placeholder?: string` — Shown in the input when no value is selected | `default: 'Select an option'`
- `emptyText?: string` — Shown when filtering returns no matches | `default: 'No results found.'`
- `items?: T` — Array of options to render
- `valueKey?: VK` — When `items` is an array of objects, field to use as the value | `default: 'value'`
- `labelKey?: GetItemKeys<T>` — When `items` is an array of objects, field to use as the label | `default: 'label'`
- `defaultValue?: GetModelValue<T, VK, M>` — Initial value when uncontrolled
- `modelValue?: GetModelValue<T, VK, M>` — Controlled value. Bind with `v-model`
- `multiple?: boolean` — Allow selecting multiple options
- `open?: boolean` — Controlled open state. Bind with `v-model:open`
- `defaultOpen?: boolean` — Initial open state when uncontrolled
- `disabled?: boolean` — Disable interaction
- `icon?: IconName` — Leading icon in the trigger
- `ignoreFilter?: boolean` — Disable built-in filtering
- `resetSearchTermOnBlur?: boolean` — Reset search text on blur | reka default: `true`
- `resetSearchTermOnSelect?: boolean` — Reset search text on select | reka default: `true`
- `openOnFocus?: boolean` — Open dropdown when input is focused | reka default: `false`
- `openOnClick?: boolean` — Open dropdown when input is clicked | reka default: `false`

**UI Props**

- `itemSize?`: `'mini' | 'small' | 'medium' | 'large' | 'xlarge'` | `default: 'large'`
- `variant?`: `'default' | 'ghost'` | `default: 'default'`
- `side?`: `'top' | 'right' | 'bottom' | 'left'` | `default: 'bottom'`
- `sideOffset?`: `number` | `default: 4`
- `contentClass?`: `string` — Additional class(es) on the portaled dropdown

**Events**

- `update:modelValue(value: GetModelValue<T, VK, M>)`
- `update:open(value: boolean)`

**Slots**

- `default`: `{ modelValue?: GetModelValue<T, VK, M>; open: boolean }`
- `item`: `{ item: ComboboxItemProps }`
- `item-leading`: `{ item: ComboboxItemProps; ui: object }`
- `item-label`: `{ item: ComboboxItemProps }`
- `item-trailing`: `{ item: ComboboxItemProps; ui: object }`
- `label`: `{ item: ComboboxItemProps }`
- `header`: `()`
- `footer`: `()`

### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = ref(['Backlog', 'Todo', 'In Progress', 'Done']);
const value = ref('Backlog');
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items" placeholder="Search status..." />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2, N8nIcon } from '@n8n/design-system';

const items = ref([
  { value: 'light', label: 'Light', icon: 'wrench' },
  { value: 'dark', label: 'Dark', icon: 'filled-square' },
]);
const value = ref('light');
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items">
    <template #item-leading="{ item }">
      <N8nIcon :icon="item.icon" color="primary" />
    </template>
  </N8nCombobox2>
</template>
```

## Related components

- **N8nSelect2** — Use for short static lists without search (fewer than ~10 items).
- **N8nCombobox2Item** — Reka-ui combobox item wrapper used inside `Combobox`.
- **N8nCombobox2ItemDefault** — Default row renderer used inside `ComboboxItem`. Documented separately under `Experimental/Combobox/ComboboxItemDefault` in Storybook.
