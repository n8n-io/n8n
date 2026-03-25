<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface ScrollAreaThumbProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watchOnce } from '@vueuse/core'
import { computed, onUnmounted, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import { injectScrollAreaScrollbarVisibleContext } from './ScrollAreaScrollbarVisible.vue'
import { addUnlinkedScrollListener } from './utils'

const props = defineProps<ScrollAreaThumbProps>()

const rootContext = injectScrollAreaRootContext()
const scrollbarContextVisible = injectScrollAreaScrollbarVisibleContext()

function handlePointerDown(event: MouseEvent) {
  const thumb = event.target as HTMLElement
  const thumbRect = thumb.getBoundingClientRect()
  const x = event.clientX - thumbRect.left
  const y = event.clientY - thumbRect.top
  scrollbarContextVisible.handleThumbDown(event, { x, y })
}

function handlePointerUp(event: MouseEvent) {
  scrollbarContextVisible.handleThumbUp(event)
}

const { forwardRef, currentElement: thumbElement } = useForwardExpose()
const removeUnlinkedScrollListenerRef = ref<() => void>()
const viewport = computed(() => rootContext.viewport.value)

function handleScroll() {
  if (!removeUnlinkedScrollListenerRef.value) {
    const listener = addUnlinkedScrollListener(
      viewport.value!,
      scrollbarContextVisible.onThumbPositionChange,
    )
    removeUnlinkedScrollListenerRef.value = listener
    scrollbarContextVisible.onThumbPositionChange()
  }
}

const sizes = computed(() => scrollbarContextVisible.sizes.value)

watchOnce(sizes, () => {
  scrollbarContextVisible.onThumbChange(thumbElement.value!)
  if (viewport.value) {
    /**
     * We only bind to native scroll event so we know when scroll starts and ends.
     * When scroll starts we start a requestAnimationFrame loop that checks for
     * changes to scroll position. That rAF loop triggers our thumb position change
     * when relevant to avoid scroll-linked effects. We cancel the loop when scroll ends.
     * https://developer.mozilla.org/en-US/docs/Mozilla/Performance/Scroll-linked_effects
     */
    scrollbarContextVisible.onThumbPositionChange()
    viewport.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  viewport.value!.removeEventListener('scroll', handleScroll)
  rootContext.viewport.value?.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :data-state="scrollbarContextVisible.hasThumb ? 'visible' : 'hidden'"
    :style="{
      width: 'var(--reka-scroll-area-thumb-width)',
      height: 'var(--reka-scroll-area-thumb-height)',
    }"
    :as-child="props.asChild"
    :as="as"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
  >
    <slot />
  </Primitive>
</template>
