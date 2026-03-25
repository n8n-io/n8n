<script lang="ts">
import type { TooltipContentImplEmits, TooltipContentImplProps } from './TooltipContentImpl.vue'

export type TooltipContentEmits = TooltipContentImplEmits

export interface TooltipContentProps extends TooltipContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { Presence } from '@/Presence'
import { useForwardExpose, useForwardPropsEmits } from '@/shared'
import TooltipContentHoverable from './TooltipContentHoverable.vue'
import TooltipContentImpl from './TooltipContentImpl.vue'
import { injectTooltipRootContext } from './TooltipRoot.vue'

const props = withDefaults(defineProps<TooltipContentProps>(), {
  side: 'top',
})
const emits = defineEmits<TooltipContentEmits>()

const rootContext = injectTooltipRootContext()
const forwarded = useForwardPropsEmits(props, emits)
const { forwardRef } = useForwardExpose()
</script>

<template>
  <Presence :present="forceMount || rootContext.open.value">
    <component
      :is="rootContext.disableHoverableContent.value ? TooltipContentImpl : TooltipContentHoverable"
      :ref="forwardRef"
      v-bind="forwarded"
    >
      <slot />
    </component>
  </Presence>
</template>
