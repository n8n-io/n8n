<script lang="ts">
import type {
  DismissableLayerEmits,
  DismissableLayerProps,
} from '@/DismissableLayer'
import type { FocusScopeProps } from '@/FocusScope'
import type { PopperContentProps } from '@/Popper'
import { reactiveOmit } from '@vueuse/shared'

export type PopoverContentImplEmits = DismissableLayerEmits & {
  /**
   * Event handler called when auto-focusing on open.
   * Can be prevented.
   */
  openAutoFocus: [event: Event]
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  closeAutoFocus: [event: Event]
}

export interface PopoverContentImplProps extends PopperContentProps, DismissableLayerProps {}

interface PopoverContentImplPrivateProps extends PopoverContentImplProps {
  /**
   * Whether focus should be trapped within the `MenuContent`
   * @defaultValue false
   */
  trapFocus?: FocusScopeProps['trapped']
}
</script>

<script setup lang="ts">
import { DismissableLayer } from '@/DismissableLayer'
import { FocusScope } from '@/FocusScope'
import { PopperContent } from '@/Popper'
import { useFocusGuards, useForwardExpose, useForwardProps } from '@/shared'
import { injectPopoverRootContext } from './PopoverRoot.vue'

const props = defineProps<PopoverContentImplPrivateProps>()
const emits = defineEmits<PopoverContentImplEmits>()

const forwarded = useForwardProps(reactiveOmit(props, 'trapFocus', 'disableOutsidePointerEvents'))
const { forwardRef } = useForwardExpose()

const rootContext = injectPopoverRootContext()
useFocusGuards()
</script>

<template>
  <FocusScope
    as-child
    loop
    :trapped="trapFocus"
    @mount-auto-focus="emits('openAutoFocus', $event)"
    @unmount-auto-focus="emits('closeAutoFocus', $event)"
  >
    <DismissableLayer
      as-child
      :disable-outside-pointer-events="disableOutsidePointerEvents"
      @pointer-down-outside="emits('pointerDownOutside', $event)"
      @interact-outside="emits('interactOutside', $event)"
      @escape-key-down="emits('escapeKeyDown', $event)"
      @focus-outside="emits('focusOutside', $event)"
      @dismiss="rootContext.onOpenChange(false)"
    >
      <PopperContent
        v-bind="forwarded"
        :id="rootContext.contentId"
        :ref="forwardRef"
        :data-state="rootContext.open.value ? 'open' : 'closed'"
        :aria-labelledby="rootContext.triggerId"
        :style="{
          '--reka-popover-content-transform-origin':
            'var(--reka-popper-transform-origin)',
          '--reka-popover-content-available-width':
            'var(--reka-popper-available-width)',
          '--reka-popover-content-available-height':
            'var(--reka-popper-available-height)',
          '--reka-popover-trigger-width': 'var(--reka-popper-anchor-width)',
          '--reka-popover-trigger-height': 'var(--reka-popper-anchor-height)',
        }"
        role="dialog"
      >
        <slot />
      </PopperContent>
    </DismissableLayer>
  </FocusScope>
</template>
