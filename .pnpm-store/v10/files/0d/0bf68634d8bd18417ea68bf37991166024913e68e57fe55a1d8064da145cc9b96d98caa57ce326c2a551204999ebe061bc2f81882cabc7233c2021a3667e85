<script lang="ts">
import type { MenuSeparatorProps } from '@/Menu'

export interface ContextMenuSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '@/Menu'
import { useForwardExpose } from '@/shared'

const props = defineProps<ContextMenuSeparatorProps>()
useForwardExpose()
</script>

<template>
  <MenuSeparator v-bind="props">
    <slot />
  </MenuSeparator>
</template>
