# Component specification

A flexible dropdown menu component that provides contextual actions and options. It combines the functionality of `ActionDropdown` and `ActionToggle`, offering a unified interface for dropdown menus across n8n.

It's built on Reka UI's `DropdownMenu` for accessibility and interaction patterns.

- **Component Name:** N8nDropdownMenu
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=3032-32988&t=JYq4tGqgF2VFYTr7-03)
- **Reka UI Component:** [DropdownMenu](https://reka-ui.com/docs/components/dropdown-menu)

## Public API Definition

### Props

- `id?: string` Unique identifier for the dropdown
- `items: Array<DropdownMenuItem<T>>` Array of menu items to display
- `modelValue?: boolean` The controlled open state of the dropdown. Can be bind as `v-model`
- `defaultOpen?: boolean` The open state of the dropdown when initially rendered
- `placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'` Dropdown placement relative to trigger | `default: 'bottom'`
- `trigger?: 'click' | 'hover'` How the dropdown is triggered | `default: 'click'`
- `activatorIcon?: IconName` Icon for the default trigger button | `default: 'ellipsis'`
- `disabled?: boolean` When `true`, prevents the user from interacting with dropdown
- `teleported?: boolean` Whether to teleport the dropdown to body | `default: true`
- `maxHeight?: string | number` Maximum height of the dropdown menu
- `hideArrow?: boolean` Whether to hide the dropdown arrow/caret | `default: false`
- `loading?: boolean` Whether to show loading state
- `loadingItemCount?: number` Number of skeleton items to show when loading | `default: 3`
- `extraPopperClass?: string` Additional CSS class for the dropdown popper
- `closeOnParentScroll?: boolean` Whether to close dropdown when parent scrolls | `default: true`


**Search-specific Props**
- `searchable?: boolean` Enable search functionality
- `searchPlaceholder?: string` Search input placeholder
- `minSearchLength?: number` Minimum characters before filtering | `default: 0`
- `searchDebounce?: number` Debounce delay in ms | `default: 300`
- `filterFn?: (item: DropdownMenuItem<T>, searchTerm: string) => boolean` Custom filter function
- `noResultsText?: string` Text shown when no items match | `default: 'No results found'`


**Events**

- `update:modelValue(open: boolean)` Emitted when dropdown open state changes
- `select(value: T)` Emitted when a menu item is selected

**Exposed Methods**

- `open()` Programmatically opens the dropdown
- `close()` Programmatically closes the dropdown

**Slots**

- `trigger` Custom trigger element (replaces default button)
- `content` Complete custom dropdown content (replaces item list)
- `item` Custom item rendering (replaces default N8nDropdownMenuItem) `{ item: DropdownMenuItemProps<T> }`
- `item-leading` Pass-through to N8nDropdownMenuItem `{ item: DropdownMenuItemProps<T>, ui: { class: string } }`
- `item-label` Pass-through to N8nDropdownMenuItem `{ item: DropdownMenuItemProps<T> }`
- `item-trailing` Pass-through to N8nDropdownMenuItem `{ item: DropdownMenuItemProps<T>, ui: { class: string } }`
- `loading` Custom loading state

**Types**

```typescript
type DropdownMenuItemProps<T = string> = {
  id: T;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  divided?: boolean; // Shows separator above item
  checked?: boolean; // Shows checkmark
  class?: string | Record<string, boolean> | Array<string>;
}
```

### N8nDropdownMenuItem

A companion component for rendering individual dropdown items with full slot-based customization.

**Props**

- `id: T` Unique identifier for the item
- `label?: string` Display text for the item
- `icon?: IconName` Icon displayed before the label
- `disabled?: boolean` Whether the item is disabled
- `divided?: boolean` Whether to show a separator above the item (from `ActionDropdownItem`)
- `checked?: boolean` Whether to show a checkmark indicator (from `ActionDropdownItem`)
- `class?: string` Additional CSS classes

**Slots**

- `item-leading` Content before the label (default: icon if provided) `{ item: DropdownMenuItemProps, ui: { class: string } }`
- `item-label` Custom label content (default: label text) `{ item: DropdownMenuItemProps }`
- `item-trailing` Content after the label (badges, shortcuts, etc.) `{ item: DropdownMenuItemProps, ui: { class: string } }`

### Examples

**Basic example with items**

```vue
<script setup lang="ts">
const dropdownItems = ref([
  { id: 'edit', label: 'Edit', icon: 'pen' },
  { id: 'duplicate', label: 'Duplicate', icon: 'copy' },
  { id: 'delete', label: 'Delete', icon: 'trash', divided: true }
])

const handleSelect = (action: string) => {
  console.log('Selected:', action)
}
</script>

<template>
  <N8nDropdownMenu
    :items="dropdownItems"
    @select="handleSelect"
  />
</template>
```

**With custom trigger**

```vue
<script setup lang="ts">
const isOpen = ref(false)
const items = ref([
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
  { id: 'logout', label: 'Sign out', icon: 'sign-out', divided: true }
])
</script>

<template>
  <N8nDropdownMenu
    v-model="isOpen"
    :items="items"
    placement="bottom-end"
  >
    <template #trigger>
      <N8nButton variant="secondary" icon="user">
        Account
      </N8nButton>
    </template>
  </N8nDropdownMenu>
</template>
```

**With badges and shortcuts using slots**

```vue
<script setup lang="ts">
const items = ref([
  { id: 'save', label: 'Save', icon: 'save' },
  { id: 'share', label: 'Share', icon: 'share' },
  { id: 'pro', label: 'Pro Feature', icon: 'star', disabled: true }
])

const handleUpgrade = () => {
  // Show upgrade modal
}
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    activator-icon="ellipsis"
    @select="handleSelect"
  >
    <template #item-trailing="{ item, ui }">
      <N8nKeyboardShortcut
        v-if="item.id === 'save'"
        :keys="['S']"
        modifier="cmd"
        :class="ui.class"
      />
      <N8nBadge
        v-if="item.id === 'share'"
        theme="success"
        bold
        :class="ui.class"
      >
        New
      </N8nBadge>
      <N8nBadge
        v-if="item.id === 'pro'"
        theme="primary"
        :class="ui.class"
        @click.stop="handleUpgrade"
      >
        PRO
      </N8nBadge>
    </template>
  </N8nDropdownMenu>
</template>
```

**Loading state**

```vue
<script setup lang="ts">
const loading = ref(true)
const items = ref([])

onMounted(async () => {
  // Fetch items
  items.value = await fetchMenuItems()
  loading.value = false
})
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    :loading="loading"
    :loading-item-count="5"
  />
</template>
```

**Using N8nDropdownMenuItem for full control**

```vue
<script setup lang="ts">
const items = ref([
  { id: 'option-1', label: 'Option 1' },
  { id: 'option-2', label: 'Option 2' }
])
</script>

<template>
  <N8nDropdownMenu :items="items" @select="handleSelect">
    <template #item="{ item }">
      <N8nDropdownMenuItem v-bind="item">
        <template #item-leading="{ ui }">
          <MyCustomIcon :class="ui.class" />
        </template>
        <template #item-label>
          <span class="custom-label">{{ item.label }}</span>
        </template>
        <template #item-trailing="{ ui }">
          <N8nBadge :class="ui.class">Custom</N8nBadge>
        </template>
      </N8nDropdownMenuItem>
    </template>
  </N8nDropdownMenu>
</template>
```

## Migration Guide

### From ActionDropdown

```vue
<!-- Before -->
<N8nActionDropdown
  :items="items"
  placement="bottom-start"
  :activator-icon="icon"
  @select="onSelect"
  @badge-click="onBadgeClick"
/>

<!-- After -->
<N8nDropdownMenu
  :items="items"
  placement="bottom-start"
  :activator-icon="icon"
  @select="onSelect"
>
  <!-- Badge functionality now handled via slots -->
  <template #item-trailing="{ item, ui }">
    <N8nBadge
      v-if="item.badge"
      :class="ui.class"
      @click.stop="onBadgeClick(item.id)"
    >
      {{ item.badge }}
    </N8nBadge>
  </template>
</N8nDropdownMenu>
```

### From ActionToggle

```vue
<!-- Before -->
<N8nActionToggle
  :actions="actions"
  placement="bottom"
  :loading="loading"
  :loading-row-count="3"
  @action="onAction"
/>

<!-- After -->
<N8nDropdownMenu
  :items="actions"
  placement="bottom"
  :loading="loading"
  :loading-item-count="3"
  @select="onAction"
/>
```

## Implementation Notes

- In order to make `closeOnParentScroll` work, we need to migrate `useParentScroll` composable
- The new `update:modelValue` replaces both `visible-change` and `visibleChange` events
- Search is opt-in via `searchable` prop. If turned on, a search input is injected at the top of the dropdown content
