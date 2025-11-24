# Component specification

A flexible dropdown menu component that provides contextual actions and options. It combines the functionality of `ActionDropdown` and `ActionToggle`, offering a unified interface for dropdown menus across n8n.

It's built on Reka UI's `DropdownMenu` for accessibility and interaction patterns.

- **Component Name:** N8nDropdownMenu
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=3032-32988&t=JYq4tGqgF2VFYTr7-03)
- **Reka UI Component:** [DropdownMenu](https://reka-ui.com/docs/components/dropdown-menu)

## Public API Definition

**Props**

- `id?: string` Unique identifier for the dropdown
- `items: Array<DropdownMenuItem<T>>` Array of menu items to display
- `modelValue?: boolean` The controlled open state of the dropdown. Can be bind as `v-model`
- `defaultOpen?: boolean` The open state of the dropdown when initially rendered
- `placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'` Dropdown placement relative to trigger | `default: 'bottom'`
- `trigger?: 'click' | 'hover'` How the dropdown is triggered | `default: 'click'`
- `disabled?: boolean` When `true`, prevents the user from interacting with dropdown
- `teleported?: boolean` Whether to teleport the dropdown to body | `default: true`
- `maxHeight?: string | number` Maximum height of the dropdown menu
- `hideArrow?: boolean` Whether to hide the dropdown arrow/caret | `default: false`
- `loading?: boolean` Whether to show loading state
- `loadingItemCount?: number` Number of skeleton items to show when loading | `default: 3`
- `extraPopperClass?: string` Additional CSS class for the dropdown popper
- `closeOnParentScroll?: boolean` Whether to close dropdown when parent scrolls | `default: true`

**Trigger Props**

- `activatorIcon?: IconName` Icon for the default trigger button | `default: 'ellipsis'`
- `activatorSize?: 'mini' | 'small' | 'medium' | 'large'` Size of the default trigger button | `default: 'medium'`
- `activatorVariant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'` Variant of the default trigger | `default: 'tertiary'`
- `iconOrientation?: 'horizontal' | 'vertical'` Orientation of the ellipsis icon | `default: 'vertical'`

**UI Props**

- `theme?: 'default' | 'dark'` Theme variant for styling | `default: 'default'`
- `iconSize?: 'xsmall' | 'small' | 'medium' | 'large'` Size of icons in menu items | `default: 'medium'`
- `shadow?: boolean` Whether to show shadow on dropdown | `default: true`

**Events**

- `update:modelValue(open: boolean)` Emitted when dropdown open state changes
- `select(value: T)` Emitted when a menu item is selected
- `badge-click(value: T)` Emitted when a badge within a disabled item is clicked
- `item-mouseup(item: DropdownMenuItem<T>)` Emitted on mouseup on menu items

**Slots**

- `trigger` Custom trigger element (replaces default button)
- `content` Complete custom dropdown content (replaces item list)
- `item` Custom item rendering `{ item: DropdownMenuItem<T> }`
- `loading` Custom loading state

**Types**

```typescript
type DropdownMenuItem<T = string> = {
  id: T;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  divided?: boolean; // Shows separator above item
  checked?: boolean; // Shows checkmark
  badge?: string | number;
  badgeProps?: BadgeProps;
  shortcut?: KeyboardShortcutProps;
  customClass?: string;
  type?: 'default' | 'external-link';
}

type BadgeProps = {
  theme?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  bold?: boolean;
}

type KeyboardShortcutProps = {
  keys: string[];
  modifier?: 'ctrl' | 'cmd' | 'alt' | 'shift';
}
```

### Template usage examples

**Basic usage with items**

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

**With badges and shortcuts**

```vue
<script setup lang="ts">
const items = ref([
  {
    id: 'save',
    label: 'Save',
    icon: 'save',
    shortcut: { keys: ['S'], modifier: 'cmd' }
  },
  {
    id: 'share',
    label: 'Share',
    icon: 'share',
    badge: 'New',
    badgeProps: { theme: 'success', bold: true }
  },
  {
    id: 'pro',
    label: 'Pro Feature',
    icon: 'star',
    disabled: true,
    badge: 'PRO',
    badgeProps: { theme: 'primary' }
  }
])

const handleBadgeClick = (itemId: string) => {
  // Handle clicks on badges in disabled items
  if (itemId === 'pro') {
    // Show upgrade modal
  }
}
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    activator-icon="ellipsis"
    @select="handleSelect"
    @badge-click="handleBadgeClick"
  />
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

**Hover trigger with custom styling**

```vue
<script setup lang="ts">
const items = ref([
  { id: 'option1', label: 'Option 1', checked: true },
  { id: 'option2', label: 'Option 2' },
  { id: 'option3', label: 'Option 3' }
])
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    trigger="hover"
    theme="dark"
    icon-size="small"
    :hide-arrow="true"
  />
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
  :activator-size="size"
  @select="onSelect"
  @badge-click="onBadgeClick"
/>

<!-- After -->
<N8nDropdownMenu
  :items="items"
  placement="bottom-start"
  :activator-icon="icon"
  :activator-size="size"
  @select="onSelect"
  @badge-click="onBadgeClick"
/>
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
