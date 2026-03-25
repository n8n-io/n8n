<script lang="ts">
import type { ToggleGroupItemProps } from '@/ToggleGroup'
import { useForwardExpose } from '@/shared'

export interface ToolbarToggleItemProps extends ToggleGroupItemProps {}
</script>

<script setup lang="ts">
import { ToggleGroupItem } from '@/ToggleGroup'
import ToolbarButton from './ToolbarButton.vue'

const props = defineProps<ToolbarToggleItemProps>()
const { forwardRef } = useForwardExpose()
</script>

<template>
  <ToolbarButton as-child>
    <ToggleGroupItem
      v-bind="props"
      :ref="forwardRef"
    >
      <slot />
    </ToggleGroupItem>
  </ToolbarButton>
</template>
