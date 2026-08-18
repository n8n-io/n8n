# Component specification

Displays data in paged format and provides navigation between pages. Enables users to navigate through large datasets by breaking content into manageable pages with controls for moving between them.

Always renders **prev / pager / next**. Optionally renders **total**, **page size select**, and **jumper** via `showTotal` / `showSizes` / `showJumper` (`showTotal` and `showSizes` default `true`; `showJumper` defaults `false`).

- **Component Name:** N8nPagination
- **Reka UI Component:** [Pagination](https://reka-ui.com/docs/components/pagination)
- **Nuxt UI Component:** [Pagination](https://ui.nuxt.com/docs/components/pagination)


## Public API Definition

Extends Reka UI [`PaginationRootProps`](https://reka-ui.com/docs/components/pagination) / `PaginationRootEmits`, plus a few UI helpers.

**Reka props**

- `page?: number` - Controlled current page (1-indexed). Supports `v-model:page`. When set, the parent value stays authoritative until it accepts `@update:page`
- `defaultPage?: number` - Initial page in uncontrolled mode. Default: `1`
- `itemsPerPage?: number` - Controlled items per page. Supports `v-model:items-per-page`. When set, the parent value stays authoritative until it accepts `@update:items-per-page`
- `total: number` - Total number of items across all pages
- `siblingCount?: number` - Pages to show on each side of the current page before ellipsis. Default: `1`
- `showEdges?: boolean` - Always show first and last page buttons (with ellipsis when needed). Default: `true`
- `disabled?: boolean` - Disable all pagination controls. Default: `false`

**Additional props**

- `defaultItemsPerPage?: number` - Initial items-per-page in uncontrolled mode. Default: `10`
- `pageSizes?: number[]` - Options for the page size selector. Default: `[10, 20, 30, 40, 50, 100]`
- `showTotal?: boolean` - Show the total item count. Default: `true`
- `showSizes?: boolean` - Show the page size selector. Default: `true`
- `showJumper?: boolean` - Show the go-to-page jumper. Default: `false`
- `hideOnSinglePage?: boolean` - Hide the component when there is only one page. Default: `false`
- `size?: 'small' | 'medium'` - Size variant. Default: `'medium'`

**Events**

- `@update:page` - Emitted when the current page changes. Payload: `(value: number) => void`
- `@update:items-per-page` - Emitted when the page size changes. Payload: `(value: number) => void`

**Slots**

- `prev`: `{ disabled: boolean }` - Custom previous-page control (chevron button fallback)
- `next`: `{ disabled: boolean }` - Custom next-page control (chevron button fallback)

### Template usage example

**Controlled:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const page = ref(1)
const itemsPerPage = ref(20)
</script>

<template>
  <N8nPagination
    v-model:page="page"
    v-model:items-per-page="itemsPerPage"
    :total="100"
    :page-sizes="[10, 20, 50, 100]"
  />
</template>
```

**Uncontrolled:**
```vue
<script setup lang="ts">
import { N8nPagination } from '@n8n/design-system'
</script>

<template>
  <N8nPagination
    :default-page="1"
    :default-items-per-page="20"
    :total="100"
  />
</template>
```
