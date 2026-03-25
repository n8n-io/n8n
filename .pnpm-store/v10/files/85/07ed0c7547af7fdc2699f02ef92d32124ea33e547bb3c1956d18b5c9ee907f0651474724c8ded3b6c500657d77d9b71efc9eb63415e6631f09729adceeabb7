<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface SliderRangeProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectSliderRootContext } from './SliderRoot.vue'
import { convertValueToPercentage, injectSliderOrientationContext } from './utils'

withDefaults(defineProps<SliderRangeProps>(), { as: 'span' })
const rootContext = injectSliderRootContext()
const orientation = injectSliderOrientationContext()

useForwardExpose()
const percentages = computed(() => rootContext.currentModelValue.value.map(value =>
  convertValueToPercentage(value, rootContext.min.value, rootContext.max.value),
))

const offsetStart = computed(() => rootContext.currentModelValue.value.length > 1 ? Math.min(...percentages.value!) : 0)
const offsetEnd = computed(() => 100 - Math.max(...percentages.value, 0))
</script>

<template>
  <Primitive
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :data-orientation="rootContext.orientation.value"
    :as-child="asChild"
    :as="as"
    :style="{
      [orientation!.startEdge.value]: `${offsetStart}%`,
      [orientation!.endEdge.value]: `${offsetEnd}%`,
    }"
  >
    <slot />
  </Primitive>
</template>
