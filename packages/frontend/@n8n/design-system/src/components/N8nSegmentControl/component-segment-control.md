# Component specification

A segmented single-choice control for switching between a small set of mutually exclusive options. All options stay visible; selection is exclusive. Prefer this over a select or radio group when the choice set is small (typically 2–5) and immediate switching is expected (tabs, view modes, Fixed/Expression).

Built on Reka UI `RadioGroup` with horizontal orientation, arrow-key navigation, and workarounds for editor environments that stop keydown propagation.

- **Component Name:** N8nSegmentControl
- **Figma Component:** TBD
- **Reka UI Component:** [Radio Group](https://reka-ui.com/docs/components/radio-group)


## Public API Definition

**Props**

- `modelValue?: string | boolean` - The controlled selected value. Bind with `v-model`
- `defaultValue?: string | boolean` - Initial selected value for uncontrolled usage
- `options?: Array<SegmentOption>` - Options to render. Each option has `label`, `value` (`string | boolean`), optional `disabled`, and optional `data` bag for slot consumers
- `size?: 'mini' | 'small' | 'default' | 'large' | 'xlarge'` - Control size | `default: 'default'`
- `disabled?: boolean` - When `true`, prevents interaction with all options | `default: false`
- `squareButtons?: boolean` - When `true`, options are square (icon-only layouts) | `default: false`
- `name?: string` - Name for form submission
- `required?: boolean` - When `true`, indicates a value must be selected before submit
- `loop?: boolean` - Whether keyboard navigation wraps from last to first | `default: true`
- `dir?: 'ltr' | 'rtl'` - Reading direction


**Events**

- `update:modelValue(value: string | boolean, e: MouseEvent)` - Fired when selection changes. The `MouseEvent` is the originating pointer event when available (so consumers can read `ctrlKey` / `metaKey`, e.g. open-in-new-tab); keyboard selection falls back to a synthetic click event


**Slots**

- `option`: `SegmentOption` - Custom option content. Keep `label` on the option for accessibility (`aria-label`)


**Types**

```typescript
type SegmentControlSize = 'mini' | 'small' | 'default' | 'large' | 'xlarge';

type SegmentOption<Value extends string | boolean = string | boolean> = {
  label: string;
  value: Value;
  disabled?: boolean;
  data?: Record<string, string | number | boolean | undefined>;
};
```


**Notes**

- Option values may be `string` or `boolean`. Boolean `false` and string `"false"` are distinct.
- Each option gets `data-test-id="radio-button-${value}"` (e.g. `radio-button-false` for boolean false).
- Arrow keys stop bubbling so parent canvas/editor shortcuts do not also fire while focus is in the control.
- Reka listens for arrows on `window`; ancestors that call `stopPropagation` on keydown are handled via a capture-phase focus workaround so selection still updates.


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'

const mode = ref('table')
</script>

<template>
  <N8nSegmentControl
    v-model="mode"
    :options="[
      { label: 'Table', value: 'table' },
      { label: 'JSON', value: 'json' },
      { label: 'Schema', value: 'schema' },
    ]"
  />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const isBuildMode = ref(false)
</script>

<template>
  <N8nSegmentControl
    size="small"
    :model-value="isBuildMode"
    :options="[
      { label: 'Ask', value: false },
      { label: 'Build', value: true },
    ]"
    @update:model-value="isBuildMode = $event"
  />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nIcon, N8nSegmentControl } from '@n8n/design-system'

const view = ref('table')
const options = [
  { label: 'Table', value: 'table', icon: 'table' },
  { label: 'JSON', value: 'json', icon: 'json' },
] as const
</script>

<template>
  <N8nSegmentControl v-model="view" :options="[...options]" square-buttons>
    <template #option="option">
      <N8nIcon :icon="option.icon" size="small" />
    </template>
  </N8nSegmentControl>
</template>
```

```vue
<script setup lang="ts">
// Uncontrolled: initial selection only
</script>

<template>
  <N8nSegmentControl
    default-value="world"
    :options="[
      { label: 'Test', value: 'test' },
      { label: 'World', value: 'world' },
    ]"
  />
</template>
```
