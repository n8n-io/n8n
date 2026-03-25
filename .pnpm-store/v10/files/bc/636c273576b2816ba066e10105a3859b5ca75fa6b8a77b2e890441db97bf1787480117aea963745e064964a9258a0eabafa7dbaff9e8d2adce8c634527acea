<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { DataOrientation, Direction } from '@/shared/types'
import { createContext, useDirection, useForwardExpose } from '@/shared'

export interface ToolbarRootProps extends PrimitiveProps {
  /** The orientation of the toolbar */
  orientation?: DataOrientation
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** When `true`, keyboard navigation will loop from last tab to first, and vice versa. */
  loop?: boolean
}

export interface ToolbarRootContext {
  orientation: Ref<DataOrientation>
  dir: Ref<Direction>
}

export const [injectToolbarRootContext, provideToolbarRootContext]
  = createContext<ToolbarRootContext>('ToolbarRoot')
</script>

<script setup lang="ts">
import { toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { RovingFocusGroup } from '@/RovingFocus'

const props = withDefaults(defineProps<ToolbarRootProps>(), {
  orientation: 'horizontal',
})
const { orientation, dir: propDir } = toRefs(props)
const dir = useDirection(propDir)
const { forwardRef } = useForwardExpose()

provideToolbarRootContext({ orientation, dir })
</script>

<template>
  <RovingFocusGroup
    as-child
    :orientation="orientation"
    :dir="dir"
    :loop="loop"
  >
    <Primitive
      :ref="forwardRef"
      role="toolbar"
      :aria-orientation="orientation"
      :as-child="asChild"
      :as="as"
    >
      <slot />
    </Primitive>
  </RovingFocusGroup>
</template>
