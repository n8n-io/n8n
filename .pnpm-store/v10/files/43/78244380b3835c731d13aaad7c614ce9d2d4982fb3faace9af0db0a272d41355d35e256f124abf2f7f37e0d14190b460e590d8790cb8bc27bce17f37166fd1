<script lang="ts">
import type { MenuLabelProps } from '@/Menu'

export interface ContextMenuLabelProps extends MenuLabelProps {}
</script>

<script setup lang="ts">
import { MenuLabel } from '@/Menu'
import { useForwardExpose } from '@/shared'

const props = defineProps<ContextMenuLabelProps>()
useForwardExpose()
</script>

<template>
  <MenuLabel v-bind="props">
    <slot />
  </MenuLabel>
</template>
