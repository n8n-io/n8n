<script lang="ts">
import type { SwipeEvent } from './utils'
import type { PrimitiveProps } from '@/Primitive'
import { isClient } from '@vueuse/shared'
import { useCollection } from '@/Collection'
import { createContext, getActiveElement, useForwardExpose } from '@/shared'

export type ToastRootImplEmits = {
  close: []
  /** Event handler called when the escape key is down. It can be prevented by calling `event.preventDefault`. */
  escapeKeyDown: [event: KeyboardEvent]
  /** Event handler called when the dismiss timer is paused. This occurs when the pointer is moved over the viewport, the viewport is focused or when the window is blurred. */
  pause: []
  /** Event handler called when the dismiss timer is resumed. This occurs when the pointer is moved away from the viewport, the viewport is blurred or when the window is focused. */
  resume: []
  /** Event handler called when starting a swipe interaction. It can be prevented by calling `event.preventDefault`. */
  swipeStart: [event: SwipeEvent]
  /** Event handler called during a swipe interaction. It can be prevented by calling `event.preventDefault`. */
  swipeMove: [event: SwipeEvent]
  /** Event handler called when swipe interaction is cancelled. It can be prevented by calling `event.preventDefault`. */
  swipeCancel: [event: SwipeEvent]
  /** Event handler called at the end of a swipe interaction. It can be prevented by calling `event.preventDefault`. */
  swipeEnd: [event: SwipeEvent]
}

export interface ToastRootImplProps extends PrimitiveProps {
  /**
   * Control the sensitivity of the toast for accessibility purposes.
   *
   * For toasts that are the result of a user action, choose `foreground`. Toasts generated from background tasks should use `background`.
   */
  type?: 'foreground' | 'background'
  /**
   * The controlled open state of the dialog. Can be bind as `v-model:open`.
   */
  open?: boolean
  /**
   * Time in milliseconds that toast should remain visible for. Overrides value
   * given to `ToastProvider`.
   */
  duration?: number
}

export const [injectToastRootContext, provideToastRootContext]
  = createContext<{ onClose: () => void }>('ToastRoot')
</script>

<script setup lang="ts">
import { onKeyStroke, useRafFn } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { Primitive } from '@/Primitive'
import ToastAnnounce from './ToastAnnounce.vue'
import { injectToastProviderContext } from './ToastProvider.vue'
import { getAnnounceTextContent, handleAndDispatchCustomEvent, isDeltaInDirection, TOAST_SWIPE_CANCEL, TOAST_SWIPE_END, TOAST_SWIPE_MOVE, TOAST_SWIPE_START, VIEWPORT_PAUSE, VIEWPORT_RESUME } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ToastRootImplProps>(), {
  open: false,
  as: 'li',
})

const emits = defineEmits<ToastRootImplEmits>()

const { forwardRef, currentElement } = useForwardExpose()
const { CollectionItem } = useCollection()

const providerContext = injectToastProviderContext()
const pointerStartRef = ref<{ x: number, y: number } | null>(null)
const swipeDeltaRef = ref<{ x: number, y: number } | null>(null)
const duration = computed(
  () => typeof props.duration === 'number'
    ? props.duration
    : providerContext.duration.value,
)

const closeTimerStartTimeRef = ref(0)
const closeTimerRemainingTimeRef = ref(duration.value)
const closeTimerRef = ref(0)
const remainingTime = ref(duration.value)

const remainingRaf = useRafFn(() => {
  const elapsedTime = new Date().getTime() - closeTimerStartTimeRef.value
  remainingTime.value = Math.max(closeTimerRemainingTimeRef.value - elapsedTime, 0)
}, { fpsLimit: 60 })

function startTimer(duration: number) {
  if (duration <= 0 || duration === Number.POSITIVE_INFINITY)
    return
  // startTimer is used inside a watch with immediate set to true.
  // This results in code execution during SSR.
  // Ensure this code only runs in a browser environment
  if (!isClient)
    return
  window.clearTimeout(closeTimerRef.value)
  closeTimerStartTimeRef.value = new Date().getTime()
  closeTimerRef.value = window.setTimeout(handleClose, duration)
}

function handleClose(event?: PointerEvent) {
  const isNonPointerEvent = event?.pointerType === ''

  // reka: update to only perform focus when user focus via keyboard
  // focus viewport if focus is within toast to read the remaining toast
  // count to SR users and ensure focus isn't lost
  const isFocusInToast = currentElement.value?.contains(getActiveElement())
  if (isFocusInToast && isNonPointerEvent)
    providerContext.viewport.value?.focus()

  if (isNonPointerEvent) {
    // when manually close the toast, we reset isClosePausedRef
    providerContext.isClosePausedRef.value = false
  }

  emits('close')
}

const announceTextContent = computed(() => currentElement.value ? getAnnounceTextContent(currentElement.value) : null)

if (props.type && !['foreground', 'background'].includes(props.type)) {
  const error = 'Invalid prop `type` supplied to `Toast`. Expected `foreground | background`.'
  throw new Error(error)
}

