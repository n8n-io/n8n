<script lang="ts">
import type { ReferenceElement } from '@floating-ui/vue'
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface PopperAnchorProps extends PrimitiveProps {
  /**
   *  The reference (or anchor) element that is being referred to for positioning.
   *
   *  If not provided will use the current component as anchor.
   */
  reference?: ReferenceElement
}
</script>

<script setup lang="ts">
import { watchPostEffect } from 'vue'
import {
  Primitive,
} from '@/Primitive'
import { injectPopperRootContext } from './PopperRoot.vue'

const props = defineProps<PopperAnchorProps>()

const { forwardRef, currentElement } = useForwardExpose()

const rootContext = injectPopperRootContext()

watchPostEffect(() => {
  rootContext.onAnchorChange(props.reference ?? currentElement.value)
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
  >
    <slot />
  </Primitive>
</template>
