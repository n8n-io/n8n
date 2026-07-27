# Component specification

Keyboard-navigable list of selectable options. Supports single or multiple selection, composable item slots (full custom item, leading/label/description, trailing actions), and surface variants.

- **Component Name:** N8nListbox, N8nListboxItem, N8nListboxItemDefault
- **Figma Component:** TBD
- **Reka UI Component:** [Listbox](https://reka-ui.com/docs/components/listbox)


## Public API Definition

**Listbox props**

- `modelValue?: AcceptableValue | AcceptableValue[]` - The controlled selected value. Can be bind as `v-model`
- `defaultValue?: AcceptableValue | AcceptableValue[]` - The selected value when initially rendered. Use when you do not need to control the state
- `orientation?: 'vertical' | 'horizontal'` - Arrow-key navigation direction. Default: `'vertical'`
- `highlightOnHover?: boolean` - Highlight the option under the pointer. Default: `true`
- `multiple?: boolean` - Allow selecting more than one option
- `selectionBehavior?: 'toggle' | 'replace'` - How selection updates. Defaults to `'replace'` for single-select (keeps selection) and `'toggle'` for multi-select (click adds/removes)
- `disabled?: boolean` - When `true`, prevents interaction with the listbox
- `size?: 'small' | 'default' | 'medium'` - Row density. Default: `'default'`
- `variant?: 'boxed' | 'flush'` - `boxed` is a bordered container with full-row hover. `flush` has no outer border; labels stay content-aligned and hover/selection uses a rounded surface behind each item (bleeds into parent padding). Default: `'boxed'`
- `maxHeight?: string` - Max height of the scrollable content. Default: `'360px'`
- `name?: string` - Name for form submission
- `required?: boolean` - Whether a value is required for form submission
- `by?: string | ((a, b) => boolean)` - Compare object values by field or custom function


**Listbox events**

- `update:modelValue(value)` - Fired when the selected value updates
- `highlight(payload)` - Fired when the highlighted option changes
- `entryFocus(event)` - Fired when the listbox container receives focus
- `leave(event)` - Fired when the pointer leaves the listbox


**Listbox slots**

- `default`: `{ isFrozen, ui }` - Listbox items to render inside the list
- `content`: `{ isFrozen, ui }` - Optional wrapper around the default slot inside the scrollable content


**ListboxItem props**

- `value: AcceptableValue` - Value associated with this option
- `label?: string` - Primary text when the default slot is empty
- `description?: string` - Secondary text under the label when the default slot is empty
- `disabled?: boolean` - When `true`, prevents selecting this option
- `menuOpen?: boolean` - Controlled open state for a trailing menu (`v-model:menu-open`). Freezes list hover while open


**ListboxItem events**

- `select(event)` - Fired when the option is selected (can be prevented)
- `update:menuOpen(open)` - Fired when trailing menu open state changes


**ListboxItem slots**

- `default`: `{ label, description, disabled, ui }` - Replaces the entire option body (default renders `N8nListboxItemDefault`)
- `leading`: `{ label, description, disabled, ui }` - Content before the label (icon, avatar, etc.)
- `label`: `{ label, disabled, ui }` - Custom label content
- `description`: `{ description, disabled, ui }` - Custom description content
- `trailing`: `{ menuOpen, setMenuOpen, ui }` - Row actions rendered **outside** the option (dropdown menus). Visible on hover/highlight/open menu only — not merely because the row is selected


**ListboxItemDefault slots**

- `leading`, `label`, `description` — same as above; use when composing the default layout yourself


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'

const selected = ref('production')
</script>

<template>
  <N8nListbox v-model="selected" aria-label="Tags">
    <N8nListboxItem value="production" label="production" description="12 workflows" />
    <N8nListboxItem value="staging" label="staging" description="4 workflows" />
    <N8nListboxItem value="legacy" label="legacy" description="Not being used" />
  </N8nListbox>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const selected = ref('alex')
</script>

<template>
  <N8nListbox v-model="selected" aria-label="People">
    <N8nListboxItem value="alex">
      <template #default>
        <div class="custom-row">
          <span class="avatar">A</span>
          <span class="meta">
            <strong>Alex</strong>
            <span>alex@example.com</span>
          </span>
        </div>
      </template>
      <template #trailing="{ setMenuOpen }">
        <!-- overflow menu -->
      </template>
    </N8nListboxItem>
  </N8nListbox>
</template>
```


## Accessibility notes

- Root renders as a listbox; options use `role="option"` with `aria-selected`
- Arrow keys move highlight; Space/Enter select (Reka Listbox behavior)
- Put interactive controls (menus, buttons) in the `trailing` slot so they stay outside the option and do not fight listbox highlight. Trailing overlays the option (pointer-events only when visible) so the full padded row remains selectable

## Virtualization

For long lists, compose Reka's `ListboxVirtualizer` inside `N8nListbox`. Pass the same option values you bind on each item (use `by` when values are objects) so keyboard focus can scroll to the selected row.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ListboxVirtualizer } from 'reka-ui'
import { N8nListbox, N8nListboxItem } from '@n8n/design-system'

const items = Array.from({ length: 1000 }, (_, i) => ({
  id: `tag-${i + 1}`,
  label: `tag-${i + 1}`,
  description: `${(i % 20) + 1} workflows`,
}))
const selected = ref(items[0])
</script>

<template>
  <N8nListbox v-model="selected" by="id" max-height="360px">
    <ListboxVirtualizer
      v-slot="{ option }"
      :options="items"
      :estimate-size="56"
      :text-content="(item) => item.label"
    >
      <N8nListboxItem
        :value="option"
        :label="option.label"
        :description="option.description"
      />
    </ListboxVirtualizer>
  </N8nListbox>
</template>
```
