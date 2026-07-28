# Component specification

Allows users to choose one or more options from a predefined list. It supports both single and multiple selection modes via the multiple prop.
Built-in search (`searchable`) filters the dropdown by item label. For larger datasets that need typeahead in the trigger itself, use [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev) (to be done).

- **Component Name:** N8nSelect
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElSelect](https://element-plus.org/en-US/component/select)
- **Reka UI Component:** [Select](https://reka-ui.com/docs/components/select)
- **Nuxt UI Component:** [Select](https://ui.nuxt.com/docs/components/select)


## Public API Definition

**Props**

- `id?: string`
- `placeholder?: string`
- `items?: T` Array for elements to render
- `valueKey?: VK` When `items` is an array of objects, select the field to use as the value.
- `labelKey?: GetItemKeys<T>` When `items` is an array of objects, select the field to use as the label.
- `defaultValue?: GetModelValue<T, VK, M>` The value of the Select when initially rendered. Use when you do not need to control the state of the Select.
- `modelValue?: GetModelValue<T, VK, M>` The controlled value of the Select. Can be bind as `v-model`.
- `multiple?: boolean` Whether multiple options can be selected or not.
- `open?: boolean`  The controlled open state of the Select. Can be bind as `v-model:open`.
- `defaultOpen?: boolean` The open state of the select when it is initially rendered. Use when you do not need to control its open state.
- `disabled?: boolean` When `true`, prevents the user from interacting with Select.
- `icon?: IconName` Icon to be displayed in the trigger.
- `clearable?: boolean` When `true`, shows a clear button when a value is selected.
- `searchable?: boolean` When `true`, shows a search field in the dropdown and filters items by label.
- `searchPlaceholder?: string` Placeholder for the search field.
- `searchQuery?: string` Controlled search query (`v-model:searchQuery`).


**UI Props**

- `size?`: `'mini' | 'default' | 'medium' | 'large' | 'xlarge'` | `default: 'default'` (shared input size tokens; `default` → small)
- `variant?`: `'default' | 'ghost' | 'flush'` | `default: 'default'` (`flush` strips padding for dense layouts like table cells)

**Events**

- `update:modelValue(value: GetModelValue<T, VK, M> | undefined)`
- `update:open(value: boolean)`
- `update:searchQuery(value: string)`
- `clear()`

**Slots**

- `default`: `{ modelValue?: GetModelValue<T, VK, M>; open: boolean }`
- `item`: `{ item: T; }`
- `item-leading`: `{ item: T; ui: object }`
- `item-label`: `{ item: T; }`
- `item-trailing`: `{ item: T; ui: object }`
- `header?: ()`
- `footer?: ()`
- `empty?: ()` — shown when there are no selectable items (e.g. search with no matches)


### Template usage example

```Typescript
<script setup lang="ts">
const items = ref(['Backlog', 'Todo', 'In Progress', 'Done'])
const value = ref('Backlog')
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
