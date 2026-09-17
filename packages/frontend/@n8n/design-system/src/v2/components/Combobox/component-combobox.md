# Component specification

Allows users to search and choose one or more options from a list. All comboboxes filter as the user types and open the dropdown on input focus. Supports single and multiple selection, grouped lists (groups and separators), and is suited to larger datasets where a plain Select is not enough.

- **Component Name:** N8nCombobox2
- **Figma Component:** [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev)
- **Reka UI Component:** [Combobox](https://reka-ui.com/docs/components/combobox)

## Component structure

```
Combobox (N8nCombobox2)
├── ComboboxAnchor (trigger chrome)
│   ├── Single: leading icon + ComboboxInput + clear + chevron
│   └── Multiple: N8nTagsInput2 (embedded) + clear + chevron
│       └── #input slot: ComboboxInput as-child → TagsInputInput
└── ComboboxContent (portaled dropdown, role="listbox", max-height 500px by default)
    └── ComboboxViewport (scrollable list area)
        ├── ComboboxEmpty
        └── ComboboxGroup (one per `type: 'group'`, or batched top-level options)
            ├── ComboboxLabel (optional section heading)
            └── N8nCombobox2Item (reka-ui ComboboxItem + default row: icon, label, check)
```

There are no header/footer slots. Reka applies `role="listbox"` to `ComboboxContent`, so non-option content (buttons, links, freeform markup) would break the ARIA listbox pattern. For section headings use `type: 'group'` with an optional `label`; for actionable chrome (e.g. “Create new…”) add a selectable option — see [Header and footer actions](#header-and-footer-actions).

When `multiple` is true, selected values render via embedded `N8nTagsInput2` (shared chip/layout styles; Combobox keeps the field chrome). Freeform tag creation is disabled — values are only added from the dropdown.

Use `type: 'group'` for sections. The `label` is optional. Each group maps to its own reka `ComboboxGroup`, so heading DOM `id`s stay unique and `aria-labelledby` points at the correct label. Top-level options (outside any group) are batched into an unlabeled group. Dividers are CSS between consecutive *visible* groups (`:not([hidden]) ~ :not([hidden])`), so they disappear when Reka hides a group that has no filter matches. `{ type: 'separator' }` is only a split marker for unlabeled options — it is not rendered as a DOM node (Reka would not filter a separator element).

## Public API Definition

**Props**

- `id?: string` — Applied to the combobox input. Falls back to a generated id when omitted so the field always has an `id` for label association and browser a11y checks
- `name?: string` — Form field name passed to reka-ui root
- `placeholder?: string` — Shown in the input when no value is selected | `default: t('combobox.placeholder')`
- `emptyText?: string` — Shown when filtering returns no matches | `default: t('combobox.emptyText')`
- `autoFocus?: boolean` — Focus the input on mount
- `items?: ComboboxItem[]` — Array of options to render (see [Item shapes](#item-shapes) below). If `modelValue` is set before items resolve, the input shows the raw value until a matching item is available, then updates to that item's `label`. There is no built-in pending/skeleton state — wrap the field at the call site if you need one.
- `defaultValue?: ComboboxValue | ComboboxValue[]` — Initial value when uncontrolled. Seeds the selection used for tags, the clear button, leading icon, and `data-empty` (same as a controlled `modelValue`).
- `modelValue?: ComboboxValue | ComboboxValue[]` — Controlled value. Bind with `v-model`
- `multiple?: boolean` — Allow selecting multiple options. Selected values render as removable tags via embedded `N8nTagsInput2` (search input stays empty; filtering still works while typing)
- `open?: boolean` — Controlled open state. Bind with `v-model:open`
- `defaultOpen?: boolean` — Initial open state when uncontrolled
- `disabled?: boolean` — Disable interaction
- `required?: boolean` — Mark the field as required (reka-ui root)
- `icon?: IconName` — Leading icon in the trigger when no selected item icon is available
- `ignoreFilter?: boolean` — Disable built-in filtering
- `resetSearchTermOnBlur?: boolean` — Reset search text on blur | reka default: `true`
- `resetSearchTermOnSelect?: boolean` — Reset search text on select | reka default: `true`
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

- `update:modelValue(value: ComboboxValue | ComboboxValue[])` — For single selection, clearing emits `undefined`. For multiple selection, clearing emits `[]`.
- `update:open(value: boolean)`
- `highlight(payload: { ref: HTMLElement; value: ComboboxValue } | undefined)` — reka-ui root

**Exposed**

- `anchorRef` — Ref to the `ComboboxAnchor` element

**Attributes**

- `aria-*` fallthrough attributes are forwarded to the combobox input. The placeholder is never used as an accessible name — associate a `<label>` via the input `id` (generated when omitted, or pass an explicit `id`), or pass `aria-label` / `aria-labelledby`.
- Other non-prop attributes (e.g. `data-test-id`) fall through to `ComboboxAnchor`, not the root.

**Slots**

- `item`: `{ item: ComboboxOptionBase }` — Custom item rendering (replaces default `N8nCombobox2Item`). Prefer `#item-leading` / `#item-label` / `#item-trailing` for content customization. If you use `#item`, you must re-render `N8nCombobox2Item` (or an equivalent Reka `ComboboxItem`) yourself — otherwise the option loses selection, highlighting, filtering, and accessibility semantics.
- `item-leading`: `{ item: ComboboxOptionBase; ui: { class: string } }` — Pass-through to `N8nCombobox2Item`
- `item-label`: `{ item: ComboboxOptionBase }` — Pass-through to `N8nCombobox2Item`
- `item-trailing`: `{ item: ComboboxOptionBase; ui: { class: string } }` — Pass-through to `N8nCombobox2Item`
- `label`: `{ item: ComboboxGroupItem }` — Section heading for `type: 'group'` entries that have a `label`

### Item shapes

Selectable items must include a non-empty `label` and `value`. Map source data at the call site; the component does not support `valueKey` / `labelKey` or primitive string items. In development, missing/empty `value` or `label` are skipped with a console warning; in production builds they are dropped silently.

```typescript
type ComboboxValue = string;

type ComboboxOptionBase<TValue extends ComboboxValue = ComboboxValue> = {
  type?: 'item';
  value: TValue; // required — must not be ''
  label: string; // required
  icon?: IconName;
  disabled?: boolean;
  /** Filter text when it should differ from `label` (e.g. slot-rendered label). Defaults to `label`. */
  textValue?: string;
  /** Extra strings matched during filtering (e.g. synonyms). Checked alongside `textValue` / `label`. */
  keywords?: string[];
  /** Call `event.preventDefault()` to run an action without updating the selection. */
  onSelect?: (event: Event) => void;
};

type ComboboxItem =
  | ComboboxOptionBase
  | { type: 'group'; label?: string; items: ComboboxOptionBase[] }
  | { type: 'separator' };
```

Consumers that need extra fields can extend the base type:

```typescript
interface CustomOption extends ComboboxOptionBase<string> {
  description: string;
}
```

- **Object items** (e.g. `{ label: 'Option 1', value: 'option1' }`) — `modelValue` stores `value`; the input displays `label`. Missing/empty `value` or `label` are skipped (with a console warning in development) — empty string values are never passed to reka (they would kill the dropdown).
- **Groups** — `{ type: 'group', label?: 'Fruits', items: [...] }` — optional section heading plus nested options. Label may be omitted for an unlabeled group. Consecutive visible groups always get a decorative divider.
- **Separators** — `{ type: 'separator' }` — splits unlabeled top-level options into sibling groups (so they get a divider). Not a DOM node; two explicit `type: 'group'` entries already divide.

Object items may also include an `icon` property. When no custom `#item-leading` slot is provided, icons on items are rendered automatically. The same `#item-leading` slot (or default icon) is also used for the selected value in the trigger.

### Template usage examples

**Object items**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = ref([
  { label: 'Backlog', value: 'backlog' },
  { label: 'Todo', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]);
const value = ref('backlog');
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items" placeholder="Search status..." />
</template>
```

**Object items with icons**

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
    <template #item-leading="{ item, ui }">
      <N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
    </template>
  </N8nCombobox2>
</template>
```

**Using N8nCombobox2Item for full control**

`#item` replaces the default item renderer entirely (same escape hatch as `N8nSelect2` / `N8nDropdownMenu`). Re-render `N8nCombobox2Item` so the option keeps Reka semantics — use this when you need to compose around the item (e.g. wrap it in a popover), not for ordinary content customization.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2, N8nCombobox2Item, N8nBadge } from '@n8n/design-system';

const items = ref([
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
]);
const value = ref<string | undefined>();
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items">
    <template #item="{ item }">
      <N8nCombobox2Item v-bind="item">
        <template #item-trailing="{ ui }">
          <N8nBadge :class="ui.class">Custom</N8nBadge>
        </template>
      </N8nCombobox2Item>
    </template>
  </N8nCombobox2>
</template>
```

**Grouped list with groups and separators**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = ref([
  {
    type: 'group',
    label: 'Fruits',
    items: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ],
  },
  { type: 'separator' },
  {
    type: 'group',
    label: 'Vegetables',
    items: [{ label: 'Carrot', value: 'carrot' }],
  },
]);
const value = ref<string | undefined>();
</script>

<template>
  <N8nCombobox2 v-model="value" :items="items" placeholder="Select a food..." />
</template>
```

**Header and footer actions**

Do not place buttons or other freeform interactive controls in the popup — they sit inside `role="listbox"` and break the ARIA pattern. Model actions as selectable options instead: use `type: 'group'` for labeled sections, `{ type: 'separator' }` (or a second group) to visually pin an action, and `onSelect` with `event.preventDefault()` so the action does not become the field value.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Orange', value: 'orange' },
];

const open = ref(false);
const createOpen = ref(false);
const value = ref<string | undefined>();

const items = computed(() => [
  {
    type: 'group' as const,
    label: 'Fruits',
    items: options,
  },
  { type: 'separator' as const },
  {
    label: 'Create new fruit',
    value: '__create__',
    icon: 'plus' as const,
    onSelect: (event: Event) => {
      event.preventDefault();
      open.value = false;
      createOpen.value = true;
    },
  },
]);
</script>

<template>
  <N8nCombobox2
    v-model="value"
    v-model:open="open"
    :items="items"
    placeholder="Select a fruit..."
  />
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

const items = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Option 3', value: 'option3' },
];
const value = ref<string | undefined>('option1');
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

When the clear button is clicked, single selection emits `undefined`, multiple selection emits `[]`, and the input is refocused. Clearing the input text to search again does **not** clear the committed selection — abandon the search (Escape / blur) to restore the display via `resetSearchTermOnBlur`.

**Multiple selection (tags)**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nCombobox2 } from '@n8n/design-system';

const items = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Orange', value: 'orange' },
];
const value = ref<string[]>(['apple']);
</script>

<template>
  <N8nCombobox2
    v-model="value"
    :items="items"
    multiple
    clearable
    placeholder="Select fruits..."
  />
</template>
```

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
