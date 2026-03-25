<script lang="ts">
import type { MenuSubTriggerProps } from '@/Menu'

export interface ContextMenuSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '@/Menu'
import { useForwardExpose } from '@/shared'

const props = defineProps<ContextMenuSubTriggerProps>()
useForwardExpose()
</script>

<template>
  <MenuSubTrigger v-bind="props">
    <slot />
  </MenuSubTrigger>
</template>