watchEffect((cleanupFn) => {
  const viewport = providerContext.viewport.value
  if (viewport) {
    const handleResume = () => {
      startTimer(closeTimerRemainingTimeRef.value)
      remainingRaf.resume()
      emits('resume')
    }
    const handlePause = () => {
      const elapsedTime = new Date().getTime() - closeTimerStartTimeRef.value
      closeTimerRemainingTimeRef.value = closeTimerRemainingTimeRef.value - elapsedTime
      window.clearTimeout(closeTimerRef.value)
      remainingRaf.pause()
      emits('pause')
    }
    viewport.addEventListener(VIEWPORT_PAUSE, handlePause)
    viewport.addEventListener(VIEWPORT_RESUME, handleResume)
    return () => {
      viewport.removeEventListener(VIEWPORT_PAUSE, handlePause)
      viewport.removeEventListener(VIEWPORT_RESUME, handleResume)
    }
  }
})

// start timer when toast opens or duration changes.
// we include `open` in deps because closed !== unmounted when animating
// so it could reopen before being completely unmounted
watch(() => [props.open, duration.value], () => {
  // Reset the timer when the toast is rerendered with the new duration
  closeTimerRemainingTimeRef.value = duration.value

  if (props.open && !providerContext.isClosePausedRef.value)
    startTimer(duration.value)
}, { immediate: true })

onKeyStroke('Escape', (event) => {
  emits('escapeKeyDown', event)
  if (!event.defaultPrevented) {
    providerContext.isFocusedToastEscapeKeyDownRef.value = true
    handleClose()
  }
})

onMounted(() => {
  providerContext.onToastAdd()
})
onUnmounted(() => {
  providerContext.onToastRemove()
})

provideToastRootContext({ onClose: handleClose })
</script>

<template>
  <ToastAnnounce
    v-if="announceTextContent"
    role="alert"
    :aria-live="type === 'foreground' ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    {{ announceTextContent }}
  </ToastAnnounce>

  <Teleport
    v-if="providerContext.viewport.value"
    :to="providerContext.viewport.value"
  >
    <CollectionItem>
      <Primitive
        :ref="forwardRef"
        role="alert"
        aria-live="off"
        aria-atomic="true"
        tabindex="0"
        v-bind="$attrs"
        :as="as"
        :as-child="asChild"
        :data-state="open ? 'open' : 'closed'"
        :data-swipe-direction="providerContext.swipeDirection.value"
        :style="{ userSelect: 'none', touchAction: 'none' }"
        @pointerdown.left="(event: PointerEvent) => {
          pointerStartRef = { x: event.clientX, y: event.clientY };
        }"
        @pointermove="(event: PointerEvent) => {
          if (!pointerStartRef) return;
          const x = event.clientX - pointerStartRef.x;
          const y = event.clientY - pointerStartRef.y;
          const hasSwipeMoveStarted = Boolean(swipeDeltaRef);
          const isHorizontalSwipe = ['left', 'right'].includes(providerContext.swipeDirection.value);
          const clamp = ['left', 'up'].includes(providerContext.swipeDirection.value)
            ? Math.min
            : Math.max;
          const clampedX = isHorizontalSwipe ? clamp(0, x) : 0;
          const clampedY = !isHorizontalSwipe ? clamp(0, y) : 0;
          const moveStartBuffer = event.pointerType === 'touch' ? 10 : 2;
          const delta = { x: clampedX, y: clampedY };
          const eventDetail = { originalEvent: event, delta };
          if (hasSwipeMoveStarted) {
            swipeDeltaRef = delta;
            handleAndDispatchCustomEvent(TOAST_SWIPE_MOVE, (ev: SwipeEvent) => emits('swipeMove', ev), eventDetail);
          }
          else if (isDeltaInDirection(delta, providerContext.swipeDirection.value, moveStartBuffer)) {
            swipeDeltaRef = delta;
            handleAndDispatchCustomEvent(TOAST_SWIPE_START, (ev: SwipeEvent) => emits('swipeStart', ev), eventDetail);
            (event.target as HTMLElement).setPointerCapture(event.pointerId);
          }
          else if (Math.abs(x) > moveStartBuffer || Math.abs(y) > moveStartBuffer) {
            // User is swiping in wrong direction so we disable swipe gesture
            // for the current pointer down interaction
            pointerStartRef = null;
          }
        }"
        @pointerup="(event: PointerEvent) => {
          const delta = swipeDeltaRef;
          const target = event.target as HTMLElement;
          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
          }
          swipeDeltaRef = null;
          pointerStartRef = null;
          if (delta) {
            const toast = event.currentTarget;
            const eventDetail = { originalEvent: event, delta };
            if (
              isDeltaInDirection(delta, providerContext.swipeDirection.value, providerContext.swipeThreshold.value)
            ) {
              handleAndDispatchCustomEvent(TOAST_SWIPE_END, (ev: SwipeEvent) => emits('swipeEnd', ev), eventDetail);
            }
            else {
              handleAndDispatchCustomEvent(TOAST_SWIPE_CANCEL, (ev: SwipeEvent) => emits('swipeCancel', ev), eventDetail);
            }
            // Prevent click event from triggering on items within the toast when
            // pointer up is part of a swipe gesture
            toast?.addEventListener('click', (event) => event.preventDefault(), {
              once: true,
            });
          }
        }"
      >
        <slot
          :remaining="remainingTime"
          :duration="duration"
        />
      </Primitive>
    </CollectionItem>
  </Teleport>
</template>
