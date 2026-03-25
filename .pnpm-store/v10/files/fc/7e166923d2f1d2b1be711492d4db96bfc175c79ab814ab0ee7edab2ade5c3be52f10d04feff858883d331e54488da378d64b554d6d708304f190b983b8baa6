<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface ScrollAreaCornerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import ScrollAreaCornerImpl from './ScrollAreaCornerImpl.vue'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'

const props = defineProps<ScrollAreaCornerProps>()

const { forwardRef } = useForwardExpose()
const rootContext = injectScrollAreaRootContext()

const hasBothScrollbarsVisible = computed(
  () => !!rootContext.scrollbarX.value && !!rootContext.scrollbarY.value,
)
const hasCorner = computed(
  () => rootContext.type.value !== 'scroll' && hasBothScrollbarsVisible.value,
)
</script>

<template>
  <ScrollAreaCornerImpl
    v-if="hasCorner"
    v-bind="props"
    :ref="forwardRef"
  >
    <slot />
  </ScrollAreaCornerImpl>
</template>
