# Component specification

Allows users to navigate through paginated content by displaying page numbers and navigation controls. The Pagination component provides a clean interface for moving between pages, with support for ellipsis when there are many pages, customizable navigation buttons, page size selector, and total items display.

- **Component Name:** N8nPagination
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElPagination](https://element-plus.org/en-US/component/pagination)
- **Reka UI Component:** [Pagination](https://reka-ui.com/docs/components/pagination)


## Public API Definition

**Props**

- `total: number` The total number of items to paginate (required)
- `currentPage?: number` The current active page number. Can be bind as `v-model:current-page`
- `pageSize?: number` The number of items per page | `default: 10`. Can be bind as `v-model:page-size`
- `pageSizes?: number[]` Available page size options for the selector | `default: [10, 20, 50, 100]`
- `background?: boolean` Add background color to pagination buttons | `default: false`
- `hideOnSinglePage?: boolean` Hide pagination when there is only one page | `default: false`
- `pagerCount?: number` Number of pagers to show. Must be odd | `default: 7`
- `layout?: string` Layout of pagination components, comma-separated. Options: `total`, `prev`, `pager`, `next`, `sizes` | `default: 'prev, pager, next'`

**Events**

- `update:current-page(page: number)` Emitted when the current page changes
- `update:page-size(size: number)` Emitted when the page size changes
- `size-change(size: number)` Emitted when the page size changes (alias for compatibility)

**Slots**

- `prev-icon` Custom content for the previous button. Default: `‹`
- `next-icon` Custom content for the next button. Default: `›`


### Template usage examples

**Basic usage:**
```vue
<script setup lang="ts">
import { ref } from 'vue';

const currentPage = ref(1);
const total = 100;
const pageSize = 10;
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    :total="total"
    :page-size="pageSize"
  />
</template>
```

**With background:**
```vue
<N8nPagination
  v-model:current-page="currentPage"
  :total="100"
  :page-size="10"
  background
/>
```

**With total and page size selector:**
```vue
<script setup lang="ts">
import { ref } from 'vue';

const currentPage = ref(1);
const pageSize = ref(10);
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    :total="500"
    :page-sizes="[10, 20, 50, 100]"
    layout="total, prev, pager, next, sizes"
    background
  />
</template>
```

**Hide on single page:**
```vue
<N8nPagination
  v-model:current-page="currentPage"
  :total="5"
  :page-size="10"
  hide-on-single-page
/>
```

**Custom icons:**
```vue
<N8nPagination
  v-model:current-page="currentPage"
  :total="500"
  :page-size="10"
>
  <template #prev-icon>
    <N8nIcon icon="chevron-left" />
  </template>
  <template #next-icon>
    <N8nIcon icon="chevron-right" />
  </template>
</N8nPagination>
```

**Custom pager count:**
```vue
<N8nPagination
  v-model:current-page="currentPage"
  :total="1000"
  :page-size="10"
  :pager-count="5"
/>
```

