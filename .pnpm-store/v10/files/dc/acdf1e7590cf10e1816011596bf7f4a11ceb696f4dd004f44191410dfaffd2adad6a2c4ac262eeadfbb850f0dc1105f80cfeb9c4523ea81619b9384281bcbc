<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '@/Menu'

export type ContextMenuItemEmits = MenuItemEmits

export interface ContextMenuItemProps extends MenuItemProps {}
</script>

<script setup lang="ts">
import { MenuItem } from '@/Menu'
import { useEmitAsProps, useForwardExpose } from '@/shared'

const props = defineProps<MenuItemProps>()
const emits = defineEmits<MenuItemEmits>()

const emitsAsProps = useEmitAsProps(emits)
useForwardExpose()
</script>

<template>
  <MenuItem v-bind="{ ...props, ...emitsAsProps }">
    <slot />
  </MenuItem>
</template>
