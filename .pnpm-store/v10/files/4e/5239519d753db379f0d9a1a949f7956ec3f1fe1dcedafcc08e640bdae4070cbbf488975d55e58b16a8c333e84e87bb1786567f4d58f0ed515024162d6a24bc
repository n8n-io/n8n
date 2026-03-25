<script lang="ts">
import type { Ref } from 'vue'
import type { ToastRootImplEmits, ToastRootImplProps } from './ToastRootImpl.vue'
import { useForwardExpose } from '@/shared'

export type ToastRootEmits = Omit<ToastRootImplEmits, 'close'> & {
  /** Event handler called when the open state changes */
  'update:open': [value: boolean]
}

export interface ToastRootProps extends ToastRootImplProps {
  /** The open state of the dialog when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { Presence } from '@/Presence'
import ToastRootImpl from './ToastRootImpl.vue'

const props = withDefaults(defineProps<ToastRootProps>(), {
  type: 'foreground',
  open: undefined,
  defaultOpen: true,
  as: 'li',
})

const emits = defineEmits<ToastRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
    /** Remaining time (in ms) */
    remaining: number
    /** Total time the toast will remain visible for (in ms) */
    duration: number
  }) => any
}>()

const { forwardRef } = useForwardExpose()
const open = useVModel(props, 'open', emits, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>
</script>

<template>
  <Presence :present="forceMount || open">
    <ToastRootImpl
      :ref="forwardRef"
      v-slot="{ remaining, duration: _duration }"
      :open="open"
      :type="type"
      :as="as"
      :as-child="asChild"
      :duration="duration"
      v-bind="$attrs"
      @close="open = false"
      @pause="emits('pause')"
      @resume="emits('resume')"
      @escape-key-down="emits('escapeKeyDown', $event)"
      @swipe-start="(event) => {
        emits('swipeStart', event);
        if (!event.defaultPrevented) {
          (event.currentTarget as HTMLElement).setAttribute('data-swipe', 'start');
        }
      }"
      @swipe-move="(event) => {
        emits('swipeMove', event);
        if (!event.defaultPrevented) {
          const { x, y } = event.detail.delta;
          const target = event.currentTarget as HTMLElement
          target.setAttribute('data-swipe', 'move');
          target.style.setProperty('--reka-toast-swipe-move-x', `${x}px`);
          target.style.setProperty('--reka-toast-swipe-move-y', `${y}px`);
        }
      }"
      @swipe-cancel="(event) => {
        emits('swipeCancel', event);
        if (!event.defaultPrevented) {
          const target = event.currentTarget as HTMLElement
          target.setAttribute('data-swipe', 'cancel');
          target.style.removeProperty('--reka-toast-swipe-move-x');
          target.style.removeProperty('--reka-toast-swipe-move-y');
          target.style.removeProperty('--reka-toast-swipe-end-x');
          target.style.removeProperty('--reka-toast-swipe-end-y');
        }
      }"
      @swipe-end="(event) => {
        emits('swipeEnd', event);
        if (!event.defaultPrevented) {
          const { x, y } = event.detail.delta;
          const target = event.currentTarget as HTMLElement
          target.setAttribute('data-swipe', 'end');
          target.style.removeProperty('--reka-toast-swipe-move-x');
          target.style.removeProperty('--reka-toast-swipe-move-y');
          target.style.setProperty('--reka-toast-swipe-end-x', `${x}px`);
          target.style.setProperty('--reka-toast-swipe-end-y', `${y}px`);
          open = false;
        }
      }"
    >
      <slot
        :remaining="remaining"
        :duration="_duration"
        :open="open"
      />
    </ToastRootImpl>
  </Presence>
</template>
