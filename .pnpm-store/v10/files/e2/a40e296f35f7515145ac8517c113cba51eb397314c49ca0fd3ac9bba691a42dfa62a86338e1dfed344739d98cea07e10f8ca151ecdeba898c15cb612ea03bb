<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface NavigationMenuIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { computed, ref, watchEffect } from 'vue'
import { Presence } from '@/Presence'
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectNavigationMenuContext } from './NavigationMenuRoot.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<NavigationMenuIndicatorProps>()

const { forwardRef } = useForwardExpose()
const menuContext = injectNavigationMenuContext()

const indicatorStyle = ref<{ size: number, position: number }>()
const isHorizontal = computed(() => menuContext.orientation === 'horizontal')
const isVisible = computed(() => !!menuContext.modelValue.value)
const { activeTrigger } = menuContext

function handlePositionChange() {
  if (!activeTrigger.value) {
    return
  }

  indicatorStyle.value = {
    size: isHorizontal.value
      ? activeTrigger.value.offsetWidth
      : activeTrigger.value.offsetHeight,
    position: isHorizontal.value
      ? activeTrigger.value.offsetLeft
      : activeTrigger.value.offsetTop,
  }
}

watchEffect(() => {
  if (!menuContext.modelValue.value) {
    return
  }
  handlePositionChange()
})

useResizeObserver(activeTrigger, handlePositionChange)
useResizeObserver(menuContext.indicatorTrack, handlePositionChange)
</script>

<template>
  <Teleport
    v-if="menuContext.indicatorTrack.value"
    :to="menuContext.indicatorTrack.value"
  >
    <Presence :present="forceMount || isVisible">
      <Primitive
        :ref="forwardRef"
        aria-hidden="true"
        :data-state="isVisible ? 'visible' : 'hidden'"
        :data-orientation="menuContext.orientation"
        :as-child="props.asChild"
        :as="as"
        :style="{
          ...(indicatorStyle ? {
            '--reka-navigation-menu-indicator-size': `${indicatorStyle.size}px`,
            '--reka-navigation-menu-indicator-position': `${indicatorStyle.position}px`,
          } : {}),
        }"
        v-bind="$attrs"
      >
        <slot />
      </Primitive>
    </Presence>
  </Teleport>
</template>
