<script lang="ts">
import type { ScrollAreaScrollbarAutoProps } from './ScrollAreaScrollbarAuto.vue'

export interface ScrollAreaScrollbarGlimpseProps extends ScrollAreaScrollbarAutoProps {}
</script>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { Presence } from '@/Presence'
import { useForwardExpose } from '@/shared'
import { useStateMachine } from '../shared/useStateMachine'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import { injectScrollAreaScrollbarContext } from './ScrollAreaScrollbar.vue'
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue'

defineOptions({
  inheritAttrs: false,
})

defineProps<ScrollAreaScrollbarGlimpseProps>()

const rootContext = injectScrollAreaRootContext()
const scrollbarContext = injectScrollAreaScrollbarContext()

const { forwardRef } = useForwardExpose()

const { state, dispatch } = useStateMachine('hidden', {
  hidden: {
    POINTER_ENTER: 'glimpse',
    SCROLL: 'scrolling',
  },
  glimpse: {
    HIDE: 'hidden',
    POINTER_LEAVE: 'hidden',
    SCROLL: 'scrolling',
    POINTER_ENTER: 'glimpse',
  },
  scrolling: {
    SCROLL_END: 'idle',
    POINTER_ENTER: 'interacting',
  },
  interacting: {
    SCROLL: 'interacting',
    POINTER_LEAVE: 'idle',
  },
  idle: {
    HIDE: 'hidden',
    SCROLL: 'scrolling',
    POINTER_ENTER: 'interacting',
  },
})

const visible = computed(() => state.value !== 'hidden')

function handlePointerEnter() {
  dispatch('POINTER_ENTER')
}

function handlePointerLeave() {
  dispatch('POINTER_LEAVE')
}

const debounceScrollEnd = useDebounceFn(() => dispatch('SCROLL_END'), 100)

watchEffect((onCleanup) => {
  if (state.value === 'glimpse') {
    const timeId = window.setTimeout(
      () => dispatch('HIDE'),
      rootContext.scrollHideDelay.value,
    )

    onCleanup(() => {
      window.clearTimeout(timeId)
    })
  }
})

watchEffect((onCleanup) => {
  if (state.value === 'idle') {
    const timeId = window.setTimeout(
      () => dispatch('HIDE'),
      rootContext.scrollHideDelay.value,
    )

    onCleanup(() => {
      window.clearTimeout(timeId)
    })
  }
})

watchEffect((onCleanup) => {
  const viewport = rootContext.viewport.value
  const scrollDirection = scrollbarContext.isHorizontal.value
    ? 'scrollLeft'
    : 'scrollTop'

  if (viewport) {
    let prevScrollPos = viewport[scrollDirection]
    const handleScroll = () => {
      const scrollPos = viewport[scrollDirection]
      const hasScrollInDirectionChanged = prevScrollPos !== scrollPos
      if (hasScrollInDirectionChanged) {
        dispatch('SCROLL')
        debounceScrollEnd()
      }
      prevScrollPos = scrollPos
    }
    viewport.addEventListener('scroll', handleScroll)

    onCleanup(() => {
      viewport.removeEventListener('scroll', handleScroll)
    })
  }
})

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
