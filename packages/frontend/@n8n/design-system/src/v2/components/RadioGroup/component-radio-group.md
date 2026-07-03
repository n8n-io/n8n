# Component specification

Presents a list of mutually exclusive options where the user can select exactly one. Used when the choice is required and all options should be visible at once.

- **Component Name:** N8nRadioGroup
- **Figma Component:** TBD (DS-559)
- **Reka UI Component:** [Radio Group](https://reka-ui.com/docs/components/radio-group)
- **Linear Ticket:** DS-359


## Public API Definition

**RadioGroup props**

- `modelValue?: string` - The controlled selected value. Can be bound as `v-model`
- `defaultValue?: string` - The selected value when initially rendered (uncontrolled)
- `orientation?: 'vertical' | 'horizontal'` - Layout direction. Default: `'vertical'`
- `disabled?: boolean` - When `true`, prevents interaction with all options
- `name?: string` - The name of the group for form submission
- `required?: boolean` - When `true`, indicates a selection is required before submitting
- `ariaLabel?: string` - Accessible name when no visible group label is present
- `loop?: boolean` - Whether keyboard navigation wraps from last to first item
- `dir?: 'ltr' | 'rtl'` - Reading direction of the group

**RadioGroup events**

- `update:modelValue(value: string)` - Fired when the selected value changes

**RadioGroup slots**

- `default` - Radio items to render inside the group


**RadioGroupItem props**

- `value: string` - The value associated with this option (required)
- `label?: string` - Primary label text displayed next to the radio control
- `description?: string` - Optional helper text rendered under the label
- `disabled?: boolean` - When `true`, prevents selecting this option
- `testId?: string` - Forwarded to the radio element as `data-test-id`

**RadioGroupItem slots**

- `label` - Custom label content. Receives `label` and `description` props. Overrides the default label/description rendering.


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nRadioGroup2, N8nRadioGroupItem2 } from '@n8n/design-system'

const mode = ref('all')
</script>

<template>
  <N8nRadioGroup2 v-model="mode" aria-label="Scope selection mode">
    <N8nRadioGroupItem2 value="all" label="All" description="Grant every available scope" />
    <N8nRadioGroupItem2 value="readOnly" label="Read only" description="Read and list scopes only" />
    <N8nRadioGroupItem2 value="custom" label="Custom" description="Pick scopes individually" />
  </N8nRadioGroup2>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nRadioGroup2, N8nRadioGroupItem2 } from '@n8n/design-system'

const theme = ref('system')
</script>

<template>
  <N8nRadioGroup2 v-model="theme" orientation="horizontal" aria-label="Theme">
    <N8nRadioGroupItem2 value="system" label="System" />
    <N8nRadioGroupItem2 value="light" label="Light" />
    <N8nRadioGroupItem2 value="dark" label="Dark" />
  </N8nRadioGroup2>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nRadioGroup2, N8nRadioGroupItem2 } from '@n8n/design-system'

const agreement = ref('')
</script>

<template>
  <N8nRadioGroup2 v-model="agreement" aria-label="Agreement">
    <N8nRadioGroupItem2 value="terms">
      <template #label>
        I accept the <a href="/terms">terms and conditions</a>
      </template>
    </N8nRadioGroupItem2>
  </N8nRadioGroup2>
</template>
```
