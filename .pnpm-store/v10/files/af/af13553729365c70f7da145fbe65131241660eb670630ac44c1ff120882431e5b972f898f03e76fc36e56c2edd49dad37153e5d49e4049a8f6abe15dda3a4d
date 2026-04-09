<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface ColorSliderThumbProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { getChannelName } from '@/shared/color'
import { SliderThumb } from '@/Slider'
import { injectColorSliderRootContext } from './ColorSliderRoot.vue'

const props = withDefaults(defineProps<ColorSliderThumbProps>(), {
  as: 'span',
})

defineSlots<{
  default?: (props: {
    /** The display name of the current channel */
    channelName: string
    /** The current numeric value of the channel */
    channelValue: number
  }) => any
}>()

const rootContext = injectColorSliderRootContext()

const ariaLabel = computed(() => {
  return getChannelName(rootContext.channel.value)
})

const ariaValueText = computed(() => {
  const value = rootContext.channelValue.value
  const channel = rootContext.channel.value
  if (channel === 'alpha') {
    return `${Math.round(value)}%`
  }
  return String(Math.round(value))
})
</script>

<template>
  <SliderThumb
    :as="as"
    :as-child="asChild"
    :aria-label="ariaLabel"
    :aria-valuetext="ariaValueText"
  >
    <slot
      :channel-name="ariaLabel"
      :channel-value="rootContext.channelValue.value"
    />
  </SliderThumb>
</template>
