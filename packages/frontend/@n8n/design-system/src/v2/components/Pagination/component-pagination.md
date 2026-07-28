# Component specification

Displays data in paged format and provides navigation between pages. Enables users to navigate through large datasets by breaking content into manageable pages with controls for moving between them.

- **Component Name:** N8nPagination2
- **Element+ Component:** [ElPagination](https://element-plus.org/en-US/component/pagination.html) (API compatibility)
- **Reka UI Component:** [Pagination](https://reka-ui.com/docs/components/pagination)
- **Nuxt UI Component:** [Pagination](https://ui.nuxt.com/docs/components/pagination)


## Public API Definition

**Props**

- `currentPage?: number` - Current active page number (1-indexed). Supports `v-model:current-page`. Default: `1`
- `page?: number` - Alias for `currentPage` (Reka / Element+ compatibility)
- `pageSize?: number` - Number of items per page. Default: `10`
- `itemsPerPage?: number` - Alias for `pageSize`
- `total?: number` - Total number of items across all pages. Used to calculate page count. Default: `0`
- `pageCount?: number` - Total number of pages. Takes precedence over `total` when set
- `pagerCount?: number` - Maximum odd number of page buttons to show (Element+ compatibility). Mapped to Reka `siblingCount`
- `siblingCount?: number` - Pages to show on each side of the current page before ellipsis. Default: `1`
- `showEdges?: boolean` - Always show first and last page buttons (with ellipsis when needed). Default: `true`
- `hideOnSinglePage?: boolean` - Hide the component when there is only one page. Default: `false`
- `disabled?: boolean` - Disable all pagination controls. Default: `false`
- `prevText?: string` - Custom text for the previous button (chevron icon used when omitted)
- `nextText?: string` - Custom text for the next button (chevron icon used when omitted)
- `defaultCurrentPage?: number` - Initial page in uncontrolled mode
- `defaultPage?: number` - Alias for `defaultCurrentPage` (Reka prop)
- `defaultPageSize?: number` - Initial page size in uncontrolled mode

**UI Props**

- `size?: 'small' | 'medium'` - Size variant. Default: `'medium'`

**Events**

- `@update:current-page` / `@update:page` - Emitted when the current page changes. Payload: `(value: number) => void`
- `@current-change` - Legacy Element+ alias of `@update:current-page`
- `@prev-click` - Emitted when navigating to a lower page. Payload: `(value: number) => void`
- `@next-click` - Emitted when navigating to a higher page. Payload: `(value: number) => void`

**Slots**

- `prev`: `{ disabled?: boolean }` - Custom previous-page control
- `next`: `{ disabled?: boolean }` - Custom next-page control

### Template usage example

**Simple pagination (most common):**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination2 } from '@n8n/design-system'

const currentPage = ref(1)
</script>

<template>
  <N8nPagination2
    v-model:current-page="currentPage"
    :page-size="20"
    :total="100"
  />
</template>
```

**Server-side pagination (0-indexed backend):**
```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { N8nPagination2 } from '@n8n/design-system'

const backendPage = ref(0)
const itemsPerPage = 25
const totalItems = ref(0)

watch(backendPage, async (newPage) => {
  const response = await fetch(`/api/items?page=${newPage}&limit=${itemsPerPage}`)
  const data = await response.json()
  totalItems.value = data.total
})

const handlePageChange = (page: number) => {
  backendPage.value = page - 1
}
</script>

<template>
  <N8nPagination2
    :current-page="backendPage + 1"
    :page-size="itemsPerPage"
    :total="totalItems"
    @update:current-page="handlePageChange"
  />
</template>
```

**Client-side pagination:**
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { N8nPagination2 } from '@n8n/design-system'

const allItems = ref([/* ... large dataset ... */])
const currentPage = ref(1)
const pageSize = 20

const totalPages = computed(() => Math.ceil(allItems.value.length / pageSize))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return allItems.value.slice(start, start + pageSize)
})
</script>

<template>
  <div>
    <div v-for="item in paginatedItems" :key="item.id">
      {{ item.name }}
    </div>

    <N8nPagination2
      v-if="totalPages > 1"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="allItems.length"
      :pager-count="5"
    />
  </div>
</template>
```
