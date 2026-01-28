# Component specification

A toggle control that allows users to switch between two states (on/off). The Switch component is ideal for binary choices where the effect is immediate, such as enabling or disabling a feature.

- **Component Name:** N8nSwitch2
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=81-530&m=dev)
- **Reka UI Component:** [Switch](https://reka-ui.com/docs/components/switch)


## Public API Definition

**Props**

- `id?: string` - The ID of the switch element
- `label?: string` - Text label displayed to the right of the switch
- `modelValue?: boolean` - The controlled checked state of the switch. Can be bound as `v-model`
- `defaultValue?: boolean` - The checked state of the switch when initially rendered. Use when you do not need to control the state
- `disabled?: boolean` - When `true`, prevents the user from interacting with the switch
- `required?: boolean` - When `true`, indicates that the user must check the switch before submitting
- `name?: string` - The name of the switch for form submission
- `value?: string` - The value given as data when submitted with a name
- `size?: 'small' | 'large'` - The size of the switch. Defaults to `'small'`
- `as?: string | Component` - Change the default rendered element for the one passed as a child, merging their props and behavior


**Events**

- `change(event: Event)` - Event fired when the switch value changes
- `update:modelValue(value: boolean)` - Event fired when the model value updates


**Slots**

- `label`: `{ label?: string }` - Custom content for the label


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isEnabled = ref(false)
</script>

<template>
  <N8nSwitch2 v-model="isEnabled" label="Enable notifications" />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const sendBody = ref(false)
const timeout = ref(true)
</script>

<template>
  <!-- Small size for parameters panel -->
  <N8nSwitch2 v-model="sendBody" label="Send Body" size="small" />
  
  <!-- Large size for settings -->
  <N8nSwitch2 v-model="timeout" label="Timeout Workflow" size="large" />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isAccepted = ref(false)
</script>

<template>
  <N8nSwitch2 v-model="isAccepted">
    <template #label>
      I accept the <a href="/terms">terms and conditions</a>
    </template>
  </N8nSwitch2>
</template>
```

## Design Notes

- **Layout:** Horizontal layout with the switch on the left and label on the right
- **Sizes:** 
  - `small` (32x16px track, 12px thumb) - for node parameters panel
  - `large` (40x20px track, 16px thumb) - for settings pages
- **Colors:**
  - Off state: `--switch--color--background` (neutral gray)
  - On state: `--switch--color--background--active` (green/mint)
  - Thumb: `--switch--toggle--color` (white)
- **Label truncation:** Labels support text-overflow ellipsis for long text
- **Accessibility:** Full keyboard support (Space/Enter to toggle), proper ARIA attributes
