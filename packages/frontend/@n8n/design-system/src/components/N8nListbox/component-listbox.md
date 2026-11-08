# Component specification

A single-select list. Arrow keys move a highlight over the whole item. Pointer movement moves the highlight. A click selects the item under the pointer. Enter or Space selects the highlighted item. Tab from a control inside an item moves the highlight to the next enabled item. Built on Reka UI `Listbox`.

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

- `default` Row content. Direct children stack in a column. Set `--n8n-listbox-item--content-gap` to change the space between those children. Wrap children in one element when they sit on one line.
- `leading` Content before the row content. Put an icon in this slot.
- `trailing` Content after the row content. A control in this slot sits inside the item. Stop `click`, Enter, and Space on that control when the control must not select the item.

The item sets the padding, the gap, and the minimum height. The highlight covers the item, including that padding.

**Container tokens**

Set a token on the list. The list uses the token. When the token is unset, it uses the default.

- `--n8n-listbox--gap` Space between items. | default: `--spacing--4xs` (4px)

**Item tokens**

Set a token on the list or on an item. The item uses the token. When the token is unset, it uses the default.

Set `--n8n-listbox-item--color--background--highlight` and `--n8n-listbox-item--color--background--selected` to `transparent` when the slot paints its own highlight and selected fill. Set `--n8n-listbox-item--padding` to `0` when that slot also sets its own padding. The item keeps selection and keyboard behavior.

- `--n8n-listbox-item--color--background--highlight` Background of a highlighted item that is not selected. The same fill as a highlighted dropdown or context-menu row. | default: `--background--hover`
- `--n8n-listbox-item--color--background--selected` Background of the selected item. This fill covers the item while it is highlighted. This fill stays when the highlight moves. | default: `--background--active`
- `--n8n-listbox-item--color--text--disabled` Text color of a disabled item. | default: `--text-color--disabled`
- `--n8n-listbox-item--radius` Corner radius of the item. | default: `--radius`
- `--n8n-listbox-item--padding` Padding inside the item. | default: `--spacing--2xs` `--spacing--xs` (8px on the top and the bottom, 12px on the left and the right)
- `--n8n-listbox-item--gap` Space between the leading content, the row content, and the trailing content. | default: `--spacing--2xs` (8px)
- `--n8n-listbox-item--content-gap` Space between direct children of the row content. | default: `--spacing--5xs` (2px)
- `--n8n-listbox-item--min-height` Minimum height of the item. | default: `--spacing--xl` (32px)

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
import { N8nIcon, N8nListbox, N8nListboxItem } from '@n8n/design-system'

const version = ref<string | undefined>('v2')
</script>

<template>
  <N8nListbox
    v-model="version"
    label="Versions"
    selection-behavior="toggle"
  >
    <N8nListboxItem value="v2">
      <template #leading>
        <N8nIcon icon="check" />
      </template>
      v2
      <template #trailing>Latest</template>
    </N8nListboxItem>
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
