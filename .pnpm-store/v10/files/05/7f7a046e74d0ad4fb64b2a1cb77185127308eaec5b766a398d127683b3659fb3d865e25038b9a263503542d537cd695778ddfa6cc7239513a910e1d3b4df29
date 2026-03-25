<script lang="ts">
import type { Ref } from 'vue'
import type { Direction, ScrollType } from './types'
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useDirection, useForwardExpose } from '@/shared'

export interface ScrollAreaRootContext {
  type: Ref<ScrollType>
  dir: Ref<Direction>
  scrollHideDelay: Ref<number>
  scrollArea: Ref<HTMLElement | undefined>
  viewport: Ref<HTMLElement | undefined>
  onViewportChange: (viewport: HTMLElement | null) => void
  content: Ref<HTMLElement | undefined>
  onContentChange: (content: HTMLElement) => void
  scrollbarX: Ref<HTMLElement | undefined>
  onScrollbarXChange: (scrollbar: HTMLElement | null) => void
  scrollbarXEnabled: Ref<boolean>
  onScrollbarXEnabledChange: (rendered: boolean) => void
  scrollbarY: Ref<HTMLElement | undefined>
  onScrollbarYChange: (scrollbar: HTMLElement | null) => void
  scrollbarYEnabled: Ref<boolean>
  onScrollbarYEnabledChange: (rendered: boolean) => void
  onCornerWidthChange: (width: number) => void
  onCornerHeightChange: (height: number) => void
}

export const [injectScrollAreaRootContext, provideScrollAreaRootContext]
  = createContext<ScrollAreaRootContext>('ScrollAreaRoot')

export interface ScrollAreaRootProps extends PrimitiveProps {
  /**
   * Describes the nature of scrollbar visibility, similar to how the scrollbar preferences in MacOS control visibility of native scrollbars.
   *
   * `auto` - means that scrollbars are visible when content is overflowing on the corresponding orientation. <br>
   * `always` - means that scrollbars are always visible regardless of whether the content is overflowing.<br>
   * `scroll` - means that scrollbars are visible when the user is scrolling along its corresponding orientation.<br>
   * `hover` - when the user is scrolling along its corresponding orientation and when the user is hovering over the scroll area.
   */
  type?: ScrollType
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** If type is set to either `scroll` or `hover`, this prop determines the length of time, in milliseconds, <br> before the scrollbars are hidden after the user stops interacting with scrollbars. */
  scrollHideDelay?: number
}
</script>

<script setup lang="ts">
import { ref, toRefs } from 'vue'
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<ScrollAreaRootProps>(), {
  type: 'hover',
  scrollHideDelay: 600,
})

const cornerWidth = ref(0)
const cornerHeight = ref(0)
const viewport = ref<HTMLElement>()
const content = ref<HTMLElement>()
const scrollbarX = ref<HTMLElement>()
const scrollbarY = ref<HTMLElement>()
const scrollbarXEnabled = ref(false)
const scrollbarYEnabled = ref(false)

const { type, dir: propDir, scrollHideDelay } = toRefs(props)
const dir = useDirection(propDir)

function scrollTop() {
  viewport.value?.scrollTo({
    top: 0,
  })
}
function scrollTopLeft() {
  viewport.value?.scrollTo({
    top: 0,
    left: 0,
  })
}

defineExpose({
  /** Viewport element within ScrollArea */
  viewport,
  /** Scroll viewport to top */
  scrollTop,
  /** Scroll viewport to top-left */
  scrollTopLeft,
})

const { forwardRef, currentElement: scrollArea } = useForwardExpose()

provideScrollAreaRootContext({
  type,
  dir,
  scrollHideDelay,
  scrollArea,
  viewport,
  onViewportChange: (el) => {
    viewport.value = el || undefined
  },
  content,
  onContentChange: (el) => {
    content.value = el
  },
  scrollbarX,
  scrollbarXEnabled,
  scrollbarY,
  scrollbarYEnabled,
  onScrollbarXChange: (scrollbar) => {
    scrollbarX.value = scrollbar || undefined
  },
  onScrollbarYChange: (scrollbar) => {
    scrollbarY.value = scrollbar || undefined
  },
  onScrollbarXEnabledChange: (rendered) => {
    scrollbarXEnabled.value = rendered
  },
  onScrollbarYEnabledChange: (rendered) => {
    scrollbarYEnabled.value = rendered
  },
  onCornerWidthChange: (width) => {
    cornerWidth.value = width
  },
  onCornerHeightChange: (height) => {
    cornerHeight.value = height
  },
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as-child="props.asChild"
    :as="as"
    :dir="dir"
    :style="{
      position: 'relative',
      // Pass corner sizes as CSS vars to reduce re-renders of context consumers
      ['--reka-scroll-area-corner-width' as any]: `${cornerWidth}px`,
      ['--reka-scroll-area-corner-height' as any]: `${cornerHeight}px`,
    }"
  >
    <slot />
  </Primitive>
</template>
