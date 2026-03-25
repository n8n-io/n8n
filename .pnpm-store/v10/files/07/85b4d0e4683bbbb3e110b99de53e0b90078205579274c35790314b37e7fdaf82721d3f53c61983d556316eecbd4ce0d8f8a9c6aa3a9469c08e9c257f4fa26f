<script lang="ts">
import type { ScrollAreaScrollbarAutoProps } from './ScrollAreaScrollbarAuto.vue'

export interface ScrollAreaScrollbarHoverProps extends ScrollAreaScrollbarAutoProps {}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Presence } from '@/Presence'
import { useForwardExpose } from '@/shared'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue'

defineOptions({
  inheritAttrs: false,
})

defineProps<ScrollAreaScrollbarHoverProps>()

const rootContext = injectScrollAreaRootContext()

const { forwardRef } = useForwardExpose()

let timeout: ReturnType<typeof setTimeout> | undefined | number
const visible = ref(false)

function handlePointerEnter() {
  window.clearTimeout(timeout)
  visible.value = true
}
function handlePointerLeave() {
  timeout = window.setTimeout(() => {
    visible.value = false
  }, rootContext.scrollHideDelay.value)
}

onMounted(() => {
  const scrollArea = rootContext.scrollArea.value

  if (scrollArea) {
    scrollArea.addEventListener('pointerenter', handlePointerEnter)
    scrollArea.addEventListener('pointerleave', handlePointerLeave)
  }
})

onUnmounted(() => {
  const scrollArea = rootContext.scrollArea.value
  if (scrollArea) {
    window.clearTimeout(timeout)
    scrollArea.removeEventListener('pointerenter', handlePointerEnter)
    scrollArea.removeEventListener('pointerleave', handlePointerLeave)
  }
})
</script>

<template>
  <Presence :present="forceMount || visible">
    <ScrollAreaScrollbarAuto
      v-bind="$attrs"
      :ref="forwardRef"
      :data-state="visible ? 'visible' : 'hidden'"
    >
      <slot />
    </ScrollAreaScrollbarAuto>
  </Presence>
</template>
