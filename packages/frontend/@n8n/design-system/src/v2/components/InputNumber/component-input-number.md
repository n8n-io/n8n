# Component specification

A number input component allowing users to enter and adjust numeric values. Supports value constraints, decimal precision, and increment/decrement controls.

Visual affordances (sizes, inset border, hover/focus, disabled) match `N8nInput` via shared `input` / `focus` mixins. Kept as a separate component rather than merged into `N8nInput` — number semantics (`min`/`max`/`step`/`precision`/controls) would broaden Input’s API and risk regressions.

- **Component Name:** N8nInputNumber2 (experimental; legacy Element Plus wrapper remains `N8nInputNumber`)
- **Element+ Component:** [ElInputNumber](https://element-plus.org/en-US/component/input-number.html)
- **Reka UI Component:** [NumberField](https://reka-ui.com/docs/components/number-field)
- **Nuxt UI Component:** [InputNumber](https://ui.nuxt.com/docs/components/input-number)

## Public API Definition

**Props**

Extends Reka UI `NumberFieldRootProps` (except `formatOptions`, derived from `precision`).

- `modelValue?: number | null` - Controlled value. Use with `v-model`.
- `defaultValue?: number` - Uncontrolled initial value when `modelValue` is omitted.
- `size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge'` - Size variant. Default: `'medium'`
- `min?: number` - Minimum allowed value.
- `max?: number` - Maximum allowed value.
- `step?: number` - Increment/decrement step amount. Default: `1`
- `stepSnapping?: boolean` - When `true`, typed values snap to `step` on blur. Default: `false` (Reka defaults to `true`; we override so decimals are preserved unless opted in).
- `precision?: number` - Decimal places. Maps to Reka `formatOptions` fraction digits.
- `controls?: boolean` - Show increment/decrement buttons. Default: `false`
- `controlsPosition?: 'both' | 'right'` - Control layout. Default: `'right'`
- `disabled?: boolean` - Disables the field. Default: `false`
- `placeholder?: string` - Placeholder when empty (pass an i18n string from the consumer).
- Also forwards Reka form/field props: `id`, `name`, `required`, `readonly`, `locale`, `disableWheelChange`, `invertWheelChange`.

**Events**

- `update:modelValue` - Emitted when value changes. Payload: `number`
- `focus` - Emitted when the input gains focus. Payload: `FocusEvent`. Also selects the full input value.
- `blur` - Emitted when the input loses focus. Payload: `FocusEvent`

**Slots**

- `input` - Custom input element. Scope: `{ class, placeholder?, disabled? }`. Must render a single root that can accept native input attributes (typically `<input>`). Wrapped with Reka `NumberFieldInput` via `as-child` so value sync and focus/blur stay connected to `NumberFieldRoot`.
- `increment` - Custom increment control content (inside the control button). Scope: `{ ui: { class } }`.
- `decrement` - Custom decrement control content (inside the control button). Scope: `{ ui: { class } }`.

### Template usage example

**Controlled:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInputNumber2 } from '@n8n/design-system'

const value = ref(0)
</script>

<template>
  <N8nInputNumber2 v-model="value" :min="0" :max="100" />
</template>
```

**Uncontrolled:**

```vue
<N8nInputNumber2 :default-value="3" :min="0" :max="10" :controls="true" />
```

**With step and precision:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInputNumber2 } from '@n8n/design-system'

const price = ref(0)
</script>

<template>
  <N8nInputNumber2
    v-model="price"
    :step="0.01"
    :precision="2"
    :min="0"
    placeholder="0.00"
  />
</template>
```

**With controls and custom buttons:**

```vue
<N8nInputNumber2 v-model="quantity" :min="1" :max="99" :controls="true">
  <template #decrement>
    <N8nIcon icon="minus" size="small" />
  </template>
  <template #increment>
    <N8nIcon icon="plus" size="small" />
  </template>
</N8nInputNumber2>
```

**Custom input (single element; Reka bindings are merged via `as-child`):**

```vue
<N8nInputNumber2 v-model="value">
  <template #input="{ class: inputClass, placeholder, disabled }">
    <input
      data-test-id="custom-number-input"
      :class="inputClass"
      :placeholder="placeholder"
      :disabled="disabled"
    />
  </template>
</N8nInputNumber2>
```
