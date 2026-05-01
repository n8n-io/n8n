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
- `activatorIcon?: IconOrEmoji` Icon or emoji for the default trigger button | `default: { type: 'icon', value: 'ellipsis' }`
- `disabled?: boolean` When `true`, prevents the user from interacting with dropdown
- `teleported?: boolean` Whether to teleport the dropdown to body | `default: true`
- `maxHeight?: string | number` Maximum height of the dropdown menu
- `loading?: boolean` Whether to show loading state
- `loadingItemCount?: number` Number of skeleton items to show when loading | `default: 3`
- `extraPopperClass?: string` Additional CSS class for the dropdown popper


**Search-specific Props**
- `searchable?: boolean` Enable search functionality
- `searchPlaceholder?: string` Search input placeholder
- `searchDebounce?: number` Debounce delay in ms | `default: 300`


**Events**

- `update:modelValue(open: boolean)` Emitted when dropdown open state changes
- `select(value: T)` Emitted when a menu item is selected
- `search(searchTerm: string, itemId?: T)` Emitted when search input changes (debounced). `itemId` is undefined for root-level search, or the item's ID for sub-menu search
- `submenu:toggle(itemId: T, open: boolean)` Emitted when a sub-menu opens or closes. Useful for lazy loading sub-menu content

**Exposed Methods**

- `open()` Programmatically opens the dropdown
- `close()` Programmatically closes the dropdown

**Slots**

- `trigger` Custom trigger element (replaces default button)
- `content` Complete custom dropdown content (replaces item list)
- `item` Custom item rendering (replaces default N8nDropdownMenuItem) `{ item: DropdownMenuItemProps<T> }`
- `item-leading` Pass-through to N8nDropdownMenuItem `{ item: DropdownMenuItemProps<T>, ui: { class: string } }`
- `item-trailing` Pass-through to N8nDropdownMenuItem `{ item: DropdownMenuItemProps<T>, ui: { class: string } }`
- `loading` Custom loading state
- `empty` Custom empty state when no items

**Types**

```typescript
type IconOrEmoji =
  | { type: 'icon'; value: IconName }
  | { type: 'emoji'; value: string };

type DropdownMenuItemProps<T = string> = {
  id: T;
  label: string;
  icon?: IconOrEmoji;
  disabled?: boolean;
  divided?: boolean; // Shows separator above item
  checked?: boolean; // Shows checkmark
  class?: string | Record<string, boolean> | Array<string>;
  // Sub-menu support
  children?: Array<DropdownMenuItemProps<T>>;
  loading?: boolean;
  loadingItemCount?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
}
```

### N8nDropdownMenuItem

A companion component for rendering individual dropdown items with full slot-based customization.

**Props**

- `id: T` Unique identifier for the item
- `label?: string` Display text for the item
- `icon?: IconOrEmoji` Icon or emoji displayed before the label
- `disabled?: boolean` Whether the item is disabled
- `divided?: boolean` Whether to show a separator above the item (from `ActionDropdownItem`)
- `checked?: boolean` Whether to show a checkmark indicator (from `ActionDropdownItem`)
- `class?: string` Additional CSS classes
- `children?: Array<DropdownMenuItemProps<T>>` Nested menu items (creates a sub-menu)
- `loading?: boolean` Whether to show loading state in sub-menu
- `loadingItemCount?: number` Number of skeleton items when loading | `default: 3`
- `searchable?: boolean` Enable search functionality for this item's children
- `searchPlaceholder?: string` Search input placeholder

**Events**

- `select(value: T)` Emitted when item or child is selected
- `search(searchTerm: string, itemId: T)` Emitted when sub-menu search changes
- `update:subMenuOpen(open: boolean)` Emitted when sub-menu open state changes

**Slots**

- `item-leading` Content before the label (default: icon if provided) `{ item: DropdownMenuItemProps, ui: { class: string } }`
- `item-trailing` Content after the label (badges, shortcuts, etc.) `{ item: DropdownMenuItemProps, ui: { class: string } }`

### Examples

**Basic example with items**

