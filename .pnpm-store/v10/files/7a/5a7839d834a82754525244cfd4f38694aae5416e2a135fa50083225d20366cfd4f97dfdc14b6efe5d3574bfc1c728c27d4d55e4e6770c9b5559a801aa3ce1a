<script lang="ts">
import type {
  MenuSubContentEmits,
  MenuSubContentProps,
} from '@/Menu'

export type ContextMenuSubContentEmits = MenuSubContentEmits
export interface ContextMenuSubContentProps extends MenuSubContentProps {}
</script>

<script setup lang="ts">
import { MenuSubContent } from '@/Menu'
import { useForwardExpose, useForwardPropsEmits } from '@/shared'

const props = defineProps<ContextMenuSubContentProps>()

const emits = defineEmits<ContextMenuSubContentEmits>()
const forwarded = useForwardPropsEmits(props, emits)
useForwardExpose()
</script>

<template>
  <MenuSubContent
    v-bind="forwarded"
    :style="{
      '--reka-context-menu-content-transform-origin':
        'var(--reka-popper-transform-origin)',
      '--reka-context-menu-content-available-width':
        'var(--reka-popper-available-width)',
      '--reka-context-menu-content-available-height':
        'var(--reka-popper-available-height)',
      '--reka-context-menu-trigger-width': 'var(--reka-popper-anchor-width)',
      '--reka-context-menu-trigger-height':
        'var(--reka-popper-anchor-height)',
    }"
  >
    <slot />
  </MenuSubContent>
</template>
