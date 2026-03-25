<script lang="ts">
import type { DialogOverlayImplProps } from './DialogOverlayImpl.vue'
import { useForwardExpose } from '@/shared'
import DialogOverlayImpl from './DialogOverlayImpl.vue'

export interface DialogOverlayProps extends DialogOverlayImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { Presence } from '@/Presence'
import { injectDialogRootContext } from './DialogRoot.vue'

defineProps<DialogOverlayProps>()
const rootContext = injectDialogRootContext()

const { forwardRef } = useForwardExpose()
</script>

<template>
  <Presence
    v-if="rootContext?.modal.value"
    :present="forceMount || rootContext.open.value"
  >
    <DialogOverlayImpl
      v-bind="$attrs"
      :ref="forwardRef"
      :as="as"
      :as-child="asChild"
    >
      <slot />
    </DialogOverlayImpl>
  </Presence>
</template>
