<script lang="ts">
import type { PopperArrowProps } from '@/Popper'
import { useForwardExpose } from '@/shared'

export interface HoverCardArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '@/Popper'

const props = withDefaults(defineProps<HoverCardArrowProps>(), {
  width: 10,
  height: 5,
  as: 'svg',
})
useForwardExpose()
</script>

<template>
  <PopperArrow v-bind="props">
    <slot />
  </PopperArrow>
</template>
