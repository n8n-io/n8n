<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface AspectRatioProps extends PrimitiveProps {
  /**
   * The desired ratio. Eg: 16/9
   * @defaultValue 1
   */
  ratio?: number
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<AspectRatioProps>(), {
  ratio: 1,
})
defineSlots<{
  default?: (props: {
    /** Current aspect ratio (in %) */
    aspect: typeof aspect.value
  }) => any
}>()

const { forwardRef } = useForwardExpose()

const aspect = computed(() => {
  return (1 / props.ratio) * 100
})
</script>

<template>
  <div
    :style="`position: relative; width: 100%; padding-bottom: ${aspect}%`"
    data-reka-aspect-ratio-wrapper
  >
    <Primitive
      :ref="forwardRef"
      :as-child="asChild"
      :as="as"
      style="position: absolute; inset: 0px"
      v-bind="$attrs"
    >
      <slot :aspect="aspect" />
    </Primitive>
  </div>
</template>
