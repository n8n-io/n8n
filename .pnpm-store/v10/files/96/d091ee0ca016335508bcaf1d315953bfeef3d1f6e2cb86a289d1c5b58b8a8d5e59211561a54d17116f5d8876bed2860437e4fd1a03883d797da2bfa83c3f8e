<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface PaginationNextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectPaginationRootContext } from './PaginationRoot.vue'

const props = withDefaults(defineProps<PaginationNextProps>(), { as: 'button' })

useForwardExpose()
const rootContext = injectPaginationRootContext()

const disabled = computed((): boolean => rootContext.page.value === rootContext.pageCount.value || rootContext.disabled.value)
</script>

<template>
  <Primitive
    v-bind="props"
    aria-label="Next Page"
    :type="as === 'button' ? 'button' : undefined"
    :disabled
    @click="!disabled && rootContext.onPageChange(rootContext.page.value + 1)"
  >
    <slot>Next page</slot>
  </Primitive>
</template>
