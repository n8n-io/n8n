<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface PaginationFirstProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectPaginationRootContext } from './PaginationRoot.vue'

const props = withDefaults(defineProps<PaginationFirstProps>(), { as: 'button' })

const rootContext = injectPaginationRootContext()
useForwardExpose()

const disabled = computed((): boolean => rootContext.page.value === 1 || rootContext.disabled.value)
</script>

<template>
  <Primitive
    v-bind="props"
    aria-label="First Page"
    :type="as === 'button' ? 'button' : undefined"
    :disabled
    @click="!disabled && rootContext.onPageChange(1)"
  >
    <slot>First page</slot>
  </Primitive>
</template>
