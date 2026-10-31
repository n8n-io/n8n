# Component specification

A single-select list. Arrow keys move a highlight over the whole item. Enter or Space selects the highlighted item. The item slot holds the row content, so the highlight and the focus ring cover that content.

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
- `dir?: 'ltr' | 'rtl'` Reading direction. Omit it to inherit the page direction.
- `highlightOnHover?: boolean` Pointer movement moves the highlight. The highlight fill follows `data-highlighted`. | `default: true`

**Item props**

- `value: string` Value this item selects. Unique among the items in the list.
- `disabled?: boolean` The user cannot highlight or select this item. Arrow keys skip it. A click does not change the value. | `default: false`

**Controlled and uncontrolled**

Pass `modelValue` when the parent owns the value. The list emits `update:modelValue` and waits. The highlight and the selected item follow the parent value.

Omit `modelValue` and pass `defaultValue` when the list owns the value. `defaultValue` applies on the first render only. Later activations stay inside the list.

**Highlight and focus**

One item in the list has the highlight. Arrow keys move it. Home and End move it to the ends. `orientation="vertical"` uses Up and Down. `orientation="horizontal"` uses Left and Right. Items sit in a row in a horizontal list.

The highlight paints the whole item. The item has no padding. The slot content sets its own padding. The focus ring follows the same box. The highlight fill follows `data-highlighted`.

The selected item uses a stronger background than the highlight. The highlight can move to another item. The selected background stays.

Pointer movement moves the highlight when `highlightOnHover` is `true`. Set it to `false` when pointer movement should leave the highlight in place.

**Selection**

Enter or Space selects the highlighted item and emits `update:modelValue`. A click selects that item.

`selectionBehavior="replace"` keeps the value when the user activates the selected item again. `selectionBehavior="toggle"` clears the value.

Call `preventDefault` in the item `select` handler when that row should run another action and keep the current value.

**Disabled items**

A disabled item stays in the list. The label uses the disabled text color. Arrow keys skip the item. A click on it does not change the value.

**Accessibility**

The list is a `listbox`. Set `label` so it has an accessible name. Each item is an `option`. The selected item sets `aria-selected="true"`.

**Events**

- `update:modelValue(value: string | undefined)` The selected value changed. `toggle` emits `undefined` when the user clears the value.

**Item events**

- `select(event)` The user activates the item. Call `preventDefault` on the event to keep the current value.

**Slots**

- `default` Items to show in the list.

**Item slots**

- `default` Row content. The item has no padding. The highlight and the focus ring cover this content.

**Item tokens**

Set a token on the list or on an item. The item uses the token. When the token is unset, it uses the default.

- `--listbox-item--color--background--highlight` Background of the highlighted item. | default: `--color--background--light-1`
- `--listbox-item--color--background--selected` Background of the selected item. This fill stays when the highlight moves. | default: `--background--active`
- `--listbox-item--color--text--disabled` Text color of a disabled item. | default: `--text-color--disabled`
- `--listbox-item--radius` Corner radius of the item. | default: `--radius`

The focus ring uses `--focus--outline-color` and `--focus--border-width`. Set those on the list to change the ring for that list.

**Types**

```typescript
type ListboxValue = string

type ListboxOrientation = 'vertical' | 'horizontal'

/** How a second activation treats the current value. */
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
  dir?: 'ltr' | 'rtl';
  /**
   * @default true
   */
  highlightOnHover?: boolean;
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

**Controlled.** Bind `v-model`. This list also sets `highlightOnHover`, `selectionBehavior`, and a disabled item.

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
    highlight-on-hover
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
