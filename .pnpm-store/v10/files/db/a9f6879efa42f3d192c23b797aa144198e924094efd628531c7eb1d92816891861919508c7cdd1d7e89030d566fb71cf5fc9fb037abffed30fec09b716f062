<script lang="ts">
import type { MenuArrowProps } from '@/Menu'
import { useForwardExpose } from '@/shared'

export interface ContextMenuArrowProps extends MenuArrowProps {}
</script>

<script setup lang="ts">
import { MenuArrow } from '@/Menu'

const props = withDefaults(defineProps<ContextMenuArrowProps>(), {
  width: 10,
  height: 5,
  as: 'svg',
})

useForwardExpose()
</script>

<template>
  <MenuArrow v-bind="props">
    <slot />
  </MenuArrow>
</template>
