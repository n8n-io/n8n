<script lang="ts">
import type { MenuItemIndicatorProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface MenubarItemIndicatorProps extends MenuItemIndicatorProps {}
</script>

<script setup lang="ts">
import { MenuItemIndicator } from '@/Menu'

const props = defineProps<MenubarItemIndicatorProps>()
useForwardExpose()
</script>

<template>
  <MenuItemIndicator v-bind="props">
    <slot />
  </MenuItemIndicator>
</template>
