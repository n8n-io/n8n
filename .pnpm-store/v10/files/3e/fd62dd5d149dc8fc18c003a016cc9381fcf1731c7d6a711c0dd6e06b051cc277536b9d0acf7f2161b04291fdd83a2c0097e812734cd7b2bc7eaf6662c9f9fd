<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface RadioGroupIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { Presence } from '@/Presence'
import { Primitive } from '@/Primitive'
import { injectRadioGroupItemContext } from './RadioGroupItem.vue'

withDefaults(defineProps<RadioGroupIndicatorProps>(), {
  as: 'span',
})

const { forwardRef } = useForwardExpose()
const itemContext = injectRadioGroupItemContext()
</script>

<template>
  <Presence
    :present="forceMount || itemContext.checked.value"
  >
    <Primitive
      :ref="forwardRef"
      :data-state="itemContext.checked.value ? 'checked' : 'unchecked'"
      :data-disabled="itemContext.disabled.value ? '' : undefined"
      :as-child="asChild"
      :as="as"
      v-bind="$attrs"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
