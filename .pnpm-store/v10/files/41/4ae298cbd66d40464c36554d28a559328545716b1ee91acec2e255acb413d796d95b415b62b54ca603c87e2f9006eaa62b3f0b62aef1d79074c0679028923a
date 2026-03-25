<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useForwardExpose } from '@/shared'

type PaginationRootContext = {
  page: Ref<number>
  onPageChange: (value: number) => void
  pageCount: Ref<number>
  siblingCount: Ref<number>
  disabled: Ref<boolean>
  showEdges: Ref<boolean>
}

export interface PaginationRootProps extends PrimitiveProps {
  /** The controlled value of the current page. Can be binded as `v-model:page`. */
  page?: number
  /**
   * The value of the page that should be active when initially rendered.
   *
   * Use when you do not need to control the value state.
   */
  defaultPage?: number
  /** Number of items per page */
  itemsPerPage: number
  /** Number of items in your list */
  total?: number
  /** Number of sibling should be shown around the current page */
  siblingCount?: number
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean
  /** When `true`, always show first page, last page, and ellipsis */
  showEdges?: boolean
}

export type PaginationRootEmits = {
  /** Event handler called when the page value changes */
  'update:page': [value: number]
}

export const [injectPaginationRootContext, providePaginationRootContext]
  = createContext<PaginationRootContext>('PaginationRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, toRefs } from 'vue'
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<PaginationRootProps>(), {
  as: 'nav',
  total: 0,
  siblingCount: 2,
  defaultPage: 1,
  showEdges: false,
})
const emits = defineEmits<PaginationRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current page state */
    page: typeof page.value
    /** Number of pages */
    pageCount: typeof pageCount.value
  }) => any
}>()

const { siblingCount, disabled, showEdges } = toRefs(props)

useForwardExpose()
const page = useVModel(props, 'page', emits, {
  defaultValue: props.defaultPage,
  passive: (props.page === undefined) as false,
}) as Ref<number>

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / (props.itemsPerPage || 1))))

providePaginationRootContext({
  page,
  onPageChange(value) {
    page.value = value
  },
  pageCount,
  siblingCount,
  disabled,
  showEdges,
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
  >
    <slot
      :page="page"
      :page-count="pageCount"
    />
  </Primitive>
</template>
