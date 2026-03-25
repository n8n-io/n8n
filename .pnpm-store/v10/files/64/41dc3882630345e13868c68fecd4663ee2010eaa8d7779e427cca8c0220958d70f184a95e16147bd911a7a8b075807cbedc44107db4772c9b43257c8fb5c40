<script lang="ts">
import type { MenuPortalProps } from '@/Menu'

export interface DropdownMenuPortalProps extends MenuPortalProps {}
</script>

<script setup lang="ts">
import { MenuPortal } from '@/Menu'

const props = defineProps<DropdownMenuPortalProps>()
</script>

<template>
  <MenuPortal v-bind="props">
    <slot />
  </MenuPortal>
</template>
