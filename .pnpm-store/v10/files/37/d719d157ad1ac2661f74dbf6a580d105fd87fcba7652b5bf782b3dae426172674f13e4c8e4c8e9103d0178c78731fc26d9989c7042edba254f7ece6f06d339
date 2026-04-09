<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface ColorSliderTrackProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { getSliderBackgroundStyle } from '@/shared/color'
import { SliderTrack } from '@/Slider'
import { injectColorSliderRootContext } from './ColorSliderRoot.vue'

const props = withDefaults(defineProps<ColorSliderTrackProps>(), {
  as: 'span',
})

const rootContext = injectColorSliderRootContext()

const backgroundStyle = computed(() => {
  return getSliderBackgroundStyle(
    rootContext.color.value,
    rootContext.channel.value,
    rootContext.colorSpace.value,
  )
})
</script>

<template>
  <SliderTrack
    :as="as"
    :as-child="asChild"
    :style="backgroundStyle"
  >
    <slot />
  </SliderTrack>
</template>
