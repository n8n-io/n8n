# Component specification

Allows users to search and choose one or more options from a list. All comboboxes filter as the user types. Supports single and multiple selection, grouped lists (labels and separators), and is suited to larger datasets where a plain Select is not enough.

- **Component Name:** N8nCombobox2
- **Figma Component:** [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev)
- **Reka UI Component:** [Combobox](https://reka-ui.com/docs/components/combobox)

## Component structure

```
Combobox (N8nCombobox2)
├── ComboboxAnchor (trigger: leading icon, input, clear button, chevron)
│   └── ComboboxInput + clear button (when clearable) + ComboboxTrigger
└── ComboboxContent (portaled dropdown, max-height 500px by default)
    ├── header slot
    ├── ComboboxViewport (scrollable list area)
    │   ├── ComboboxEmpty
    │   └── ComboboxGroup
    │       ├── ComboboxLabel (section headings)
    │       ├── ComboboxSeparator
    │       └── N8nCombobox2Item (reka-ui ComboboxItem + default row: icon, label, check)
    └── footer slot
```

## Public API Definition

**Props**

- `id?: string` — Applied to the combobox input
- `name?: string` — Form field name passed to reka-ui root
- `placeholder?: string` — Shown in the input when no value is selected | `default: 'Select an option'`
- `emptyText?: string` — Shown when filtering returns no matches | `default: 'No results found.'`
- `autoFocus?: boolean` — Focus the input on mount
- `items?: ComboboxItem[]` — Array of options to render (see [Item shapes](#item-shapes) below)
- `valueKey?: string` — When `items` is an array of objects, field to use as the value | `default: 'value'`
- `labelKey?: string` — When `items` is an array of objects, field to use as the label | `default: 'label'`
- `defaultValue?: AcceptableValue | AcceptableValue[]` — Initial value when uncontrolled
- `modelValue?: AcceptableValue | AcceptableValue[]` — Controlled value. Bind with `v-model`
- `multiple?: boolean` — Allow selecting multiple options
- `open?: boolean` — Controlled open state. Bind with `v-model:open`
- `defaultOpen?: boolean` — Initial open state when uncontrolled
- `disabled?: boolean` — Disable interaction
- `required?: boolean` — Mark the field as required (reka-ui root)
- `icon?: IconName` — Leading icon in the trigger (typically derived from the selected item)
- `ignoreFilter?: boolean` — Disable built-in filtering
- `resetSearchTermOnBlur?: boolean` — Reset search text on blur | reka default: `true`
- `resetSearchTermOnSelect?: boolean` — Reset search text on select | reka default: `true`
- `openOnFocus?: boolean` — Open dropdown when input is focused | default: `true`
- `openOnClick?: boolean` — Open dropdown when input is clicked | reka default: `false`
- `highlightOnHover?: boolean` — Highlight items on hover (reka-ui root)
- `clearable?: boolean` — When `true`, shows a clear button (×) when a value is selected. Hidden when disabled or empty. Default: `false`
- `teleported?: boolean` — Whether to teleport the dropdown to body. Default: `true`
- `portalTarget?: string | HTMLElement` — Portal target element (e.g. pop-out window's `document.body`). When set, portals content to the specified element.

**UI Props**

- `size?`: `'mini' | 'small' | 'medium' | 'large' | 'xlarge'` | `default: 'large'` — Applies to the trigger/input only. Dropdown items use a fixed size aligned with `DropdownMenu`.
- `side?`: `'top' | 'right' | 'bottom' | 'left'` | `default: 'bottom'`
- `sideOffset?`: `number` | `default: 4`
- `align?`: `'start' | 'center' | 'end'` | `default: 'start'`
- `contentClass?`: `string` — Additional class(es) on the portaled dropdown content

The dropdown content defaults to a max height of **500px** with vertical scrolling on the viewport. Override by setting the CSS variable on a custom class:

```css
.my-combobox-content {
  --combobox-content--max-height: 300px;
}
```

**Events**

- `update:modelValue(value: AcceptableValue | AcceptableValue[])` — For single selection, clearing emits `undefined`. For multiple selection, clearing emits `[]`.
- `update:open(value: boolean)`
- `highlight(payload: { ref: HTMLElement; value: AcceptableValue } | undefined)` — reka-ui root

**Exposed**

- `anchorRef` — Ref to the `ComboboxAnchor` element

**Attributes**

Non-prop attributes (e.g. `aria-label`, `data-test-id`) fall through to `ComboboxAnchor`, not the root.

**Slots**

- `item`: `{ item: ComboboxListItem }` — Replace the default item renderer
- `item-leading`: `{ item: ComboboxListItem; ui: { class: string } }`
- `item-label`: `{ item: ComboboxListItem }`
- `item-trailing`: `{ item: ComboboxListItem; ui: { class: string } }`
- `label`: `{ item: ComboboxListItem }` — Section heading for `type: 'label'` items
- `header`: `()` — Content above the scrollable list
- `footer`: `()` — Content below the scrollable list

### Item shapes

`ComboboxItem` is either a primitive value or an object:

```typescript
type AcceptableValue = string | number | bigint | Record<string, unknown> | null | undefined;

type ComboboxListItem = {
  value?: AcceptableValue;
  label?: string;
  type?: 'label' | 'separator' | 'item'; // omit for selectable items
  icon?: IconName;
  disabled?: boolean;
};

type ComboboxItem = Exclude<AcceptableValue, undefined> | ComboboxListItem;
```

- **Primitive items** (e.g. `'Todo'`) — value and label are the same string; `modelValue` is the primitive.
- **Object items** (e.g. `{ label: 'Option 1', value: 'option1' }`) — `modelValue` stores the value field; the input displays the label.
- **Labels** — `{ type: 'label', label: 'Fruits' }` — non-interactive section heading.
- **Separators** — `{ type: 'separator' }` — non-interactive divider between groups.

Object items may also include an `icon` property. When no custom `#item-leading` slot is provided, icons on items are rendered automatically.

### Template usage examples

**String items**

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

**Object items with icons**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nCombobox2, N8nIcon } from '@n8n/design-system';

const items = ref([
  { value: 'light', label: 'Light', icon: 'wrench' },
  { value: 'dark', label: 'Dark', icon: 'filled-square' },
]);
const value = ref('light');
const icon = computed(() => items.value.find((item) => item.value === value.value)?.icon);
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items" :icon="icon">
    <template #item-leading="{ item }">
      <N8nIcon :icon="item.icon" color="primary" />
    </template>
  </N8nCombobox2>
</template>
```

**Grouped list with labels and separators**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = ref([
  { type: 'label', label: 'Fruits' },
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { type: 'separator' },
  { type: 'label', label: 'Vegetables' },
  { label: 'Carrot', value: 'carrot' },
]);
const value = ref<string | undefined>();
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items" placeholder="Select a food..." />
</template>
```

**Controlled value and open state**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = [
  { label: 'Workflows', value: 'workflows' },
  { label: 'Credentials', value: 'credentials' },
];
const value = ref<string | undefined>('workflows');
const open = ref(false);
</script>

<template>
  <N8nCombobox2
    v-model="value"
    v-model:open="open"
    :items="items"
    placeholder="Search..."
  />
</template>
```

**Clearable selection**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = ['Option 1', 'Option 2', 'Option 3'];
const value = ref<string | undefined>('Option 1');
</script>

<template>
  <N8nCombobox2
    v-model="value"
    :items="items"
    clearable
    placeholder="Search..."
  />
</template>
```

When the clear button is clicked, single selection emits `undefined`, multiple selection emits `[]`, and the input is refocused.

**Custom dropdown max height**

```vue
<N8nCombobox2
  :items="items"
  content-class="narrow-combobox"
/>
```

```css
.narrow-combobox {
  --combobox-content--max-height: 300px;
}
```

## Related components

- **N8nSelect2** — Use for short static lists without search (fewer than ~10 items).
- **N8nCombobox2Item** — Reka-ui combobox item with the default row layout (icon, label, check indicator). Used inside `N8nCombobox2`.
