<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '../useForwardExpose'

export interface ArrowProps extends PrimitiveProps {
  /**
   * The width of the arrow in pixels.
   *
   * @defaultValue 10
   */
  width?: number
  /**
   * The height of the arrow in pixels.
   *
   * @defaultValue 5
   */
  height?: number
  /**
   * When `true`, render the rounded version of arrow. Do not work with `as`/`asChild`
   *
   * @defaultValue false
   */
  rounded?: boolean
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<ArrowProps>(), {
  width: 10,
  height: 5,
  as: 'svg',
})

useForwardExpose()
</script>

<template>
  <Primitive
    v-bind="props"
    :width="width"
    :height="height"
    :viewBox="asChild ? undefined : '0 0 12 6'"
    :preserveAspectRatio="asChild ? undefined : 'none'"
  >
    <slot>
      <path
        v-if="!rounded"
        d="M0 0L6 6L12 0"
      />
      <path
        v-else
        d="M0 0L4.58579 4.58579C5.36683 5.36683 6.63316 5.36684 7.41421 4.58579L12 0"
      />
    </slot>
  </Primitive>
</template>
