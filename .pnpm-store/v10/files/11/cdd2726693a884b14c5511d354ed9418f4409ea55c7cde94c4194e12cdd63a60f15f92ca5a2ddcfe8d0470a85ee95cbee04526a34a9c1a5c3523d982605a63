<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface SliderTrackProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectSliderRootContext } from './SliderRoot.vue'

withDefaults(defineProps<SliderTrackProps>(), { as: 'span' })

const rootContext = injectSliderRootContext()

useForwardExpose()
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :data-orientation="rootContext.orientation.value"
  >
    <slot />
  </Primitive>
</template>
