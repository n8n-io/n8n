<script lang="ts">
import type {
  ToggleGroupRootEmits,
  ToggleGroupRootProps,
} from '@/ToggleGroup'

export type ToolbarToggleGroupEmits = ToggleGroupRootEmits

export interface ToolbarToggleGroupProps extends ToggleGroupRootProps {}
</script>

<script setup lang="ts">
import { useEmitAsProps, useForwardExpose } from '@/shared'
import { ToggleGroupRoot } from '@/ToggleGroup'
import { injectToolbarRootContext } from './ToolbarRoot.vue'

const props = defineProps<ToolbarToggleGroupProps>()
const emits = defineEmits<ToolbarToggleGroupEmits>()

const rootContext = injectToolbarRootContext()

const emitsAsProps = useEmitAsProps(emits)
useForwardExpose()
</script>

<template>
  <ToggleGroupRoot
    v-bind="{ ...props, ...emitsAsProps }"
    :data-orientation="rootContext.orientation.value"
    :dir="rootContext.dir.value"
    :roving-focus="false"
  >
    <slot />
  </ToggleGroupRoot>
</template>
