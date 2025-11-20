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
- `type?: InputType` - Type of input field. Values: `'text' | 'textarea' | 'number' | 'password' | 'email'`. Default: `'text'`
- `size?: InputSize` - Size of the input. Values: `'xlarge' | 'large' | 'medium' | 'small' | 'mini'`. Default: `'large'`
- `placeholder?: string` - Placeholder text displayed when input is empty. Default: `''`
- `disabled?: boolean` - When `true`, prevents user interaction and dims the input. Default: `false`
- `readonly?: boolean` - When `true`, input value cannot be changed but can be selected and copied. Default: `false`
- `clearable?: boolean` - When `true`, displays a clear button (×) when input has a value. Default: `false`
- `rows?: number` - Number of rows for textarea type. Default: `2`
- `maxlength?: number` - Maximum number of characters allowed. When set, character counter may be displayed.
- `title?: string` - Native HTML title attribute for tooltip on hover. Default: `''`
- `name?: string` - Name attribute for form submission. Default: auto-generated unique ID
- `autocomplete?: InputAutocompletePropType` - HTML autocomplete attribute. Values: `'on' | 'off' | 'new-password' | 'current-password' | 'email' | 'username'` etc. Default: `'off'`

**Events**

- `update:modelValue` - Emitted when input value changes. Payload: `[value: string | number | null]`
- `focus` - Emitted when input receives focus. Payload: `[event: FocusEvent]`
- `blur` - Emitted when input loses focus. Payload: `[event: FocusEvent]`
- `change` - Emitted when input value changes and input is blurred. Payload: `[value: string | number | null]`
- `input` - Emitted on each keystroke. Payload: `[value: string | number | null]`
- `clear` - Emitted when clear button is clicked (when `clearable` is `true`). No payload.
- `keydown` - Emitted on keydown event. Payload: `[event: KeyboardEvent]`
- `keyup` - Emitted on keyup event. Payload: `[event: KeyboardEvent]`
- `keypress` - Emitted on keypress event. Payload: `[event: KeyboardEvent]`

**Slots**

- `prepend` - Content to prepend before the input (outside input box, typically for labels or buttons)
- `append` - Content to append after the input (outside input box, typically for buttons)
- `prefix` - Content inside input box, before the text (typically for icons)
- `suffix` - Content inside input box, after the text (typically for icons or indicators)

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

**Password input with toggle visibility:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput, N8nIcon } from '@n8n/design-system'

const password = ref('')
const showPassword = ref(false)
</script>

<template>
  <N8nInput
    v-model="password"
    :type="showPassword ? 'text' : 'password'"
    placeholder="Enter password..."
  >
    <template #suffix>
      <N8nIcon
        :icon="showPassword ? 'eye' : 'eye-slash'"
        @click="showPassword = !showPassword"
      />
    </template>
  </N8nInput>
</template>
```

**Search input with icon:**
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

**Textarea with character counter:**
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

**Input with append button:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput, N8nButton } from '@n8n/design-system'

const url = ref('')

const handleSubmit = () => {
  console.log('Submitting:', url.value)
}
</script>

<template>
  <N8nInput
    v-model="url"
    placeholder="Enter URL..."
  >
    <template #append>
      <N8nButton
        label="Go"
        @click="handleSubmit"
      />
    </template>
  </N8nInput>
</template>
```

**Disabled input:**
```vue
<script setup lang="ts">
import { N8nInput } from '@n8n/design-system'
</script>

<template>
  <N8nInput
    modelValue="Cannot edit this"
    disabled
  />
</template>
```

**Readonly input:**
```vue
<script setup lang="ts">
import { N8nInput } from '@n8n/design-system'
</script>

<template>
  <N8nInput
    modelValue="You can select and copy this"
    readonly
  />
</template>
```

**Input with prepended label:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const domain = ref('')
</script>

<template>
  <N8nInput
    v-model="domain"
    placeholder="your-domain"
  >
    <template #prepend>
      https://
    </template>
    <template #append>
      .com
    </template>
  </N8nInput>
</template>
```

**Number input:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const amount = ref(0)
</script>

<template>
  <N8nInput
    v-model="amount"
    type="number"
    placeholder="Enter amount..."
  >
    <template #prefix>
      $
    </template>
  </N8nInput>
</template>
```

**Email input with validation styling (requires external validation):**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const email = ref('')
const isValid = ref(true)

const validateEmail = () => {
  isValid.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
}
</script>

<template>
  <N8nInput
    v-model="email"
    type="email"
    placeholder="Enter email..."
    @blur="validateEmail"
    :class="{ 'error': !isValid }"
  />
</template>
```

**Large size input (xlarge):**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInput } from '@n8n/design-system'

const title = ref('')
</script>

<template>
  <N8nInput
    v-model="title"
    size="xlarge"
    placeholder="Enter title..."
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
