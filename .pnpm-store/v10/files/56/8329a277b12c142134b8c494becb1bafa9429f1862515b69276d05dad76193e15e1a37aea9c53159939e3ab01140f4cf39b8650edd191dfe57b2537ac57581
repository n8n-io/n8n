<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useForwardExpose } from '@/shared'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import ScrollAreaScrollbarImpl from './ScrollAreaScrollbarImpl.vue'
import { injectScrollAreaScrollbarVisibleContext } from './ScrollAreaScrollbarVisible.vue'
import { getThumbSize } from './utils'

const rootContext = injectScrollAreaRootContext()
const scrollbarVisibleContext = injectScrollAreaScrollbarVisibleContext()

const { forwardRef, currentElement: scrollbarElement } = useForwardExpose()

onMounted(() => {
  if (scrollbarElement.value)
    rootContext.onScrollbarXChange(scrollbarElement.value)
})
const sizes = computed(() => scrollbarVisibleContext.sizes.value)
</script>

<template>
  <ScrollAreaScrollbarImpl
    :ref="forwardRef"
    :is-horizontal="true"
    data-orientation="horizontal"
    :style="{
      bottom: 0,
      left: rootContext.dir.value === 'rtl' ? 'var(--reka-scroll-area-corner-width)' : 0,
      right: rootContext.dir.value === 'ltr' ? 'var(--reka-scroll-area-corner-width)' : 0,
      ['--reka-scroll-area-thumb-width' as any]: sizes ? `${getThumbSize(sizes)}px` : undefined,
    }"
    @on-drag-scroll="scrollbarVisibleContext.onDragScroll($event.x)"
  >
    <slot />
  </ScrollAreaScrollbarImpl>
</template>
