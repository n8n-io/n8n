<script setup lang="ts">
import type { TooltipContentImplProps } from './TooltipContentImpl.vue'
import { useForwardExpose, useForwardProps, useGraceArea } from '@/shared'
import TooltipContentImpl from './TooltipContentImpl.vue'
import { injectTooltipProviderContext } from './TooltipProvider.vue'
import { injectTooltipRootContext } from './TooltipRoot.vue'

const props = defineProps<TooltipContentImplProps>()
const forwardedProps = useForwardProps(props)
const { forwardRef, currentElement } = useForwardExpose()

const { trigger, onClose } = injectTooltipRootContext()
const providerContext = injectTooltipProviderContext()

const { isPointerInTransit, onPointerExit } = useGraceArea(trigger, currentElement)

providerContext.isPointerInTransitRef = isPointerInTransit
onPointerExit(() => {
  onClose()
})
</script>

<template>
  <TooltipContentImpl
    :ref="forwardRef"
    v-bind="forwardedProps"
  >
    <slot />
  </TooltipContentImpl>
</template>
