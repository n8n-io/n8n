# Component specification

Allows users to choose one or more options from a predefined list. It supports both single and multiple selection modes via the multiple prop.
Built-in search (`searchable`) filters the dropdown by item label (or `textValue` when provided). For larger datasets that need typeahead in the trigger itself, use [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev) (to be done).

- **Component Name:** N8nSelect
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElSelect](https://element-plus.org/en-US/component/select)
- **Reka UI Component:** [Select](https://reka-ui.com/docs/components/select)
- **Nuxt UI Component:** [Select](https://ui.nuxt.com/docs/components/select)


## Public API Definition

**Item shape**

Selectable items must be objects with required `value` and `label`. Structural rows use a discriminant `type`:

```Typescript
type SelectValue = string | number;

type SelectOptionBase<TValue extends SelectValue = SelectValue> = {
	type?: 'item';
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	textValue?: string; // optional search text; defaults to label
};

type SelectLabelItem = { type: 'label'; label: string };
type SelectSeparatorItem = { type: 'separator' };
type SelectItem = SelectOptionBase | SelectLabelItem | SelectSeparatorItem;
```

Consumers that need extra fields should extend the base type and map source data themselves:

```Typescript
interface CustomOption extends SelectOptionBase<string> {
	description: string;
}
```

Primitives, object values, and `valueKey` / `labelKey` mapping are intentionally not supported.

**Props**

- `id?: string`
- `placeholder?: string`
- `items?: SelectItem[]` Array of options / labels / separators to render
- `defaultValue?: SelectValue | SelectValue[]` The value of the Select when initially rendered. Use when you do not need to control the state of the Select.
- `modelValue?: SelectValue | SelectValue[]` The controlled value of the Select. Can be bind as `v-model`.
- `multiple?: boolean` Whether multiple options can be selected or not.
- `open?: boolean` The controlled open state of the Select. Can be bind as `v-model:open`.
- `defaultOpen?: boolean` The open state of the select when it is initially rendered. Use when you do not need to control its open state.
- `disabled?: boolean` When `true`, prevents the user from interacting with Select.
- `required?: boolean` When `true`, indicates that an option must be selected.
- `name?: string` The name of the native select field used in form submission.
- `autocomplete?: string` Native HTML `autocomplete` attribute.
- `dir?: 'ltr' | 'rtl'` Reading direction. When omitted, inherits from `ConfigProvider` or defaults to LTR.
- `icon?: IconName` Icon to be displayed in the trigger.
- `clearable?: boolean` When `true`, shows a clear button when a value is selected.
- `searchable?: boolean` When `true`, shows a search field in the dropdown and filters items by label.
- `searchPlaceholder?: string` Placeholder for the search field.
- `searchQuery?: string` Controlled search query (`v-model:searchQuery`).
- `position?: 'item-aligned' | 'popper'` Positioning mode for the dropdown. Default: `'item-aligned'`.
- `side?: 'top' | 'right' | 'bottom' | 'left'` Preferred side when `position` is `'popper'`. Default: `'bottom'`.
- `sideOffset?: number` Distance in pixels from the trigger when `position` is `'popper'`. Default: `5`.
- `contentClass?: string` Additional CSS class(es) applied to the dropdown content container (portaled).


**UI Props**

- `size?`: `'mini' | 'small' | 'medium' | 'large' | 'xlarge'` | `default: 'small'` (matches `N8nInput`)
- `variant?`: `'default' | 'ghost' | 'flush'` | `default: 'default'` (`flush` strips padding for dense layouts like table cells)

**Events**

- `update:modelValue(value: SelectValue | SelectValue[] | undefined)`
- `update:open(value: boolean)`
- `update:searchQuery(value: string)`
- `clear()`

**Slots**

- `default`: `{ modelValue?: SelectValue | SelectValue[]; open: boolean }`
- `item`: `{ item: SelectOptionBase }`
- `label`: `{ item: SelectLabelItem }` — group label rows (`type: 'label'`)
- `item-leading`: `{ item: SelectOptionBase; ui: object }`
- `item-label`: `{ item: SelectOptionBase }`
- `item-trailing`: `{ item: SelectOptionBase; ui: object }`
- `header?: ()`
- `footer?: ()`
- `empty?: ()` — shown when there are no selectable items (e.g. search with no matches)


### Template usage example

```Typescript
<script setup lang="ts">
const items = ref([
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'todo', label: 'Todo' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'done', label: 'Done' },
])
const value = ref('backlog')
</script>

<template>
  <N8nSelect v-model="value" :items="items" />
</template>
```

```Typescript
<script setup lang="ts">
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
const icon = computed(() => items.value.find(item => item.value === value.value)?.icon)
</script>

<template>
  <Select v-model="value" :items="items" :icon="icon" >
	<template #item-leading="{ item }">
		<N8nIcon :icon="item.icon" color="primary"/>
	</template>
	<template #item-label="{ item }">
		Custom label: {{ item.label }}
	</template>
	<template #item-trailing="{ item }">
		<N8nIcon :icon="item.icon" color="secondary"/>
	</template>
</Select>
</template>
```
