<script lang="ts">
import type {
  DialogContentImplEmits,
  DialogContentImplProps,
} from './DialogContentImpl.vue'

export type DialogContentEmits = DialogContentImplEmits

export interface DialogContentProps extends Omit<DialogContentImplProps, 'trapFocus'> {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { Presence } from '@/Presence'
import { useEmitAsProps, useForwardExpose } from '@/shared'
import DialogContentModal from './DialogContentModal.vue'
import DialogContentNonModal from './DialogContentNonModal.vue'
import { injectDialogRootContext } from './DialogRoot.vue'

const props = defineProps<DialogContentProps>()
const emits = defineEmits<DialogContentEmits>()

const rootContext = injectDialogRootContext()

const emitsAsProps = useEmitAsProps(emits)
const { forwardRef } = useForwardExpose()
</script>

<template>
  <Presence :present="forceMount || rootContext.open.value">
    <DialogContentModal
      v-if="rootContext.modal.value"
      :ref="forwardRef"
      v-bind="{ ...props, ...emitsAsProps, ...$attrs }"
    >
      <slot />
    </DialogContentModal>
    <DialogContentNonModal
      v-else
      :ref="forwardRef"
      v-bind="{ ...props, ...emitsAsProps, ...$attrs }"
    >
      <slot />
    </DialogContentNonModal>
  </Presence>
</template>
