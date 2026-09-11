# Component specification

A number input component allowing users to enter and adjust numeric values. Supports value constraints, decimal precision, and increment/decrement controls.

Visual affordances (sizes, inset border, hover/focus, disabled) match `N8nInput` via shared `input` / `focus` mixins. Kept as a separate component rather than merged into `N8nInput` — number semantics (`min`/`max`/`step`/`precision`/controls) would broaden Input’s API and risk regressions.

- **Component Name:** N8nInputNumber
- **Reka UI Component:** [NumberField](https://reka-ui.com/docs/components/number-field)
- **Nuxt UI Component:** [InputNumber](https://ui.nuxt.com/docs/components/input-number)

## Public API Definition

**Props**

Extends Reka UI `NumberFieldRootProps` (except `formatOptions`, derived from `precision`).

- `modelValue?: number | null` - Controlled value. Use with `v-model`.
- `defaultValue?: number` - Uncontrolled initial value when `modelValue` is omitted.
- `size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge'` - Size variant. Default: `'medium'`
- `min?: number` - Minimum allowed value. Values below min clamp on blur.
- `max?: number` - Maximum allowed value. Keystrokes and pastes that would exceed max are ignored; the value also clamps on blur.
- `step?: number` - Increment/decrement step amount. Default: `1`
- `stepSnapping?: boolean` - When `true`, typed values snap to `step` on blur. Default: `false` (Reka defaults to `true`; we override so decimals are preserved unless opted in).
- `precision?: number` - Decimal places. Maps to Reka `formatOptions` fraction digits.
- `controls?: boolean` - Show increment/decrement buttons. Default: `true`
- `controlsPosition?: 'both' | 'right'` - Control layout. Default: `'right'`
- `disabled?: boolean` - Disables the field. Default: `false`
- `placeholder?: string` - Placeholder when empty (pass an i18n string from the consumer).
- Also forwards Reka form/field props: `id`, `name`, `required`, `readonly`, `locale`, `disableWheelChange`, `invertWheelChange`.

**Events**

- `update:modelValue` - Emitted when value changes. Payload: `number`
- `focus` - Emitted when the input gains focus. Payload: `FocusEvent`.
- `blur` - Emitted when the input loses focus. Payload: `FocusEvent`

Clicking the input selects the full value. Increment/decrement controls do not.

**Exposed methods** (template ref)

Same contract as `N8nInput`, so `ParameterInput` can programmatically focus, blur, and select number fields.

- `focus()` - Focus the nested input.
- `blur()` - Blur the nested input.
- `select()` - Select the input value.

**Slots**

- `increment` - Fully custom increment control. Scope: `{ ui: { class } }`. Default: button with plus/chevron icon.
- `decrement` - Fully custom decrement control. Scope: `{ ui: { class } }`. Default: button with minus/chevron icon.

### Template usage example

**Controlled:**

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

**Uncontrolled:**

```vue
<N8nInputNumber :default-value="3" :min="0" :max="10" />
```

**With step and precision:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nInputNumber } from '@n8n/design-system'

const price = ref(0)
</script>

<template>
  <N8nInputNumber
    v-model="price"
    :step="0.01"
    :precision="2"
    :min="0"
    placeholder="0.00"
  />
</template>
```

**Without controls:**

```vue
<N8nInputNumber v-model="value" :controls="false" />
```

**With custom control buttons:**

```vue
<N8nInputNumber v-model="quantity" :min="1" :max="99" controls-position="both">
  <template #decrement="{ ui }">
    <button type="button" :class="ui.class" aria-label="Decrease">
      <N8nIcon icon="minus" size="small" />
    </button>
  </template>
  <template #increment="{ ui }">
    <button type="button" :class="ui.class" aria-label="Increase">
      <N8nIcon icon="plus" size="small" />
    </button>
  </template>
</N8nInputNumber>
```
