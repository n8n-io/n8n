<script lang="ts">
import type { MenuSubTriggerProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface MenubarSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '@/Menu'

const props = defineProps<MenubarSubTriggerProps>()
useForwardExpose()
</script>

<template>
  <MenuSubTrigger
    v-bind="props"
    data-reka-menubar-subtrigger=""
  >
    <slot />
  </MenuSubTrigger>
</template>
