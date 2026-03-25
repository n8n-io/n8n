<script lang="ts">
export interface HoverCardTriggerProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import type { PopperAnchorProps } from '@/Popper'
import { PopperAnchor } from '@/Popper'
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectHoverCardRootContext } from './HoverCardRoot.vue'
import { excludeTouch } from './utils'

withDefaults(defineProps<HoverCardTriggerProps>(), {
  as: 'a',
})

const { forwardRef, currentElement } = useForwardExpose()
const rootContext = injectHoverCardRootContext()
rootContext.triggerElement = currentElement

function handleLeave() {
  setTimeout(() => {
    if (!rootContext.isPointerInTransitRef.value && !rootContext.open.value) {
      rootContext.onClose()
    }
  }, 0)
}
</script>

<template>
  <PopperAnchor
    as-child
    :reference="reference"
  >
    <Primitive
      :ref="forwardRef"
      :as-child="asChild"
      :as="as"
      :data-state="rootContext.open.value ? 'open' : 'closed'"
      data-grace-area-trigger
      @pointerenter="excludeTouch(rootContext.onOpen)($event)"
      @pointerleave="excludeTouch(handleLeave)($event)"
      @focus="rootContext.onOpen()"
      @blur="rootContext.onClose()"
    >
      <slot />
    </Primitive>
  </PopperAnchor>
</template>
