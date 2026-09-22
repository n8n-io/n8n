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

type SegmentControlProps<Value extends string | boolean = string | boolean> = {
  modelValue?: Value;
  defaultValue?: Value;
  options?: Array<SegmentOption<Value>>;
  size?: SegmentControlSize;
  disabled?: boolean;
  squareButtons?: boolean;
  name?: string;
  required?: boolean;
  loop?: boolean;
  dir?: 'ltr' | 'rtl';
};
```

`N8nSegmentControl` is generic over `Value extends string | boolean`. Vue infers `Value` from `modelValue` / `options`, so `update:modelValue` emits that narrowed type (e.g. `boolean` for Ask/Build, or a string union for view modes).


**Notes**

- Option values may be `string` or `boolean`. Boolean `false` and string `"false"` are distinct (values are keyed as `` `${typeof value}:${String(value)}` `` internally).
- Each option gets `data-test-id="radio-button-${value}"` (e.g. `radio-button-false` for boolean false).
- A controlled `modelValue` that is not in `options` renders with no selection.
- All arrow keys stop bubbling so parent canvas/editor shortcuts do not also fire while focus is in the control (canvas binds Up/Down as well as Left/Right). Only Left/Right change selection in this horizontal control.
- Reka selects on arrows via a `window` keydown listener. That is blocked when keydown does not reach `window` (this control’s own `stopPropagation`, or an ancestor `@keydown.stop`). Roving focus still moves; the control completes selection by clicking the focused radio after `nextTick`.
- `class` is applied to the outer wrapper; other fallthrough attrs are forwarded to the Reka `RadioGroupRoot`.


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
import {
  N8nIcon,
  N8nSegmentControl,
  type IconName,
  type SegmentOption,
} from '@n8n/design-system'

const view = ref('table')
const options: Array<SegmentOption<string> & { icon: IconName }> = [
  { label: 'Table', value: 'table', icon: 'table' },
  { label: 'JSON', value: 'json', icon: 'json' },
]
</script>

<template>
  <N8nSegmentControl v-model="view" :options="options" square-buttons>
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
