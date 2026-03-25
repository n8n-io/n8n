<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { nextTick, ref, watch } from 'vue'
import { useForwardExpose } from '@/shared'
import { injectTabsRootContext } from './TabsRoot.vue'

export interface TabsIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { Primitive } from '@/Primitive'

const props = defineProps<TabsIndicatorProps>()
const context = injectTabsRootContext()
useForwardExpose()

interface IndicatorStyle {
  size: number | null
  position: number | null
}
const activeTab = ref<HTMLElement | null>()
const indicatorStyle = ref<IndicatorStyle>({
  size: null,
  position: null,
})

watch(() => [context.modelValue.value, context?.dir.value], async () => {
  await nextTick()
  updateIndicatorStyle()
}, { immediate: true })

useResizeObserver([context.tabsList, activeTab], updateIndicatorStyle)

function updateIndicatorStyle() {
  activeTab.value = context.tabsList.value?.querySelector<HTMLButtonElement>('[role="tab"][data-state="active"]')

  if (!activeTab.value)
    return

  if (context.orientation.value === 'horizontal') {
    indicatorStyle.value = {
      size: activeTab.value.offsetWidth,
      position: activeTab.value.offsetLeft,
    }
  }
  else {
    indicatorStyle.value = {
      size: activeTab.value.offsetHeight,
      position: activeTab.value.offsetTop,
    }
  }
}
</script>

<template>
  <Primitive
    v-if="typeof indicatorStyle.size === 'number'"
    v-bind="props"
    :style="{
      '--reka-tabs-indicator-size': `${indicatorStyle.size}px`,
      '--reka-tabs-indicator-position': `${indicatorStyle.position}px`,
    }"
  >
    <slot />
  </Primitive>
</template>
