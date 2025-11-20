# Component specification

Displays data in paged format and provides navigation between pages. Enables users to navigate through large datasets by breaking content into manageable pages with controls for moving between them.

- **Component Name:** N8nPagination
- **Element+ Component:** [ElPagination](https://element-plus.org/en-US/component/pagination.html)
- **Reka UI Component:** [Pagination](https://reka-ui.com/docs/components/pagination)
- **Nuxt UI Component:** [Pagination](https://ui.nuxt.com/docs/components/pagination)


## Public API Definition

**Props**

- `currentPage?: number` - Current active page number (1-indexed). Supports v-model binding via `v-model:current-page`. Default: `1`
- `pageSize?: number` - Number of items to display per page. Supports v-model binding via `v-model:page-size`. Default: `10`
- `total?: number` - Total number of items across all pages. Used to calculate total page count. Default: `0`
- `pageCount?: number` - Total number of pages. Alternative to using `total`. If provided, takes precedence over `total`.
- `pagerCount?: number` - Maximum number of page buttons to display in the pager. Must be an odd number. Default: `7`
- `layout?: string` - Order and elements to display in the pagination. Comma-separated values: `'prev' | 'pager' | 'next' | 'sizes' | 'jumper' | 'total'`. Default: `'prev, pager, next'`
- `pageSizes?: number[]` - Available page size options for the sizes dropdown (when `'sizes'` is in layout). Default: `[10, 20, 30, 40, 50, 100]`
- `background?: boolean` - Whether to add background color to pagination buttons. Default: `false`
- `small?: boolean` - Whether to use small size variant for compact layouts. Default: `false`
- `disabled?: boolean` - Whether pagination controls are disabled. Default: `false`
- `hideOnSinglePage?: boolean` - Whether to hide the pagination when there is only one page (`pageCount === 1`). Default: `false`
- `prevText?: string` - Custom text for the previous page button. Overrides icon when provided. Default: `''`
- `prevIcon?: string | Component` - Custom icon for the previous page button. Default: Chevron left icon
- `nextText?: string` - Custom text for the next page button. Overrides icon when provided. Default: `''`
- `nextIcon?: string | Component` - Custom icon for the next page button. Default: Chevron right icon
- `popperClass?: string` - Custom CSS class name for the page sizes dropdown popper element. Default: `''`
- `teleported?: boolean` - Whether to append the page sizes dropdown to the body element. Default: `true`
- `defaultPageSize?: number` - Default page size value when using uncontrolled mode.
- `defaultCurrentPage?: number` - Default current page value when using uncontrolled mode.

**Events**

- `@update:current-page` - Emitted when the current page changes. Payload: `(value: number) => void`
- `@update:page-size` - Emitted when the page size changes. Payload: `(value: number) => void`
- `@size-change` - Emitted when the page size changes (legacy Element+ event). Payload: `(value: number) => void`
- `@current-change` - Emitted when the current page changes (legacy Element+ event). Payload: `(value: number) => void`
- `@prev-click` - Emitted when the previous page button is clicked. Payload: `(value: number) => void`
- `@next-click` - Emitted when the next page button is clicked. Payload: `(value: number) => void`

**Slots**

- `default` - Custom layout content. Rarely used. Provides complete control over pagination structure for advanced use cases.

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
    v-model:current-page="currentPage"
    :page-size="20"
    :total="100"
  />
</template>
```

**With background and custom pager count:**
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
    v-model:current-page="currentPage"
    background
    :pager-count="5"
    :page-size="rowsPerPage"
    :total="totalRows"
  />
</template>
```

**Full layout with page size selector and total count:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
const pageSize = ref(20)
const totalItems = 500

const handleSizeChange = (newSize: number) => {
  console.log('Page size changed to:', newSize)
  // Reset to first page when page size changes
  currentPage.value = 1
}
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    background
    :total="totalItems"
    :page-sizes="[10, 20, 50, 100]"
    layout="total, prev, pager, next, sizes"
    @size-change="handleSizeChange"
  />
</template>
```

**Hide when only one page:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
const items = ref([/* ... 15 items ... */])
</script>

<template>
  <!-- Pagination hidden when items.length <= 20 (one page) -->
  <N8nPagination
    v-model:current-page="currentPage"
    :page-size="20"
    :total="items.length"
    hide-on-single-page
  />
</template>
```

**Small variant with custom icons:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    small
    background
    :page-size="10"
    :total="200"
    prev-icon="chevron-left"
    next-icon="chevron-right"
  />
</template>
```

**Disabled state (e.g., during loading):**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
const loading = ref(false)

const fetchData = async (page: number) => {
  loading.value = true
  try {
    // Fetch data...
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    background
    :page-size="20"
    :total="100"
    :disabled="loading"
    @update:current-page="fetchData"
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
    background
    @update:current-page="handlePageChange"
  />
</template>
```

**With page jumper and custom text:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    background
    :page-size="30"
    :total="300"
    layout="prev, pager, next, jumper"
    prev-text="Previous"
    next-text="Next"
  />
</template>
```

**Multiple page size options with custom dropdown styling:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPagination } from '@n8n/design-system'

const currentPage = ref(1)
const pageSize = ref(25)
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    background
    :total="1000"
    :page-sizes="[25, 50, 75, 100, 200]"
    layout="sizes, prev, pager, next, jumper, total"
    popper-class="custom-pagination-dropdown"
  />
</template>

<style scoped>
:deep(.custom-pagination-dropdown) {
  /* Custom dropdown styles */
  min-width: 120px;
}
</style>
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
      v-model:current-page="currentPage"
      background
      :pager-count="5"
      :page-size="pageSize"
      :total="allItems.length"
    />
  </div>
</template>
```
