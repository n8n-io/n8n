<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface NavigationMenuViewportProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
  /**
   * Placement of the viewport for css variables `(--reka-navigation-menu-viewport-left, --reka-navigation-menu-viewport-top)`.
   * @defaultValue 'center'
   */
  align?: 'start' | 'center' | 'end'
}
</script>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { Presence } from '@/Presence'
import {
  Primitive,
} from '@/Primitive'
import { injectNavigationMenuContext } from './NavigationMenuRoot.vue'
import { getOpenState, whenMouse } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<NavigationMenuViewportProps>(), {
  align: 'center',
})

const { forwardRef, currentElement } = useForwardExpose()

const menuContext = injectNavigationMenuContext()
const { activeTrigger, rootNavigationMenu, modelValue } = menuContext

const size = ref<{ width: number, height: number }>()
const position = ref<{ left: number, top: number }>()

const open = computed(() => !!menuContext.modelValue.value)

watch(currentElement, () => {
  menuContext.onViewportChange(currentElement.value)
})

const content = ref<HTMLElement>()

watch([modelValue, open], () => {
  if (!currentElement.value)
    return

  requestAnimationFrame(() => {
    const el = (currentElement.value as HTMLElement)?.querySelector('[data-state=open]') as HTMLElement | undefined
    content.value = el
  })
}, { immediate: true, flush: 'post' })

function updatePosition() {
  if (content.value && activeTrigger.value && rootNavigationMenu.value) {
    const bodyWidth = document.documentElement.offsetWidth
    const bodyHeight = document.documentElement.offsetHeight
    const rootRect = rootNavigationMenu.value.getBoundingClientRect()
    const rect = activeTrigger.value.getBoundingClientRect()
    const { offsetWidth, offsetHeight } = content.value

    // Find the beginning of the position of the menu item
    const startPositionLeft = rect.left - rootRect.left
    const startPositionTop = rect.top - rootRect.top

    // Aligning to specified alignment
    let posLeft = null
    let posTop = null
    switch (props.align) {
      case 'start':
        posLeft = startPositionLeft
        posTop = startPositionTop
        break
      case 'end':
        posLeft = startPositionLeft - offsetWidth + rect.width
        posTop = startPositionTop - offsetHeight + rect.height
        break
      default:
        // center
        posLeft = startPositionLeft - offsetWidth / 2 + rect.width / 2
        posTop = startPositionTop - offsetHeight / 2 + rect.height / 2
    }

    const screenOffset = 10

    // Do not let go of the left side of the screen
    if (posLeft + rootRect.left < screenOffset) {
      posLeft = screenOffset - rootRect.left
    }

    // Now also check the right side of the screen
    const rightOffset = posLeft + rootRect.left + offsetWidth
    if (rightOffset > bodyWidth - screenOffset) {
      posLeft -= rightOffset - bodyWidth + screenOffset

      // Recheck the left side of the screen
      if (posLeft < screenOffset - rootRect.left) {
        // Just set the menu to the full width of the screen
        posLeft = screenOffset - rootRect.left
      }
    }

    // Do not let go of the top side of the screen
    if (posTop + rootRect.top < screenOffset) {
      posTop = screenOffset - rootRect.top
    }

    // Now also check the bottom side of the screen
    const bottomOffset = posTop + rootRect.top + offsetHeight
    if (bottomOffset > bodyHeight - screenOffset) {
      posTop -= bottomOffset - bodyHeight + screenOffset

      // Recheck the top side of the screen
      if (posTop < screenOffset - rootRect.top) {
        // Just set the menu to the full height of the screen
        posTop = screenOffset - rootRect.top
      }
    }

    // Possible blurring font with decimal values
    posLeft = Math.round(posLeft)
    posTop = Math.round(posTop)

    position.value = {
      left: posLeft,
      top: posTop,
    }
  }
}

useResizeObserver(content, () => {
  if (content.value) {
    size.value = {
      width: content.value.offsetWidth,
      height: content.value.offsetHeight,
    }
    updatePosition()
  }
})

useResizeObserver([globalThis.document?.body, rootNavigationMenu], () => {
  updatePosition()
})
</script>

<template>
  <Presence
    v-slot="{ present }"
    :present="forceMount || open"
    :force-mount="!menuContext.unmountOnHide.value"
    @after-leave="() => {
      size = undefined
      position = undefined
    }"
  >
    <Primitive
      v-bind="$attrs"
      :ref="forwardRef"
      :as="as"
      :as-child="asChild"
      :data-state="getOpenState(open)"
      :data-orientation="menuContext.orientation"
      :style="{
        // Prevent interaction when animating out
        pointerEvents: !open && menuContext.isRootMenu ? 'none' : undefined,
        ['--reka-navigation-menu-viewport-width']: size ? `${size?.width}px` : undefined,
        ['--reka-navigation-menu-viewport-height']: size ? `${size?.height}px` : undefined,
        ['--reka-navigation-menu-viewport-left']: position ? `${position?.left}px` : undefined,
        ['--reka-navigation-menu-viewport-top']: position ? `${position?.top}px` : undefined,
      }"
      :hidden="!present"
      @pointerenter="menuContext.onContentEnter(menuContext.modelValue.value)"
      @pointerleave="whenMouse(() => menuContext.onContentLeave())($event)"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
