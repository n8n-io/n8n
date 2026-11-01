# Component specification

A single-select list. Arrow keys move a highlight over the whole item. Pointer movement moves the highlight. Enter or Space selects the highlighted item. The item slot holds the row content, so the highlight covers that content.

Tab from a control inside an enabled item moves the highlight to the next enabled item when the next stop is in another item. The highlight stays when the next stop is in the same item. Shift+Tab moves the highlight to that item when the previous stop is not inside it. Tab from the last control leaves the list.

- **Component Name:** N8nListbox, N8nListboxItem
- **Reka UI Component:** [Listbox](https://reka-ui.com/docs/components/listbox)

## Public API Definition

**Props**

- `modelValue?: string` The selected value. Bind it with `v-model`. When set, the parent value stays in place until the parent accepts `update:modelValue`.
- `defaultValue?: string` The selected value on first render when `modelValue` is omitted. The list keeps later changes.
- `label?: string` Accessible name for the list.
- `disabled?: boolean` The user cannot move the highlight or change the value. | `default: false`
- `selectionBehavior?: 'replace' | 'toggle'` `replace` keeps one value. A second activation of the selected item does not clear it. `toggle` clears the value when the user activates the selected item. | `default: 'replace'`
- `orientation?: 'vertical' | 'horizontal'` Up and Down, or Left and Right, move the highlight. Items sit in a row when this is `horizontal`. | `default: 'vertical'`

**Item props**

- `value: string` Value this item selects. Unique among the items in the list.
- `disabled?: boolean` The user cannot highlight or select this item. Arrow keys skip it. Tab from another item skips it when an enabled item follows. A click does not change the value. | `default: false`

**Events**

- `update:modelValue(value: string | undefined)` The selected value changed. `toggle` emits `undefined` when the user clears the value.

**Item events**

- `select(event)` The user activates the item. Call `preventDefault` on the event to keep the current value.

**Slots**

- `default` Items to show in the list.

**Item slots**

- `default` Row content. The item has no padding. The highlight covers this content.

**Container tokens**

Set a token on the list. The list uses the token. When the token is unset, it uses the default.

- `--listbox--gap` Space between items. | default: `--spacing--4xs` (4px)

**Item tokens**

Set a token on the list or on an item. The item uses the token. When the token is unset, it uses the default.

Set `--listbox-item--color--background--highlight` and `--listbox-item--color--background--selected` to `transparent` when the slot paints its own highlight and selected fill. The item keeps selection and keyboard behavior.

- `--listbox-item--color--background--highlight` Background of the highlighted item. The same fill as a highlighted dropdown or context-menu row. | default: `--background--hover`
- `--listbox-item--color--background--selected` Background of the selected item. This fill stays when the highlight moves. | default: `--background--active`
- `--listbox-item--color--text--disabled` Text color of a disabled item. | default: `--text-color--disabled`
- `--listbox-item--radius` Corner radius of the item. | default: `--radius`

**Types**

```typescript
type ListboxValue = string

type ListboxOrientation = 'vertical' | 'horizontal'

type ListboxSelectionBehavior = 'replace' | 'toggle'

type ListboxProps = {
  modelValue?: ListboxValue;
  defaultValue?: ListboxValue;
  label?: string;
  /**
   * @default false
   */
  disabled?: boolean;
  /**
   * @default 'replace'
   */
  selectionBehavior?: ListboxSelectionBehavior;
  /**
   * @default 'vertical'
   */
  orientation?: ListboxOrientation;
};

type ListboxItemProps = {
  value: ListboxValue;
  /**
   * @default false
   */
  disabled?: boolean;
};
```

### Template usage example

**Controlled.** Bind `v-model`. This list also sets `selectionBehavior` and a disabled item.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nListbox, N8nListboxItem } from '@n8n/design-system'

const version = ref<string | undefined>('v2')
</script>

<template>
  <N8nListbox
    v-model="version"
    label="Versions"
    selection-behavior="toggle"
  >
    <N8nListboxItem value="v2">v2 · Latest</N8nListboxItem>
    <N8nListboxItem value="v1">v1 · Published</N8nListboxItem>
    <N8nListboxItem value="v0" disabled>v0 · Draft</N8nListboxItem>
  </N8nListbox>
</template>
```

**Uncontrolled.** `defaultValue` sets the first value. `orientation="horizontal"` lays the items in a row.

```vue
<script setup lang="ts">
import { N8nListbox, N8nListboxItem } from '@n8n/design-system'
</script>

<template>
  <N8nListbox default-value="comfortable" orientation="horizontal" label="Density">
    <N8nListboxItem value="compact">Compact</N8nListboxItem>
    <N8nListboxItem value="comfortable">Comfortable</N8nListboxItem>
    <N8nListboxItem value="spacious">Spacious</N8nListboxItem>
  </N8nListbox>
</template>
```
