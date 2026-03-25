<script lang="ts">
import type {
  MenuRadioItemEmits,
  MenuRadioItemProps,
} from '@/Menu'

export type MenubarRadioItemEmits = MenuRadioItemEmits

export interface MenubarRadioItemProps extends MenuRadioItemProps {}
</script>

<script setup lang="ts">
import { MenuRadioItem } from '@/Menu'
import { useForwardExpose, useForwardPropsEmits } from '@/shared'

const props = defineProps<MenuRadioItemProps>()
const emits = defineEmits<MenuRadioItemEmits>()

const forwarded = useForwardPropsEmits(props, emits)
useForwardExpose()
</script>

<template>
  <MenuRadioItem v-bind="forwarded">
    <slot />
  </MenuRadioItem>
</template>
