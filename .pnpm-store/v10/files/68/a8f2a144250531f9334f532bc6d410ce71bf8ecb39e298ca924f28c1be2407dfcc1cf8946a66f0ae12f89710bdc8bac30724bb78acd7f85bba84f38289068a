<script lang="ts">
import type { PopperContentProps } from '@/Popper'

export interface SelectPopperPositionProps extends PopperContentProps {}
</script>

<script setup lang="ts">
import { PopperContent } from '@/Popper'
import { useForwardProps } from '..'
import { CONTENT_MARGIN } from './utils'

const props = withDefaults(defineProps<SelectPopperPositionProps>(), {
  align: 'start',
  collisionPadding: CONTENT_MARGIN,
})
const forwarded = useForwardProps(props)
</script>

<template>
  <PopperContent
    v-bind="forwarded"
    :style="{
      // Ensure border-box for floating-ui calculations
      'boxSizing': 'border-box',
      '--reka-select-content-transform-origin':
        'var(--reka-popper-transform-origin)',
      '--reka-select-content-available-width':
        'var(--reka-popper-available-width)',
      '--reka-select-content-available-height':
        'var(--reka-popper-available-height)',
      '--reka-select-trigger-width': 'var(--reka-popper-anchor-width)',
      '--reka-select-trigger-height': 'var(--reka-popper-anchor-height)',
    }"
  >
    <slot />
  </PopperContent>
</template>
