# Component specification

A number input component allowing users to enter and adjust numeric values. Supports value constraints, decimal precision, and increment/decrement controls.

- **Component Name:** N8nInputNumber
- **Element+ Component:** [ElInputNumber](https://element-plus.org/en-US/component/input-number.html)
- **Reka UI Component:** [NumberField](https://reka-ui.com/docs/components/number-field)
- **Nuxt UI Component:** [InputNumber](https://ui.nuxt.com/docs/components/input-number)

## Public API Definition

**Props**

- `modelValue?: number | null` - The current numeric value. Use with `v-model` for two-way binding.
- `size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge'` - Size variant. Default: `'medium'`
- `min?: number` - Minimum allowed value. Default: `-Infinity`
- `max?: number` - Maximum allowed value. Default: `Infinity`
- `step?: number` - Increment/decrement step amount. Default: `1`
- `precision?: number` - Number of decimal places. Maps to Reka UI `formatOptions.maximumFractionDigits`.
- `controls?: boolean` - Whether to show increment/decrement buttons. Default: `false`
- `controlsPosition?: 'both' | 'right'` - Position of control buttons. `'both'` places −/+ on left/right sides. `'right'` places stacked up/down arrows on the right. Default: `'right'`
- `disabled?: boolean` - Disables the input. Default: `false`
- `placeholder?: string` - Placeholder text when empty.

**Events**

- `update:modelValue` - Emitted when value changes. Payload: `number | null`
- `focus` - Emitted when input gains focus. Payload: `FocusEvent`
- `blur` - Emitted when input loses focus. Payload: `FocusEvent`

**Slots**

- `increment` - Custom content for increment button (when `controls` is `true`).
- `decrement` - Custom content for decrement button (when `controls` is `true`).

### Template usage example

**Basic number input:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInputNumber } from '@n8n/design-system'

const value = ref(0)
</script>

<template>
  <N8nInputNumber v-model="value" :min="0" :max="100" />
</template>
```

**Basic usage (controls hidden by default):**

```vue
<N8nInputNumber
  v-model="count"
  :min="0"
  placeholder="Enter number"
/>
```

**With step and precision:**

```vue
<N8nInputNumber
  v-model="price"
  :step="0.01"
  :precision="2"
  :min="0"
  placeholder="0.00"
/>
```

**Disabled state:**

```vue
<N8nInputNumber
  v-model="value"
  :disabled="isReadOnly"
  :controls="false"
/>
```

**Size variants:**

```vue
<N8nInputNumber v-model="value" size="mini" />
<N8nInputNumber v-model="value" size="small" />
<N8nInputNumber v-model="value" size="medium" />
<N8nInputNumber v-model="value" size="large" />
```

**With controls and custom buttons:**

```vue
<N8nInputNumber v-model="quantity" :min="1" :max="99" :controls="true">
  <template #decrement>
    <N8nIcon icon="minus" size="small" />
  </template>
  <template #increment>
    <N8nIcon icon="plus" size="small" />
  </template>
</N8nInputNumber>
```
