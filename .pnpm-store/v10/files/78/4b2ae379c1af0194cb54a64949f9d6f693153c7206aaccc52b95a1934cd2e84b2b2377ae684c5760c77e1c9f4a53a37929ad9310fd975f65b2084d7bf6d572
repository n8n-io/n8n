<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface PaginationLastProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectPaginationRootContext } from './PaginationRoot.vue'

const props = withDefaults(defineProps<PaginationLastProps>(), { as: 'button' })

const rootContext = injectPaginationRootContext()
useForwardExpose()

const disabled = computed((): boolean => rootContext.page.value === rootContext.pageCount.value || rootContext.disabled.value)
</script>

<template>
  <Primitive
    v-bind="props"
    aria-label="Last Page"
    :type="as === 'button' ? 'button' : undefined"
    :disabled
    @click="!disabled && rootContext.onPageChange(rootContext.pageCount.value)"
  >
    <slot>Last page</slot>
  </Primitive>
</template>
