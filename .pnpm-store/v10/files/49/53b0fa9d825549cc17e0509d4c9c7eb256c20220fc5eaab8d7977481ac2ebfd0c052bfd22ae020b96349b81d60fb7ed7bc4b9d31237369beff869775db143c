<script lang="ts">
export interface ScrollAreaScrollbarScrollProps {
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, watchEffect } from 'vue'
import { Presence } from '@/Presence'
import { useForwardExpose } from '@/shared'
import { useStateMachine } from '../shared/useStateMachine'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import { injectScrollAreaScrollbarContext } from './ScrollAreaScrollbar.vue'
import ScrollAreaScrollbarVisible from './ScrollAreaScrollbarVisible.vue'

defineProps<ScrollAreaScrollbarScrollProps>()

const rootContext = injectScrollAreaRootContext()
const scrollbarContext = injectScrollAreaScrollbarContext()

const { forwardRef } = useForwardExpose()

const { state, dispatch } = useStateMachine('hidden', {
  hidden: {
    SCROLL: 'scrolling',
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

const debounceScrollEnd = useDebounceFn(() => dispatch('SCROLL_END'), 100)

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
</script>

<template>
  <Presence :present="forceMount || visible">
    <ScrollAreaScrollbarVisible
      v-bind="$attrs"
      :ref="forwardRef"
      :data-state="visible ? 'visible' : 'hidden'"
    >
      <slot />
    </ScrollAreaScrollbarVisible>
  </Presence>
</template>
