# Component specification

Allows users to choose one or more options from a predefined list. It supports both single and multiple selection modes via the `multiple` prop.
Reka typeahead matches the prefix of `textValue` (falling back to `label`) while the menu is open. For larger datasets that need typeahead in the trigger itself, use [ComboBox](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2631-7139&m=dev) (to be done).

- **Component Name:** N8nSelect2
- **Related export:** N8nSelect2Item (default menu row; use when replacing the `item` slot)
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElSelect](https://element-plus.org/en-US/component/select)
- **Reka UI Component:** [Select](https://reka-ui.com/docs/components/select)
- **Nuxt UI Component:** [Select](https://ui.nuxt.com/docs/components/select)


## Public API Definition

**Item shape**

Selectable items must be objects with required `value` and `label`. Empty string `value` or `label` is skipped (dev warning); `0` is a valid value. Use `type: 'group'` for sections. On groups, `label` is optional. Each group maps to its own Reka `SelectGroup`, so heading DOM `id`s stay unique and `aria-labelledby` points at the correct label. Top-level options (outside any group) are batched into an unlabeled group. Separators are top-level only (not inside a group's `items`).

```typescript
type SelectValue = string | number;

type SelectOptionBase<TValue extends SelectValue = SelectValue> = {
	type?: 'item';
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	textValue?: string; // typeahead text; defaults to label (use for slot-rendered labels)
	onSelect?: (event: Event) => void; // preventDefault() keeps the value from updating
};

type SelectGroupItem<TValue extends SelectValue = SelectValue> = {
	type: 'group';
	label?: string;
	items: Array<SelectOptionBase<TValue>>;
};

type SelectSeparatorItem = {
	type: 'separator';
};

type SelectStructuralItem<TValue extends SelectValue = SelectValue> =
	| SelectGroupItem<TValue>
	| SelectSeparatorItem;

type SelectItem<TValue extends SelectValue = SelectValue> =
	| SelectOptionBase<TValue>
	| SelectStructuralItem<TValue>;

type SelectModelValue<M extends boolean = false> = M extends true
	? SelectValue[]
	: SelectValue;

type SelectItemUi = { class: string; strokeWidth?: number };
```

Item `icon` is rendered in the menu automatically. In single select, the same leading content (`#item-leading` when provided, otherwise the item `icon`) is shown on the trigger for the selected value — including when `#item-leading` is used without `icon`.

If `modelValue` does not match any item (for example options loaded asynchronously), the trigger falls back to the raw value until a matching `label` is available.

Consumers that need extra fields should extend the base type and map source data themselves:

```typescript
interface CustomOption extends SelectOptionBase<string> {
	description: string;
}
```

Primitives, object values, and `valueKey` / `labelKey` mapping are intentionally not supported.

**Props**

- `id?: string` Applied to the trigger. Non-prop attrs (`class`, `aria-*`, …) are also forwarded there (`inheritAttrs: false`).
- `placeholder?: string` Visual empty-state text in the trigger. Defaults to `t('nds.select.placeholder')` (`Select an option`). Not used as the accessible name — pass `aria-label` / `aria-labelledby`, or associate a `<label>` via `id`.
- `items?: SelectItem[]` Array of options / groups / separators to render
- `defaultValue?: SelectModelValue` The value of the Select when initially rendered. Use when you do not need to control the state of the Select.
- `modelValue?: SelectModelValue` The controlled value of the Select. Bind as `v-model`. Typed as `SelectValue[]` when `multiple` is `true`.
- `multiple?: boolean` Whether multiple options can be selected or not.
- `open?: boolean` The controlled open state of the Select. Bind as `v-model:open`.
- `defaultOpen?: boolean` The open state of the select when it is initially rendered. Use when you do not need to control its open state.
- `disabled?: boolean` When `true`, prevents the user from interacting with Select.
- `required?: boolean` When `true`, indicates that an option must be selected.
- `name?: string` The name of the native select field used in form submission.
- `autocomplete?: string` Native HTML `autocomplete` attribute.
- `dir?: 'ltr' | 'rtl'` Reading direction. When omitted, inherits from `ConfigProvider` or defaults to LTR.
- `icon?: IconName` Fallback leading icon on the trigger when nothing is selected, or the selected item has no leading visual. In single select, a selected item's `#item-leading` (or its `icon`) is shown on the trigger instead.
- `clearable?: boolean` When `true`, shows a clear button when a value is selected. Hidden when `disabled` or the value is empty. Default: `false`. The button's accessible name is `t('nds.select.clear')` (`Clear selection`).
- `position?: 'item-aligned' | 'popper'` Positioning mode for the dropdown. `item-aligned` aligns the selected item with the trigger (default). `popper` opens below the trigger (`side` is always `bottom`) at trigger width. `side` / `align` are not exposed.
- `sideOffset?: number` Distance in pixels from the trigger when `position` is `'popper'`. Default: `4`.
- `contentClass?: string` Additional CSS class(es) applied to the dropdown content container (portaled).


**UI Props**

- `size?`: `'mini' | 'small' | 'medium' | 'large' | 'xlarge'` | `default: 'small'` (matches `N8nInput`)
- `variant?`: `'default' | 'ghost' | 'flush'` | `default: 'default'` (`flush` strips padding for dense layouts like table cells)

**Events**

- `update:modelValue(value: SelectModelValue | undefined)` — single clear emits `undefined`; multiple clear emits `[]`
- `update:open(value: boolean)`
- `clear()`

**Slots**

- `default?`: `{ modelValue?: SelectModelValue; open: boolean }` — trigger display. Default is the selected label(s), comma-separated in multiple mode. Unmatched values render as the raw string/number. In `multiple` mode, per-value leading visuals belong here (not `#item-leading`).
- `item?`: `{ item: SelectOptionBase }` — replace the whole menu row (use `N8nSelect2Item` to keep selection behaviour; `v-bind` the item). `N8nSelect2Item` also accepts `class` and `strokeWidth` (passed through to `#item-leading` / `#item-trailing` `ui`) and the same `item-*` slots.
- `label?`: `{ item: SelectGroupItem }` — section heading for `type: 'group'` entries that have a `label`
- `item-leading?`: `{ item: SelectOptionBase; ui: SelectItemUi }` — bind `ui` onto custom leading content (`{ class, strokeWidth? }`). In single select, the same slot is reused on the trigger for the selected value, even when the item has no `icon`. Not used on the trigger in `multiple` mode.
- `item-label?`: `{ item: SelectOptionBase }` — replace the menu row label (does not change the trigger unless you also use `#default`)
- `item-trailing?`: `{ item: SelectOptionBase; ui: SelectItemUi }` — bind `ui` onto custom trailing content
- `header?: ()` — rendered above the list
- `footer?: ()`
- `empty?: ()` — shown when there are no selectable items. Defaults to `t('nds.select.noResults')` (`No results found`)

**Expose**

- `triggerRef` — Reka `SelectTrigger` instance


### Template usage example

**Basic:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'todo', label: 'Todo' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'done', label: 'Done' },
])
const value = ref('backlog')
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" />
</template>
```

**Custom item slots:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nIcon, N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{
		value: 'system',
		label: 'System Default',
		icon: 'settings',
		disabled: true,
	},
	{
		value: 'light',
		label: 'Light',
		icon: 'wrench',
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: 'filled-square',
	},
])
const value = ref('light')
</script>

<template>
  <N8nSelect2 v-model="value" :items="items">
	<template #item-leading="{ item, ui }">
		<N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
	</template>
	<template #item-label="{ item }">
		Custom label: {{ item.label }}
	</template>
	<template #item-trailing="{ item, ui }">
		<N8nIcon :icon="item.icon" color="secondary" v-bind="ui" />
	</template>
  </N8nSelect2>
</template>
```

**Custom label with extra fields:**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'
import type { SelectOptionBase } from '@n8n/design-system'

interface ModeOption extends SelectOptionBase<'build' | 'plan'> {
	description: string
}

const items: ModeOption[] = [
	{ value: 'build', label: 'Build', description: 'Generate a workflow from a prompt', icon: 'box' },
	{ value: 'plan', label: 'Plan', description: 'Draft steps before building', icon: 'scroll-text' },
]
const value = ref<'build' | 'plan'>('build')
const current = computed(() => items.find((item) => item.value === value.value) ?? items[0])
</script>

<template>
  <N8nSelect2
    v-model="value"
    :items="items"
    :icon="current.icon"
    position="popper"
  >
    <template #default>
      {{ current.label }}
    </template>
    <template #item-label="{ item }">
      <span>{{ item.label }}</span>
      <span>{{ items.find((option) => option.value === item.value)?.description }}</span>
    </template>
  </N8nSelect2>
</template>
```

**Typeahead (`textValue`):**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{ value: 'us', label: 'United States' },
	{ value: 'de', label: 'Germany', textValue: 'Deutschland' },
])
const value = ref<string>()
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" clearable />
</template>
```

**Grouped list with groups and separators:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const items = ref([
	{
		type: 'group',
		label: 'Fruits',
		items: [
			{ label: 'Apple', value: 'apple' },
			{ label: 'Banana', value: 'banana' },
		],
	},
	{ type: 'separator' },
	{
		type: 'group',
		label: 'Vegetables',
		items: [{ label: 'Carrot', value: 'carrot' }],
	},
])
const value = ref<string | undefined>()
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" />
</template>
```

**Trailing options**

Do not put buttons in `#footer` / `#header` for actions that need a reliable click — they sit inside Reka's `role="listbox"` and pointer events are often swallowed. Put a trailing item after `type: 'separator'` instead.

If the trailing option should become the value (e.g. a sentinel like "Block access"), omit `onSelect` / `preventDefault()`:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const roles = [
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
]
const value = ref<string | undefined>()

const items = computed(() => [
  { type: 'group' as const, label: 'Roles', items: roles },
  { type: 'separator' as const },
  { label: 'Block access', value: 'block-access' },
])
</script>

<template>
  <N8nSelect2 v-model="value" :items="items" placeholder="Select a role" />
</template>
```

**Action that must not become the value**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { N8nSelect2 } from '@n8n/design-system'

const options = [
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
]
const value = ref<string | undefined>('member')
const open = ref(false)
const createOpen = ref(false)

const items = computed(() => [
  {
    type: 'group' as const,
    label: 'Roles',
    items: options,
  },
  { type: 'separator' as const },
  {
    label: 'Add custom role',
    value: '__add_custom_role__',
    icon: 'plus' as const,
    onSelect: (event: Event) => {
      event.preventDefault()
      open.value = false
      createOpen.value = true
    },
  },
])
</script>

<template>
  <N8nSelect2
    v-model="value"
    v-model:open="open"
    :items="items"
  />
</template>
```
