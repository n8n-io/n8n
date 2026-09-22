# Component specification

Presents a list of mutually exclusive options where the user can select exactly one. Used when the choice is required and all options should be visible at once.

- **Component Name:** N8nRadioGroup, N8nRadioGroupItem
- **Figma Component:** TBD (DS-559)
- **Reka UI Component:** [Radio Group](https://reka-ui.com/docs/components/radio-group)


## Public API Definition

**RadioGroup props**

- `modelValue?: string` - The controlled selected value. Can be bind as `v-model`
- `defaultValue?: string` - The selected value when initially rendered. Use when you do not need to control the state
- `orientation?: 'vertical' | 'horizontal'` - Layout direction of the radio options. Default: `'vertical'`
- `disabled?: boolean` - When `true`, prevents the user from interacting with any option
- `required?: boolean` - When `true`, indicates that the user must select an option before submitting
- `name?: string` - The name of the group for form submission
- `loop?: boolean` - Whether keyboard navigation wraps from last to first item
- `dir?: 'ltr' | 'rtl'` - Reading direction of the group


**RadioGroup events**

- `update:modelValue(value: string)` - Event fired when the selected value updates


**RadioGroup slots**

- `default` - Radio items to render inside the group


**RadioGroupItem props**

- `value: string` - The value associated with this option
- `label?: string` - Text label displayed next to the radio control
- `description?: string` - Optional helper text rendered under the label
- `disabled?: boolean` - When `true`, prevents the user from selecting this option


**RadioGroupItem slots**

- `label`: `{ label?: string, description?: string }` - Custom content for the label


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'

const mode = ref('all')
</script>

<template>
  <N8nRadioGroup v-model="mode">
    <N8nRadioGroupItem value="all" label="All" description="Grant every available scope" />
    <N8nRadioGroupItem value="readOnly" label="Read only" description="Read and list scopes only" />
    <N8nRadioGroupItem value="custom" label="Custom" description="Pick scopes individually" />
  </N8nRadioGroup>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const theme = ref('system')
</script>

<template>
  <N8nRadioGroup v-model="theme" orientation="horizontal">
    <N8nRadioGroupItem value="system" label="System" />
    <N8nRadioGroupItem value="light" label="Light" />
    <N8nRadioGroupItem value="dark" label="Dark" />
  </N8nRadioGroup>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const agreement = ref('')
</script>

<template>
  <N8nRadioGroup v-model="agreement">
    <N8nRadioGroupItem value="terms">
      <template #label>
        I accept the <a href="/terms">terms and conditions</a>
      </template>
    </N8nRadioGroupItem>
  </N8nRadioGroup>
</template>
```
