# Component specification

A versatile text input component for collecting user text, numbers, passwords, and other types of single-line or multi-line data. Supports various input types, validation states, and customizable appearance through slots.

- **Component Name:** N8nInput
- **Figma Component:** [Input](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=239-2170&m=dev)
- **Element+ Component:** [ElInput](https://element-plus.org/en-US/component/input.html)
- **Reka UI Component:** N/A (no direct equivalent - will use native HTML input with Editable component for enhanced features)
- **Nuxt UI Component:** [Input](https://ui.nuxt.com/docs/components/input)

## Public API Definition

**Props**

- `modelValue?: string | number | null` - The bound value of the input (v-model). Default: `''`
- `type?: InputType` - Type of input field. Values: `'text' | 'textarea' | 'password' | 'number' | 'email'`. Default: `'text'`
- `size?: InputSize` - Size of the input. Values: `'xlarge' | 'large' | 'medium' | 'small' | 'mini'`. Default: `'large'`
- `placeholder?: string` - Placeholder text displayed when input is empty. Default: `''`
- `disabled?: boolean` - When `true`, prevents user interaction and dims the input. Default: `false`
- `readonly?: boolean` - When `true`, the input is read-only and cannot be edited. Default: `false`
- `clearable?: boolean` - When `true`, displays a clear button (×) when input has a value. Default: `false`
- `rows?: number` - Number of rows for textarea type. Default: `2`
- `maxlength?: number` - Maximum number of characters allowed.
- `autosize?: boolean | { minRows?: number; maxRows?: number }` - Auto-resize textarea height based on content. When `true`, auto-sizes without limits. Object form specifies min/max row constraints. Only applies when `type="textarea"`. Default: `false`
- `autofocus?: boolean` - When `true`, automatically focuses the input on mount. Default: `false`
- `autocomplete?: InputAutocomplete` - HTML autocomplete attribute. Values: `'off' | 'on' | 'new-password' | 'current-password' | 'given-name' | 'family-name' | 'one-time-code' | 'email'`. Default: `'off'`
- `name?: string` - HTML name attribute for the input element.

**Events**

- `update:modelValue` - Emitted when input value changes. Payload: `[value: string]`
- `input` - Emitted when input value changes (for backwards compatibility). Payload: `[value: string]`
- `focus` - Emitted when input gains focus. Payload: `[event: FocusEvent]`
- `blur` - Emitted when input loses focus. Payload: `[event: FocusEvent]`
- `keydown` - Emitted on keydown event. Payload: `[event: KeyboardEvent]`

**Slots**

- `prefix` - Content inside input box, before the text (typically for search icons)
- `suffix` - Content inside input box, after the text (typically for icons or indicators)
- `prepend` - Content outside input box, before the input (typically for labels or grouped buttons)
- `append` - Content outside input box, after the input (typically for units or grouped buttons)

**Exposed Methods**

- `focus(): void` - Programmatically focus the input element
- `blur(): void` - Programmatically blur the input element
- `select(): void` - Programmatically select all text in the input

### Template usage examples

**Basic text input:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const username = ref('')
</script>

<template>
  <N8nInput
    v-model="username"
    placeholder="Enter username..."
    size="large"
  />
</template>
```

**Search input with icon and clear button:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput, N8nIcon } from '@n8n/design-system'

const searchQuery = ref('')
</script>

<template>
  <N8nInput
    v-model="searchQuery"
    placeholder="Search..."
    clearable
  >
    <template #prefix>
      <N8nIcon icon="search" />
    </template>
  </N8nInput>
</template>
```

**Textarea with fixed rows:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const description = ref('')
</script>

<template>
  <N8nInput
    v-model="description"
    type="textarea"
    placeholder="Enter description..."
    :rows="4"
    :maxlength="500"
  />
</template>
```

**Auto-resizing textarea:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const message = ref('')
</script>

<template>
  <N8nInput
    v-model="message"
    type="textarea"
    placeholder="Type your message..."
    :autosize="{ minRows: 1, maxRows: 6 }"
  />
</template>
```

**Disabled input:**
```vue
<script setup lang="ts">
import { N8nInput } from '@n8n/design-system'
</script>

<template>
  <N8nInput
    model-value="Cannot edit this"
    disabled
  />
</template>
```

**Input with suffix icon:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput, N8nIcon } from '@n8n/design-system'

const name = ref('')
</script>

<template>
  <N8nInput
    v-model="name"
    placeholder="Enter name..."
  >
    <template #suffix>
      <N8nIcon icon="info" size="small" />
    </template>
  </N8nInput>
</template>
```

**Input with keydown handler:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const value = ref('')

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    console.log('Submitted:', value.value)
  }
  if (event.key === 'Escape') {
    value.value = ''
  }
}
</script>

<template>
  <N8nInput
    v-model="value"
    placeholder="Press Enter to submit..."
    @keydown="handleKeyDown"
  />
</template>
```

**Using exposed methods:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput, N8nButton } from '@n8n/design-system'

const inputRef = ref()
const value = ref('')

const focusInput = () => {
  inputRef.value?.focus()
}

const selectAll = () => {
  inputRef.value?.select()
}
</script>

<template>
  <div>
    <N8nInput
      ref="inputRef"
      v-model="value"
      placeholder="Controllable input..."
    />
    <N8nButton label="Focus" @click="focusInput" />
    <N8nButton label="Select All" @click="selectAll" />
  </div>
</template>
```
