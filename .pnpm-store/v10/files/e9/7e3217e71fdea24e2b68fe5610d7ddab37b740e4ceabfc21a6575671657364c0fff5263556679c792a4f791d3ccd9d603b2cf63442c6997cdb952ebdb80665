<script setup lang="ts">
import type { DialogContentImplEmits, DialogContentImplProps } from './DialogContentImpl.vue'
import { ref } from 'vue'
import { useEmitAsProps, useForwardExpose } from '@/shared'
import DialogContentImpl from './DialogContentImpl.vue'
import { injectDialogRootContext } from './DialogRoot.vue'

const props = defineProps<DialogContentImplProps>()
const emits = defineEmits<DialogContentImplEmits>()

const emitsAsProps = useEmitAsProps(emits)
useForwardExpose()

const rootContext = injectDialogRootContext()
const hasInteractedOutsideRef = ref(false)
const hasPointerDownOutsideRef = ref(false)
</script>

<template>
  <DialogContentImpl
    v-bind="{ ...props, ...emitsAsProps }"
    :trap-focus="false"
    :disable-outside-pointer-events="false"
    @close-auto-focus="
      (event) => {
        if (!event.defaultPrevented) {
          if (!hasInteractedOutsideRef) rootContext.triggerElement.value?.focus();
          // Always prevent auto focus because we either focus manually or want user agent focus
          event.preventDefault();
        }

        hasInteractedOutsideRef = false;
        hasPointerDownOutsideRef = false;
      }
    "
    @interact-outside="(event) => {
      if (!event.defaultPrevented) {
        hasInteractedOutsideRef = true;
        if (event.detail.originalEvent.type === 'pointerdown') {
          hasPointerDownOutsideRef = true;
        }
      }

      // Prevent dismissing when clicking the trigger.
      // As the trigger is already setup to close, without doing so would
      // cause it to close and immediately open.
      const target = event.target as HTMLElement;
      const targetIsTrigger = rootContext.triggerElement.value?.contains(target);
      if (targetIsTrigger) event.preventDefault();

      // On Safari if the trigger is inside a container with tabIndex={0}, when clicked
      // we will get the pointer down outside event on the trigger, but then a subsequent
      // focus outside event on the container, we ignore any focus outside event when we've
      // already had a pointer down outside event.
      if (event.detail.originalEvent.type === 'focusin' && hasPointerDownOutsideRef) {
        event.preventDefault();
      }
    }"
  >
    <slot />
  </DialogContentImpl>
</template>