```vue
<script setup lang="ts">
const dropdownItems = ref([
  { id: 'edit', label: 'Edit', icon: { type: 'icon', value: 'pen' } },
  { id: 'duplicate', label: 'Duplicate', icon: { type: 'icon', value: 'copy' } },
  { id: 'delete', label: 'Delete', icon: { type: 'icon', value: 'trash' }, divided: true }
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
  { id: 'profile', label: 'Profile', icon: { type: 'icon', value: 'user' } },
  { id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'cog' } },
  { id: 'logout', label: 'Sign out', icon: { type: 'icon', value: 'sign-out' }, divided: true }
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

**With emoji activator**

```vue
<script setup lang="ts">
const items = ref([
  { id: 'option-1', label: 'Option 1' },
  { id: 'option-2', label: 'Option 2' }
])
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    :activator-icon="{ type: 'emoji', value: '🎉' }"
    @select="handleSelect"
  />
</template>
```

**With badges and shortcuts using slots**

```vue
<script setup lang="ts">
const items = ref([
  { id: 'save', label: 'Save', icon: { type: 'icon', value: 'save' } },
  { id: 'share', label: 'Share', icon: { type: 'icon', value: 'share' } },
  { id: 'pro', label: 'Pro Feature', icon: { type: 'icon', value: 'star' }, disabled: true }
])

const handleUpgrade = () => {
  // Show upgrade modal
}
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    :activator-icon="{ type: 'icon', value: 'ellipsis' }"
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

**Sub-menu example**

```vue
<script setup lang="ts">
const items = ref([
  { id: 'file', label: 'File', icon: { type: 'icon', value: 'file' } },
  {
    id: 'export',
    label: 'Export as...',
    icon: { type: 'icon', value: 'download' },
    children: [
      { id: 'pdf', label: 'PDF' },
      { id: 'csv', label: 'CSV' },
      { id: 'json', label: 'JSON' }
    ]
  },
])
</script>

<template>
  <N8nDropdownMenu :items="items" @select="handleSelect" />
</template>
```

**Searchable sub-menu (async search)**

```vue
<script setup lang="ts">
const users = ref([])
const loading = ref(false)

const items = computed(() => [
  {
    id: 'select-user',
    label: 'Assign to...',
    searchable: true,
    searchPlaceholder: 'Search users...',
    loading: loading.value,
    children: users.value
  },
])

const handleSearch = async (term: string, itemId?: string) => {
  if (itemId === 'select-user') {
    loading.value = true
    users.value = await fetchUsers(term)
    loading.value = false
  }
}
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    @select="handleSelect"
    @search="handleSearch"
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

**Lazy loading sub-menu items**

```vue
<script setup lang="ts">
const recentFilesLoading = ref(true)
const recentFiles = ref([])

const items = computed(() => [
  { id: 'new', label: 'New File', icon: { type: 'icon', value: 'plus' } },
  {
    id: 'recent',
    label: 'Recent Files',
    icon: { type: 'icon', value: 'clock' },
    loading: recentFilesLoading.value,
    loadingItemCount: 4,
    children: recentFiles.value
  },
  { id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'cog' } }
])

const handleSubmenuToggle = async (itemId: string, open: boolean) => {
  // Only fetch when sub-menu opens and data hasn't been loaded
  if (itemId === 'recent' && open && recentFilesLoading.value) {
    recentFiles.value = await fetchRecentFiles()
    recentFilesLoading.value = false
  }
}

// Reset on dropdown close to show loading again next time
const handleOpenChange = (open: boolean) => {
  if (!open) {
    recentFilesLoading.value = true
    recentFiles.value = []
  }
}
</script>

<template>
  <N8nDropdownMenu
    :items="items"
    @select="handleSelect"
    @update:model-value="handleOpenChange"
    @submenu:toggle="handleSubmenuToggle"
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
  :activator-icon="{ type: 'icon', value: icon }"
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

- `closeOnParentScroll` is not yet implemented - requires `useParentScroll` composable migration
- The new `update:modelValue` replaces both `visible-change` and `visibleChange` events
- Search is opt-in via `searchable` prop. Both root-level and sub-menu search are supported
- Search filtering is not built-in - use the `search` event to filter items externally (e.g., for async search)
- The `icon` prop now accepts `IconOrEmoji` type: `{ type: 'icon', value: 'pen' }` or `{ type: 'emoji', value: '🎉' }`
- Keyboard navigation in searchable menus uses virtual highlighting (focus stays in search input)
- Non-searchable menus use Reka UI's built-in roving focus for keyboard navigation
