<script lang="ts">
type ScrollbarAreaScrollbarImplEmits = {
  onDragScroll: [payload: { x: number, y: number }]
  onWheelScroll: [payload: { x: number, y: number }]
  onThumbPointerDown: [payload: { x: number, y: number }]
}

export interface ScrollAreaScrollbarImplProps {
  isHorizontal: boolean
}
</script>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { onMounted, onUnmounted, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import { injectScrollAreaScrollbarContext } from './ScrollAreaScrollbar.vue'
import { injectScrollAreaScrollbarVisibleContext } from './ScrollAreaScrollbarVisible.vue'
import { toInt } from './utils'

const props = defineProps<ScrollAreaScrollbarImplProps>()
const emit = defineEmits<ScrollbarAreaScrollbarImplEmits>()
const rootContext = injectScrollAreaRootContext()
const scrollbarVisibleContext = injectScrollAreaScrollbarVisibleContext()
const scrollbarContext = injectScrollAreaScrollbarContext()

const { forwardRef, currentElement: scrollbar } = useForwardExpose()
const prevWebkitUserSelectRef = ref('')
const rectRef = ref<DOMRect>()

function handleDragScroll(event: MouseEvent) {
  if (rectRef.value) {
    const x = event.clientX - rectRef.value?.left
    const y = event.clientY - rectRef.value?.top
    emit('onDragScroll', { x, y })
  }
}

function handlePointerDown(event: PointerEvent) {
  const mainPointer = 0
  if (event.button === mainPointer) {
    const element = event.target as HTMLElement
    element.setPointerCapture(event.pointerId)
    rectRef.value = scrollbar.value!.getBoundingClientRect()

    // pointer capture doesn't prevent text selection in Safari
    // so we remove text selection manually when scrolling
    prevWebkitUserSelectRef.value = document.body.style.webkitUserSelect
    document.body.style.webkitUserSelect = 'none'
    if (rootContext.viewport)
      rootContext.viewport.value!.style.scrollBehavior = 'auto'

    handleDragScroll(event)
  }
}

function handlePointerMove(event: PointerEvent) {
  handleDragScroll(event)
}

function handlePointerUp(event: PointerEvent) {
  const element = event.target as HTMLElement
  if (element.hasPointerCapture(event.pointerId))
    element.releasePointerCapture(event.pointerId)

  document.body.style.webkitUserSelect = prevWebkitUserSelectRef.value
  if (rootContext.viewport)
    rootContext.viewport.value!.style.scrollBehavior = ''

  rectRef.value = undefined
}

function handleWheel(event: WheelEvent) {
  const element = event.target as HTMLElement
  const isScrollbarWheel = scrollbar.value?.contains(element)
  const maxScrollPos
    = scrollbarVisibleContext.sizes.value.content
      - scrollbarVisibleContext.sizes.value.viewport
  if (isScrollbarWheel)
    scrollbarVisibleContext.handleWheelScroll(event, maxScrollPos)
}

onMounted(() => {
  document.addEventListener('wheel', handleWheel, { passive: false })
})
onUnmounted(() => {
  document.removeEventListener('wheel', handleWheel)
})

function handleSizeChange() {
  if (!scrollbar.value)
    return
  if (props.isHorizontal) {
    scrollbarVisibleContext.handleSizeChange({
      content: rootContext.viewport.value?.scrollWidth ?? 0,
      viewport: rootContext.viewport.value?.offsetWidth ?? 0,
      scrollbar: {
        size: scrollbar.value.clientWidth ?? 0,
        paddingStart: toInt(getComputedStyle(scrollbar.value).paddingLeft),
        paddingEnd: toInt(getComputedStyle(scrollbar.value).paddingRight),
      },
    })
  }
  else {
    scrollbarVisibleContext.handleSizeChange({
      content: rootContext.viewport.value?.scrollHeight ?? 0,
      viewport: rootContext.viewport.value?.offsetHeight ?? 0,
      scrollbar: {
        size: scrollbar.value?.clientHeight ?? 0,
        paddingStart: toInt(getComputedStyle(scrollbar.value!).paddingLeft),
        paddingEnd: toInt(getComputedStyle(scrollbar.value!).paddingRight),
      },
    })
  }
}

useResizeObserver(scrollbar, handleSizeChange)
useResizeObserver(rootContext.content, handleSizeChange)
</script>

<template>
  <Primitive
    :ref="forwardRef"
    style="position: absolute"
    data-scrollbarimpl
    :as="scrollbarContext.as.value"
    :as-child="scrollbarContext.asChild.value"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
  >
    <slot />
  </Primitive>
</template>
