# Component specification

Allows users to choose one or more options from a predefined list. It supports both single and multiple selection modes via the multiple prop.
The Select is ideal when there are less than 10 items to choose from, for bigger datasets or search capabilities, use [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev) (to be done)

- **Component Name:** N8nSelect
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElSelect](https://element-plus.org/en-US/component/select)
- **Reka UI Component:** [Select](https://reka-ui.com/docs/components/select)
- **Nuxt UI Component:** [Select](https://ui.nuxt.com/docs/components/select)


## Public API Definition

**Props**

- `id?: string`
- `placeholder?: string`
- `items?: T` Array or Nested Array for elements to render (nested array represent groups)
- `valueKey?: VK` When `items` is an array of objects, select the field to use as the value.
- `labelKey?: GetItemKeys<T>` When `items` is an array of objects, select the field to use as the label.
- `defaultValue?: GetModelValue<T, VK, M>` The value of the Select when initially rendered. Use when you do not need to control the state of the Select.
- `modelValue?: GetModelValue<T, VK, M>` The controlled value of the Select. Can be bind as `v-model`.
- `multiple?: boolean` Whether multiple options can be selected or not.
- `open?: boolean`  The controlled open state of the Select. Can be bind as `v-model:open`.
- `defaultOpen?: boolean` The open state of the select when it is initially rendered. Use when you do not need to control its open state.
- `disabled?: boolean` When `true`, prevents the user from interacting with Select.
- `icon?: IconName` Icon to be displayed in the trigger.


**UI Props**

- `size?`: `'xsmall' | 'small' | 'medium'` | `default: 'small'`
- `variant?`: `'default' | 'ghost'` | `default: 'default'`

**Events**

- `update:modelValue(value: GetModelValue<T, VK, M>)`
- `update:open(value: boolean)`

**Slots**

- `default`: `{ modelValue?: GetModelValue<T, VK, M>; open: boolean }`
- `item`: `{ item: T; index: number }`
- `item-leading`: `{ item: T; index: number }`
- `item-label`: `{ item: T; index: number }`
- `item-trailing`: `{ item: T; index: number }`


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
