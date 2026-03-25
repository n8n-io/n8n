<script lang="ts">
import type { MenuSeparatorProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface MenubarSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '@/Menu'

const props = defineProps<MenubarSeparatorProps>()
useForwardExpose()
</script>

<template>
  <MenuSeparator v-bind="props">
    <slot />
  </MenuSeparator>
</template>
