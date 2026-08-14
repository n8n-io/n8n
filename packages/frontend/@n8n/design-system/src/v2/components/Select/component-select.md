# Component specification

Allows users to choose one or more options from a predefined list. It supports both single and multiple selection modes via the `multiple` prop.
Built-in search (`searchable`) filters the dropdown by `textValue` (falling back to `label`) and `keywords` (case-insensitive substring). Closing the menu clears the query. Groups and separators without a matching item are dropped from the filtered list. When search is off, Reka typeahead matches the prefix of `textValue` (falling back to `label`); `keywords` are not used. For larger datasets that need typeahead in the trigger itself, use [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev) (to be done).

- **Component Name:** N8nSelect2
- **Related export:** N8nSelect2Item (default menu row; use when replacing the `item` slot)
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElSelect](https://element-plus.org/en-US/component/select)
- **Reka UI Component:** [Select](https://reka-ui.com/docs/components/select)
- **Nuxt UI Component:** [Select](https://ui.nuxt.com/docs/components/select)


## Public API Definition

**Item shape**

Selectable items must be objects with required `value` and `label`. Empty `value` or `label` is skipped (dev warning). Use `type: 'group'` for sections. The `label` is optional. Each group maps to its own Reka `SelectGroup`, so heading DOM `id`s stay unique and `aria-labelledby` points at the correct label. Top-level options (outside any group) are batched into an unlabeled group. Separators belong at the top level between groups.

```typescript
type SelectValue = string | number;

type SelectOptionBase<TValue extends SelectValue = SelectValue> = {
	type?: 'item';
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	textValue?: string; // search / typeahead text; defaults to label (use for slot-rendered labels)
	keywords?: string[]; // extra searchable terms (synonyms); not used by typeahead
	onSelect?: (event: Event) => void; // preventDefault() keeps the value from updating
};

type SelectItem =
	| SelectOptionBase
	| { type: 'group'; label?: string; items: SelectOptionBase[] }
	| { type: 'separator' };
type SelectItemUi = { class: string; strokeWidth?: number };
```

Item `icon` is rendered in the menu automatically. In single select, the same leading content (`#item-leading` when provided, otherwise the item `icon`) is shown on the trigger for the selected value — including when `#item-leading` is used without `icon`.

Consumers that need extra fields should extend the base type and map source data themselves:

```typescript
interface CustomOption extends SelectOptionBase<string> {
	description: string;
}
```

Primitives, object values, and `valueKey` / `labelKey` mapping are intentionally not supported.

**Props**

- `id?: string`
- `placeholder?: string` Visual empty-state text in the trigger. Defaults to `t('nds.select.placeholder')` (`Select an option`). Not used as the accessible name — pass `aria-label` / `aria-labelledby`, or associate a `<label>` via `id`.
- `items?: SelectItem[]` Array of options / groups / separators to render
- `defaultValue?: SelectValue | SelectValue[]` The value of the Select when initially rendered. Use when you do not need to control the state of the Select.
- `modelValue?: SelectValue | SelectValue[]` The controlled value of the Select. Bind as `v-model`. Typed as `SelectValue[]` when `multiple` is `true`.
- `multiple?: boolean` Whether multiple options can be selected or not.
- `open?: boolean` The controlled open state of the Select. Bind as `v-model:open`.
- `defaultOpen?: boolean` The open state of the select when it is initially rendered. Use when you do not need to control its open state.
- `disabled?: boolean` When `true`, prevents the user from interacting with Select.
- `required?: boolean` When `true`, indicates that an option must be selected.
- `name?: string` The name of the native select field used in form submission.
- `autocomplete?: string` Native HTML `autocomplete` attribute.
- `dir?: 'ltr' | 'rtl'` Reading direction. When omitted, inherits from `ConfigProvider` or defaults to LTR.
- `icon?: IconName` Fallback leading icon on the trigger when nothing is selected, or the selected item has no leading visual. In single select, a selected item's `#item-leading` (or its `icon`) is shown on the trigger instead.
- `clearable?: boolean` When `true`, shows a clear button when a value is selected. Hidden when `disabled` or the value is empty. Default: `false`.
- `searchable?: boolean` When `true`, shows a search field in the dropdown and filters items by `textValue` (falling back to `label`) and `keywords`. Default: `false`.
- `searchPlaceholder?: string` Placeholder for the search field. Defaults to `t('nds.select.searchPlaceholder')` (`Search`).
- `searchQuery?: string` Controlled search query (`v-model:searchQuery`). Reset to `''` when the dropdown closes.
- `position?: 'item-aligned' | 'popper'` Positioning mode for the dropdown. Default: `'item-aligned'`.
- `side?: 'top' | 'right' | 'bottom' | 'left'` Preferred side when `position` is `'popper'`. Default: `'bottom'`.
- `sideOffset?: number` Distance in pixels from the trigger when `position` is `'popper'`. Default: `5`.
- `contentClass?: string` Additional CSS class(es) applied to the dropdown content container (portaled).


**UI Props**

- `size?`: `'mini' | 'small' | 'medium' | 'large' | 'xlarge'` | `default: 'small'` (matches `N8nInput`)
- `variant?`: `'default' | 'ghost' | 'flush'` | `default: 'default'` (`flush` strips padding for dense layouts like table cells)

**Events**

- `update:modelValue(value: SelectValue | SelectValue[] | undefined)` — single clear emits `undefined`; multiple clear emits `[]`
- `update:open(value: boolean)`
- `update:searchQuery(value: string)`
- `clear()`

**Slots**

- `default`: `{ modelValue?: SelectValue | SelectValue[]; open: boolean }` — trigger display. Default is the selected label(s), comma-separated in multiple mode.
- `item`: `{ item: SelectOptionBase }` — replace the whole menu row (use `N8nSelect2Item` to keep selection behaviour)
- `label`: `{ item: SelectGroupItem }` — section heading for `type: 'group'` entries that have a `label`
- `item-leading`: `{ item: SelectOptionBase; ui: SelectItemUi }` — bind `ui` onto custom leading content (`{ class, strokeWidth? }`). In single select, the same slot is reused on the trigger for the selected value, even when the item has no `icon`. Not used on the trigger in `multiple` mode.
- `item-label`: `{ item: SelectOptionBase }`
- `item-trailing`: `{ item: SelectOptionBase; ui: SelectItemUi }` — bind `ui` onto custom trailing content
- `header?: ()`
- `footer?: ()`
- `empty?: ()` — shown when there are no selectable items (e.g. search with no matches)

**Expose**

- `triggerRef` — Reka `SelectTrigger` instance


### Template usage example

**Basic:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'todo', label: 'Todo' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'done', label: 'Done' },
])
const value = ref('backlog')
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" />
</template>
```

**Custom item slots:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nIcon, N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{
		value: 'system',
		label: 'System Default',
		icon: 'settings',
		disabled: true,
	},
	{
		value: 'light',
		label: 'Light',
		icon: 'wrench',
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: 'filled-square',
	},
])
const value = ref('light')
</script>

<template>
  <N8nSelect2 v-model="value" :items="items">
	<template #item-leading="{ item, ui }">
		<N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
	</template>
	<template #item-label="{ item }">
		Custom label: {{ item.label }}
	</template>
	<template #item-trailing="{ item, ui }">
		<N8nIcon :icon="item.icon" color="secondary" v-bind="ui" />
	</template>
  </N8nSelect2>
</template>
```

