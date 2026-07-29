# Component specification

Freeform tag entry field. Users type values and create tags via delimiter (default comma), Enter, or optional paste/blur/tab. Removable chips use design-system tag tokens.

- **Component Name:** N8nTagsInput2
- **Reka UI Component:** [Tags Input](https://reka-ui.com/docs/components/tags-input)
- **Composition example:** [Combobox with TagsInput](https://reka-ui.com/examples/combobox-tags-input)


## Public API Definition

**Props**

- `modelValue?: TagsInputValue[]` - Controlled tags. Bind with `v-model`
- `defaultValue?: TagsInputValue[]` - Initial tags when uncontrolled
- `placeholder?: string` - Shown when empty. Default: `'Add a tag...'`
- `disabled?: boolean` - When `true`, prevents interaction and dims the field. Default: `false`
- `id?: string` - Applied to the text input
- `autoFocus?: boolean` - Focus the input on mount
- `delimiter?: string | RegExp` - Creates a tag from typed input. Default: `','`. Pass `''` to disable delimiter splitting
- `displayValue?: (value: TagsInputValue) => string` - Label for object tags. Falls back to string value or `value.label`
- `convertValue?: (value: string) => TagsInputValue` - Required when tags are objects
- `size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge'` - Sets `--input--height`. Tag height is `height − 2× inset`; inset/gap share `--tags-input--padding`. Default: `'large'`
- `addOnPaste?: boolean` / `addOnBlur?: boolean` / `addOnTab?: boolean` - Extra ways to commit a tag
- `max?: number` - Max tags. Reka treats `0` as unlimited
- `duplicate?: boolean` - When `true`, allow duplicate tags. When `false` (default), adding an existing tag moves it to the end of the list
- `name?: string` / `required?: boolean` - Form field props forwarded to Reka

Cap height with `--tags-input--max-height` on a parent (or the field). The chrome stays fixed; tags scroll inside.

The draft input grows with typed text (`field-sizing: content`) so it wraps to the next row when it no longer fits beside existing tags, instead of clipping in the leftover space.


**Events**

- `update:modelValue(value: TagsInputValue[])` - Fired when the tag list changes
- `addTag(value: TagsInputValue)` - Fired when a tag is added
- `removeTag(value: TagsInputValue)` - Fired when a tag is removed
- `invalid(value: TagsInputValue)` - Fired when an add is rejected (e.g. max). Draft text is cleared. Duplicate adds move the existing tag to the end instead of emitting `invalid`.


**Slots**

- `input`: `{ id?, placeholder, autoFocus?, disabled?, class }` - Replace the default text input. Apply `class` so the field keeps TagsInput input styles. Re-exported `TagsInputInput` can be used when composing a custom input.
- `tag`: `{ value, displayValue, index, disabled, ui }` - Replace tag content inside the item chrome. Keep using `TagsInputItemText` / `TagsInputItemDelete` (re-exported from `@n8n/design-system`) for label + remove a11y. `ui.text` / `ui.delete` are the default class names


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nTagsInput2 } from '@n8n/design-system'

const tags = ref(['workflow', 'production'])
</script>

<template>
  <N8nTagsInput2 v-model="tags" placeholder="Add tags..." />
</template>
```

Custom tag content (keep `TagsInputItemText` / `TagsInputItemDelete` for a11y):

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  N8nTagsInput2,
  TagsInputItemDelete,
  TagsInputItemText,
  N8nIcon,
} from '@n8n/design-system'

const tags = ref([
  { label: 'production', color: 'var(--color--success)' },
  { label: 'billing', color: 'var(--color--warning)' },
  { label: 'critical', color: 'var(--color--danger)' },
])
</script>

<template>
  <N8nTagsInput2
    v-model="tags"
    :display-value="(t) => t.label"
    :convert-value="(input) => ({ label: input, color: 'var(--color--text--tint-1)' })"
  >
    <template #tag="{ value: tag, disabled, ui }">
      <span
        aria-hidden="true"
        :style="{
          width: 'var(--spacing--2xs)',
          height: 'var(--spacing--2xs)',
          marginTop: 'var(--spacing--5xs)',
          marginInlineEnd: 'var(--spacing--4xs)',
          borderRadius: 'var(--radius--full)',
          backgroundColor: tag.color,
          flexShrink: 0,
        }"
      />
      <TagsInputItemText :class="ui.text" />
      <TagsInputItemDelete :class="ui.delete" :disabled="disabled">
        <N8nIcon icon="x" size="small" />
      </TagsInputItemDelete>
    </template>
  </N8nTagsInput2>
</template>
```
