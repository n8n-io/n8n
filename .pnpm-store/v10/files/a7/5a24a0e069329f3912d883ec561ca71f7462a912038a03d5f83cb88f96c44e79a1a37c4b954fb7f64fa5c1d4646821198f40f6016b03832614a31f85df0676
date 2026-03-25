<script lang="ts">
import type { MenuSeparatorProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '@/Menu'

const props = defineProps<DropdownMenuSeparatorProps>()
useForwardExpose()
</script>

<template>
  <MenuSeparator v-bind="props">
    <slot />
  </MenuSeparator>
</template>