**Searchable (`textValue` + `keywords`):**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{ value: 'us', label: 'United States', keywords: ['USA', 'America'] },
	{ value: 'de', label: 'Germany', textValue: 'Deutschland' },
])
const value = ref<string>()
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" searchable clearable />
</template>
```

**Grouped list with groups and separators:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

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
])
const value = ref<string | undefined>()
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" />
</template>
```

**Header and footer actions**

Do not put buttons in `#footer` / `#header` for actions that need a reliable click — they sit inside Reka's `role="listbox"` and pointer events are often swallowed. Model the action as an option: use `type: 'group'` for labeled sections, pin it with `type: 'separator'`, and call `event.preventDefault()` in `onSelect` so it does not become the field value.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const options = [
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
]
const value = ref<string | undefined>('member')
const open = ref(false)
const createOpen = ref(false)

const items = computed(() => [
  {
    type: 'group' as const,
    label: 'Roles',
    items: options,
  },
  { type: 'separator' as const },
  {
    label: 'Add custom role',
    value: '__add_custom_role__',
    icon: 'plus' as const,
    onSelect: (event: Event) => {
      event.preventDefault()
      open.value = false
      createOpen.value = true
    },
  },
])
</script>

<template>
  <N8nSelect2
    v-model="value"
    v-model:open="open"
    :items="items"
  />
</template>
```
