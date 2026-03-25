<script lang="ts">
import type {
  MenuRadioItemEmits,
  MenuRadioItemProps,
} from '@/Menu'
import { useForwardExpose, useForwardPropsEmits } from '@/shared'

export type DropdownMenuRadioItemEmits = MenuRadioItemEmits

export interface DropdownMenuRadioItemProps extends MenuRadioItemProps {}
</script>

<script setup lang="ts">
import { MenuRadioItem } from '@/Menu'

const props = defineProps<DropdownMenuRadioItemProps>()
const emits = defineEmits<DropdownMenuRadioItemEmits>()

const forwarded = useForwardPropsEmits(props, emits)
useForwardExpose()
</script>

<template>
  <MenuRadioItem v-bind="forwarded">
    <slot />
  </MenuRadioItem>
</template>
