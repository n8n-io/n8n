# Component specification

Displays data in paged format and provides navigation between pages. Enables users to navigate through large datasets by breaking content into manageable pages with controls for moving between them.

- **Component Name:** N8nPagination
- **Element+ Component:** [ElPagination](https://element-plus.org/en-US/component/pagination.html)
- **Reka UI Component:** [Pagination](https://reka-ui.com/docs/components/pagination)
- **Nuxt UI Component:** [Pagination](https://ui.nuxt.com/docs/components/pagination)


## Public API Definition

**Props**

- `currentPage?: number` - Current active page number (1-indexed). Supports v-model binding via `v-model:current-page`. Default: `1`
- `pageSize?: number` - Number of items to display per page. Default: `10`
- `total?: number` - Total number of items across all pages. Used to calculate total page count. Default: `0`
- `pagerCount?: number` - Maximum number of page buttons to display in the pager. Must be an odd number. Default: `7`
- `layout?: string` - Order and elements to display in the pagination. Comma-separated values: `'prev' | 'pager' | 'next'`. Default: `'prev, pager, next'`

**Events**

- `@update:current-page` - Emitted when the current page changes. Payload: `(value: number) => void`

### Template usage example

**Simple pagination (most common):**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
</script>

<template>
  <N8nPagination
    :current-page="currentPage"
    :page-size="20"
    :total="100"
    @update:current-page="currentPage = $event"
  />
</template>
```

**With custom pager count:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
const rowsPerPage = 20
const totalRows = 150
</script>

<template>
  <N8nPagination
    :pager-count="5"
    :page-size="rowsPerPage"
    :total="totalRows"
    :current-page="currentPage"
    @update:current-page="currentPage = $event"
  />
</template>
```

**Server-side pagination (0-indexed backend):**
```typescript
<script setup lang="ts">
import { ref, watch } from 'vue'
import { N8nPagination } from '@n8n/design-system'

// Backend uses 0-indexed pages
const backendPage = ref(0)
const itemsPerPage = 25
const totalItems = ref(0)

// Fetch data when page changes
watch(backendPage, async (newPage) => {
  const response = await fetch(`/api/items?page=${newPage}&limit=${itemsPerPage}`)
  const data = await response.json()
  totalItems.value = data.total
})

// Convert between 1-indexed UI and 0-indexed backend
const handlePageChange = (page: number) => {
  backendPage.value = page - 1
}
</script>

<template>
  <!-- Display 1-indexed page to user, convert to 0-indexed for backend -->
  <N8nPagination
    :current-page="backendPage + 1"
    :page-size="itemsPerPage"
    :total="totalItems"
    layout="prev, pager, next"
    @update:current-page="handlePageChange"
  />
</template>
```

**Client-side pagination in data table:**
```typescript
<script setup lang="ts">
import { ref, computed } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const allItems = ref([/* ... large dataset ... */])
const currentPage = ref(1)
const pageSize = 20

const totalPages = computed(() => Math.ceil(allItems.value.length / pageSize))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return allItems.value.slice(start, end)
})
</script>

<template>
  <div>
    <!-- Display paginated items -->
    <div v-for="item in paginatedItems" :key="item.id">
      {{ item.name }}
    </div>

    <!-- Pagination controls -->
    <N8nPagination
      v-if="totalPages > 1"
      :pager-count="5"
      :page-size="pageSize"
      :total="allItems.length"
      :current-page="currentPage"
      @update:current-page="currentPage = $event"
    />
  </div>
</template>
```
