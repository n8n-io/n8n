<script lang="ts">
import type { Ref } from 'vue'
import { createContext, useForwardExpose } from '@/shared'

export interface HoverCardRootProps {
  /** The open state of the hover card when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
  /** The controlled open state of the hover card. Can be binded as `v-model:open`. */
  open?: boolean
  /** The duration from when the mouse enters the trigger until the hover card opens. */
  openDelay?: number
  /** The duration from when the mouse leaves the trigger or content until the hover card closes. */
  closeDelay?: number
}
export type HoverCardRootEmits = {
  /** Event handler called when the open state of the hover card changes. */
  'update:open': [value: boolean]
}

export interface HoverCardRootContext {
  open: Ref<boolean>
  onOpenChange: (open: boolean) => void
  onOpen: () => void
  onClose: () => void
  onDismiss: () => void
  hasSelectionRef: Ref<boolean>
  isPointerDownOnContentRef: Ref<boolean>
  isPointerInTransitRef: Ref<boolean>
  triggerElement: Ref<HTMLElement | undefined>
}

export const [injectHoverCardRootContext, provideHoverCardRootContext]
  = createContext<HoverCardRootContext>('HoverCardRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { ref, toRefs } from 'vue'
import { PopperRoot } from '@/Popper'

const props = withDefaults(defineProps<HoverCardRootProps>(), {
  defaultOpen: false,
  open: undefined,
  openDelay: 700,
  closeDelay: 300,
})
const emit = defineEmits<HoverCardRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
  }) => any
}>()

const { openDelay, closeDelay } = toRefs(props)

useForwardExpose()
const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

const openTimerRef = ref(0)
const closeTimerRef = ref(0)
const hasSelectionRef = ref(false)
const isPointerDownOnContentRef = ref(false)
const isPointerInTransitRef = ref(false)
const triggerElement = ref<HTMLElement>()

function handleOpen() {
  clearTimeout(closeTimerRef.value)
  openTimerRef.value = window.setTimeout(() => open.value = true, openDelay.value)
}

function handleClose() {
  clearTimeout(openTimerRef.value)
  if (!hasSelectionRef.value && !isPointerDownOnContentRef.value)
    closeTimerRef.value = window.setTimeout(() => open.value = false, closeDelay.value)
}

function handleDismiss() {
  open.value = false
}

provideHoverCardRootContext({
  open,
  onOpenChange(value) {
    open.value = value
  },
  onOpen: handleOpen,
  onClose: handleClose,
  onDismiss: handleDismiss,
  hasSelectionRef,
  isPointerDownOnContentRef,
  isPointerInTransitRef,
  triggerElement,
})
</script>

<template>
  <PopperRoot>
    <slot :open="open" />
  </PopperRoot>
</template>
