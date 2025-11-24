# Component specification

Allows users to navigate through paginated content by displaying page numbers and navigation controls. The Pagination component provides a clean interface for moving between pages, with support for ellipsis when there are many pages, and customizable navigation buttons.

- **Component Name:** N8nPagination
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=2121-630&m=dev)
- **Element+ Component:** [ElPagination](https://element-plus.org/en-US/component/pagination)
- **Reka UI Component:** [Pagination](https://reka-ui.com/docs/components/pagination)


## Public API Definition

**Props**

- `total: number` The total number of items to paginate (required)
- `currentPage?: number` The current active page number. Can be bind as `v-model:current-page`
- `pageSize?: number` The number of items per page | `default: 10`

**Events**

- `update:current-page(page: number)` Emitted when the current page changes

**Slots**

- `prev-icon` Custom content for the previous button. Default: `‹`
- `next-icon` Custom content for the next button. Default: `›`


### Template usage example

```Typescript
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

```Typescript
<script setup lang="ts">
import { ref } from 'vue';

const currentPage = ref(1);
const total = 500;
const pageSize = 10;
</script>

<template>
  <N8nPagination
    v-model:current-page="currentPage"
    :total="total"
    :page-size="pageSize"
  >
    <template #prev-icon>
      <N8nIcon icon="chevron-left" />
    </template>
    <template #next-icon>
      <N8nIcon icon="chevron-right" />
    </template>
  </N8nPagination>
</template>
```

