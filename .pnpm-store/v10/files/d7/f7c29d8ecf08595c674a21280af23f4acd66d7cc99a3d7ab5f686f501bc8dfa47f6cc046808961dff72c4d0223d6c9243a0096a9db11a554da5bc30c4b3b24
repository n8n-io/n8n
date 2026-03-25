<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useForwardExpose } from '@/shared'

export interface ScrollAreaScrollbarProps extends PrimitiveProps {
  /** The orientation of the scrollbar */
  orientation?: 'vertical' | 'horizontal'
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}

export interface ScrollAreaScollbarContext {
  as: Ref<PrimitiveProps['as']>
  orientation: Ref<'vertical' | 'horizontal'>
  forceMount?: Ref<boolean>
  isHorizontal: Ref<boolean>
  asChild: Ref<boolean>
}

export const [injectScrollAreaScrollbarContext, provideScrollAreaScrollbarContext]
  = createContext<ScrollAreaScollbarContext>('ScrollAreaScrollbar')
</script>

<script setup lang="ts">
import {
  computed,
  onUnmounted,
  toRefs,
  watch,
} from 'vue'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue'
import ScrollAreaScrollbarHover from './ScrollAreaScrollbarHover.vue'
import ScrollAreaScrollbarScroll from './ScrollAreaScrollbarScroll.vue'
import ScrollAreaScrollbarVisible from './ScrollAreaScrollbarVisible.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ScrollAreaScrollbarProps>(), {
  orientation: 'vertical',
  as: 'div',
})

const { forwardRef } = useForwardExpose()
const rootContext = injectScrollAreaRootContext()

const isHorizontal = computed(() => props.orientation === 'horizontal')

watch(
  isHorizontal,
  () => {
    if (isHorizontal.value)
      rootContext.onScrollbarXEnabledChange(true)
    else rootContext.onScrollbarYEnabledChange(true)
  },
  { immediate: true },
)

onUnmounted(() => {
  rootContext.onScrollbarXEnabledChange(false)
  rootContext.onScrollbarYEnabledChange(false)
})

const { orientation, forceMount, asChild, as } = toRefs(props)
provideScrollAreaScrollbarContext({
  orientation,
  forceMount,
  isHorizontal,
  as,
  asChild,
})
</script>

<template>
  <ScrollAreaScrollbarHover
    v-if="rootContext.type.value === 'hover'"
    v-bind="$attrs"
    :ref="forwardRef"
    :force-mount="forceMount"
  >
    <slot />
  </ScrollAreaScrollbarHover>
  <ScrollAreaScrollbarScroll
    v-else-if="rootContext.type.value === 'scroll'"
    v-bind="$attrs"
    :ref="forwardRef"
    :force-mount="forceMount"
  >
    <slot />
  </ScrollAreaScrollbarScroll>
  <ScrollAreaScrollbarAuto
    v-else-if="rootContext.type.value === 'auto'"
    v-bind="$attrs"
    :ref="forwardRef"
    :force-mount="forceMount"
  >
    <slot />
  </ScrollAreaScrollbarAuto>
  <ScrollAreaScrollbarVisible
    v-else-if="rootContext.type.value === 'always'"
    v-bind="$attrs"
    :ref="forwardRef"
    data-state="visible"
  >
    <slot />
  </ScrollAreaScrollbarVisible>
</template>
