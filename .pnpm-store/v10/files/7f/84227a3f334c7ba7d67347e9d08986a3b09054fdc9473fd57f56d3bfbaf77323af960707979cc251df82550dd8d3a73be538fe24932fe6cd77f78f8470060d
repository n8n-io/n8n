<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface TabsListProps extends PrimitiveProps {
  /** When `true`, keyboard navigation will loop from last tab to first, and vice versa. */
  loop?: boolean
}
</script>

<script setup lang="ts">
import { toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { RovingFocusGroup } from '@/RovingFocus'
import { injectTabsRootContext } from './TabsRoot.vue'

const props = withDefaults(defineProps<TabsListProps>(), {
  loop: true,
})
const { loop } = toRefs(props)

const { forwardRef, currentElement } = useForwardExpose()
const context = injectTabsRootContext()

context.tabsList = currentElement
</script>

<template>
  <RovingFocusGroup
    as-child
    :orientation="context.orientation.value"
    :dir="context.dir.value"
    :loop="loop"
  >
    <Primitive
      :ref="forwardRef"
      role="tablist"
      :as-child="asChild"
      :as="as"
      :aria-orientation="context.orientation.value"
    >
      <slot />
    </Primitive>
  </RovingFocusGroup>
</template>
