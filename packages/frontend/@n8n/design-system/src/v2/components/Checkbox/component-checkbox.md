# Component specification

Allows users to select one or more options from a list. The Checkbox component is ideal for binary (true/false) choices or when users need to select multiple options from a set of choices.

- **Component Name:** N8nCheckbox
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Reka UI Component:** [Checkbox](https://reka-ui.com/docs/components/checkbox)


## Public API Definition

**Props**

- `id?: string` - The ID of the checkbox element
- `label?: string` - Text label displayed next to the checkbox
- `modelValue?: boolean` - The controlled checked state of the checkbox. Can be bind as `v-model`
- `defaultValue?: boolean` - The checked state of the checkbox when initially rendered. Use when you do not need to control the state
- `disabled?: boolean` - When `true`, prevents the user from interacting with the checkbox
- `required?: boolean` - When `true`, indicates that the user must check the checkbox before submitting
- `name?: string` - The name of the checkbox for form submission
- `value?: string` - The value given as data when submitted with a name
- `indeterminate?: boolean` - When `true`, displays an indeterminate state (useful for "select all" checkboxes)
- `as?: string | Component` - Change the default rendered element for the one passed as a child, merging their props and behavior


**Events**

- `change(event: Event)` - Event fired when the checkbox value changes
- `update:modelValue(value: boolean)` - Event fired when the model value updates


**Slots**

- `label`: `{ label?: string }` - Custom content for the label


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isChecked = ref(false)
</script>

<template>
  <N8nCheckbox v-model="isChecked" label="Accept terms and conditions" />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const checkAll = ref(false)
const isIndeterminate = ref(true)
const checkedItems = ref(['item1', 'item2'])
const items = ['item1', 'item2', 'item3', 'item4']

function toggleCheckAll(value: boolean) {
  checkedItems.value = value ? [...items] : []
  isIndeterminate.value = false
}

function toggleItem(item: string) {
  const index = checkedItems.value.indexOf(item)
  if (index > -1) {
    checkedItems.value.splice(index, 1)
  } else {
    checkedItems.value.push(item)
  }

  const checkedCount = checkedItems.value.length
  checkAll.value = checkedCount === items.length
  isIndeterminate.value = checkedCount > 0 && checkedCount < items.length
}
</script>

<template>
  <N8nCheckbox
    v-model="checkAll"
    :indeterminate="isIndeterminate"
    label="Check all"
    @update:model-value="toggleCheckAll"
  />

  <N8nCheckbox
    v-for="item in items"
    :key="item"
    :model-value="checkedItems.includes(item)"
    :label="item"
    @update:model-value="toggleItem(item)"
  />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isChecked = ref(false)
</script>

<template>
  <N8nCheckbox v-model="isChecked">
    <template #label>
      I accept the <a href="/terms">terms and conditions</a>
    </template>
  </N8nCheckbox>
</template>
```
