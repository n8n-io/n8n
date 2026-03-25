<script setup lang="ts">
import type { DialogContentImplEmits, DialogContentImplProps } from './DialogContentImpl.vue'
import { useEmitAsProps, useForwardExpose, useHideOthers } from '@/shared'
import DialogContentImpl from './DialogContentImpl.vue'
import { injectDialogRootContext } from './DialogRoot.vue'

const props = defineProps<DialogContentImplProps>()
const emits = defineEmits<DialogContentImplEmits>()

const rootContext = injectDialogRootContext()

const emitsAsProps = useEmitAsProps(emits)

const { forwardRef, currentElement } = useForwardExpose()
useHideOthers(currentElement)
</script>

<template>
  <DialogContentImpl
    v-bind="{ ...props, ...emitsAsProps }"
    :ref="forwardRef"
    :trap-focus="rootContext.open.value"
    :disable-outside-pointer-events="true"
    @close-auto-focus="
      (event) => {
        if (!event.defaultPrevented) {
          event.preventDefault();
          rootContext.triggerElement.value?.focus();
        }
      }
    "
    @pointer-down-outside="
      (event) => {
        const originalEvent = event.detail.originalEvent;
        const ctrlLeftClick
          = originalEvent.button === 0 && originalEvent.ctrlKey === true;
        const isRightClick = originalEvent.button === 2 || ctrlLeftClick;

        // If the event is a right-click, we shouldn't close because
        // it is effectively as if we right-clicked the `Overlay`.
        if (isRightClick) event.preventDefault();
      }
    "
    @focus-outside="
      (event) => {
        // When focus is trapped, a `focusout` event may still happen.
        // We make sure we don't trigger our `onDismiss` in such case.
        event.preventDefault();
      }
    "
  >
    <slot />
  </DialogContentImpl>
</template>
