# Component specification

Freeform tag entry field. Users type values and create tags via delimiter (default comma), Enter, or optional paste/blur/tab. Removable chips use design-system tag tokens. Providing a custom `#input` slot embeds the field without chrome (Combobox multi-select uses this).

- **Component Name:** N8nTagsInput2
- **Reka UI Component:** [Tags Input](https://reka-ui.com/docs/components/tags-input)
- **Combobox composition:** [Combobox with TagsInput](https://reka-ui.com/examples/combobox-tags-input)

## Public API

**Props**

- `modelValue?: TagsInputValue[]` — Controlled tags. Bind with `v-model`
- `defaultValue?: TagsInputValue[]` — Initial tags when uncontrolled
- `placeholder?: string` — Shown when empty | `default: 'Add a tag...'`
- `disabled?: boolean`
- `id?: string` — Applied to the input
- `autoFocus?: boolean`
- `delimiter?: string | RegExp` — Creates a tag from typed input | `default: ','`. Pass `''` to disable (Combobox multi)
- `displayValue?: (value: TagsInputValue) => string` — Label for object tags
- `size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge'` — Sets `--input--height`. Tag height is `height − 2× inset`, and inset/gap use the same `--tags-input--padding` | `default: 'large'`
- `addOnPaste?: boolean` / `addOnBlur?: boolean` / `addOnTab?: boolean`
- `max?: number` — Max tags (Reka: `0` = unlimited)
- Also forwards Reka `TagsInputRoot` props: `duplicate`, `convertValue`, `name`, `required`

Cap height with `--tags-input--max-height` on a parent (or the field). The chrome stays fixed; tags scroll inside.

**Events**

- `update:modelValue(value: TagsInputValue[])`

**Slots**

- `input`: `{ id?, placeholder, autoFocus?, disabled?, class }` — Replace the default input (used by Combobox with `ComboboxInput as-child`). When provided, field chrome is omitted so the host can supply it.
- `tag`: `{ value, displayValue, index, disabled, ui }` — Replace tag content inside the item chrome. Keep using `TagsInputItemText` / `TagsInputItemDelete` (re-exported from `@n8n/design-system`) for label + remove a11y. `ui.text` / `ui.delete` are the default class names.

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  N8nTagsInput2,
  TagsInputItemDelete,
  TagsInputItemText,
  N8nIcon,
} from '@n8n/design-system';

const tags = ref(['workflow', 'production']);
</script>

<template>
  <N8nTagsInput2 v-model="tags" placeholder="Add tags..." />
</template>
```

Custom tag content (keep `TagsInputItemText` / `TagsInputItemDelete` for a11y):

```vue
<template>
  <N8nTagsInput2 v-model="tags" :display-value="(t) => t.label">
    <template #tag="{ value, disabled, ui }">
      <span :style="{ backgroundColor: value.color }" />
      <TagsInputItemText :class="ui.text" />
      <TagsInputItemDelete :class="ui.delete" :disabled="disabled">
        <N8nIcon icon="x" size="small" />
      </TagsInputItemDelete>
    </template>
  </N8nTagsInput2>
</template>
```
