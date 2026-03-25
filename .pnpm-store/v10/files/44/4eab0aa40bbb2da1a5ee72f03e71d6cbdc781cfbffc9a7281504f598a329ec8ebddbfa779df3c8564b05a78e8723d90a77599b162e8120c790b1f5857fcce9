<script lang="ts">
import type { MenuGroupProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface DropdownMenuGroupProps extends MenuGroupProps {}
</script>

<script setup lang="ts">
import { MenuGroup } from '@/Menu'

const props = defineProps<DropdownMenuGroupProps>()
useForwardExpose()
</script>

<template>
  <MenuGroup v-bind="props">
    <slot />
  </MenuGroup>
</template>
