<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface ToolbarButtonProps extends PrimitiveProps {
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { RovingFocusItem } from '@/RovingFocus'

const props = withDefaults(defineProps<ToolbarButtonProps>(), { as: 'button' })
const { forwardRef } = useForwardExpose()
</script>

<template>
  <RovingFocusItem
    as-child
    :focusable="!disabled"
  >
    <Primitive
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      v-bind="props"
    >
      <slot />
    </Primitive>
  </RovingFocusItem>
</template>
