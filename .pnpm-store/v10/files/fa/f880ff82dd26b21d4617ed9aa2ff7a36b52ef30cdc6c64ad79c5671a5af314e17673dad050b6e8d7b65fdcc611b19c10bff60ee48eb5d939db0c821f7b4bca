<script lang="ts">
import type { MenuLabelProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface DropdownMenuLabelProps extends MenuLabelProps {}
</script>

<script setup lang="ts">
import { MenuLabel } from '@/Menu'

const props = defineProps<DropdownMenuLabelProps>()
useForwardExpose()
</script>

<template>
  <MenuLabel v-bind="props">
    <slot />
  </MenuLabel>
</template>
