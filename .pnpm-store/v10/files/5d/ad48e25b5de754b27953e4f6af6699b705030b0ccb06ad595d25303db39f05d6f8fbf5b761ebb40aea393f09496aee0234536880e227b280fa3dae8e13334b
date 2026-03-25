<script lang="ts">
import type {
  MenuItemEmits,
  MenuRadioItemProps,
} from '@/Menu'

export type ContextMenuRadioItemEmits = MenuItemEmits

export interface ContextMenuRadioItemProps extends MenuRadioItemProps {}
</script>

<script setup lang="ts">
import { MenuRadioItem } from '@/Menu'
import { useEmitAsProps, useForwardExpose } from '@/shared'

const props = defineProps<ContextMenuRadioItemProps>()
const emits = defineEmits<ContextMenuRadioItemEmits>()

const emitsAsProps = useEmitAsProps(emits)
useForwardExpose()
</script>

<template>
  <MenuRadioItem v-bind="{ ...props, ...emitsAsProps }">
    <slot />
  </MenuRadioItem>
</template>
