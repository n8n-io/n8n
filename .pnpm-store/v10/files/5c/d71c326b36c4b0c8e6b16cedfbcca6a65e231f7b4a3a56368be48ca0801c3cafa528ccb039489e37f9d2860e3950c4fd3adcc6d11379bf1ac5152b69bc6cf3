<script setup lang="ts">
import type { PopoverContentImplEmits, PopoverContentImplProps } from './PopoverContentImpl.vue'
import { ref } from 'vue'
import { useForwardPropsEmits } from '@/shared'
import PopoverContentImpl from './PopoverContentImpl.vue'
import { injectPopoverRootContext } from './PopoverRoot.vue'

const props = defineProps<PopoverContentImplProps>()
const emits = defineEmits<PopoverContentImplEmits>()
const rootContext = injectPopoverRootContext()
const hasInteractedOutsideRef = ref(false)
const hasPointerDownOutsideRef = ref(false)

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <PopoverContentImpl
    v-bind="forwarded"
    :trap-focus="false"
    :disable-outside-pointer-events="false"
    @close-auto-focus="
      (event) => {
        emits('closeAutoFocus', event);

        if (!event.defaultPrevented) {
          if (!hasInteractedOutsideRef) rootContext.triggerElement.value?.focus();
          // Always prevent auto focus because we either focus manually or want user agent focus
          event.preventDefault();
        }

        hasInteractedOutsideRef = false;
        hasPointerDownOutsideRef = false;
      }
    "
    @interact-outside="
      async (event) => {
        emits('interactOutside', event);

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
        if (
          event.detail.originalEvent.type === 'focusin'
          && hasPointerDownOutsideRef
        ) {
          event.preventDefault();
        }
      }
    "
  >
    <slot />
  </PopoverContentImpl>
</template>
