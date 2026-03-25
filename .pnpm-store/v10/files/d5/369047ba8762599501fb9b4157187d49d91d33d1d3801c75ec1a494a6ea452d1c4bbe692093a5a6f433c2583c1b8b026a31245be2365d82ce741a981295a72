<script lang="ts">
import type { Ref } from 'vue'
import { createContext, useForwardExpose } from '@/shared'

export interface TooltipRootProps {
  /**
   * The open state of the tooltip when it is initially rendered.
   * Use when you do not need to control its open state.
   */
  defaultOpen?: boolean
  /**
   * The controlled open state of the tooltip.
   */
  open?: boolean
  /**
   * Override the duration given to the `Provider` to customise
   * the open delay for a specific tooltip.
   *
   * @defaultValue 700
   */
  delayDuration?: number
  /**
   * Prevents Tooltip.Content from remaining open when hovering.
   * Disabling this has accessibility consequences. Inherits
   * from Tooltip.Provider.
   */
  disableHoverableContent?: boolean
  /**
   * When `true`, clicking on trigger will not close the content.
   * @defaultValue false
   */
  disableClosingTrigger?: boolean
  /**
   * When `true`, disable tooltip
   * @defaultValue false
   */
  disabled?: boolean
  /**
   * Prevent the tooltip from opening if the focus did not come from
   * the keyboard by matching against the `:focus-visible` selector.
   * This is useful if you want to avoid opening it when switching
   * browser tabs or closing a dialog.
   * @defaultValue false
   */
  ignoreNonKeyboardFocus?: boolean
}

export type TooltipRootEmits = {
  /** Event handler called when the open state of the tooltip changes. */
  'update:open': [value: boolean]
}

export interface TooltipContext {
  contentId: string
  open: Ref<boolean>
  stateAttribute: Ref<'closed' | 'delayed-open' | 'instant-open'>
  trigger: Ref<HTMLElement | undefined>
  onTriggerChange: (trigger: HTMLElement | undefined) => void
  onTriggerEnter: () => void
  onTriggerLeave: () => void
  onOpen: () => void
  onClose: () => void
  disableHoverableContent: Ref<boolean>
  disableClosingTrigger: Ref<boolean>
  disabled: Ref<boolean>
  ignoreNonKeyboardFocus: Ref<boolean>
}

export const [injectTooltipRootContext, provideTooltipRootContext]
  = createContext<TooltipContext>('TooltipRoot')
</script>

<script setup lang="ts">
import { useTimeoutFn, useVModel } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { PopperRoot } from '@/Popper'
import { injectTooltipProviderContext } from './TooltipProvider.vue'
import { TOOLTIP_OPEN } from './utils'

const props = withDefaults(defineProps<TooltipRootProps>(), {
  defaultOpen: false,
  open: undefined,
  delayDuration: undefined,
  disableHoverableContent: undefined,
  disableClosingTrigger: undefined,
  disabled: undefined,
  ignoreNonKeyboardFocus: undefined,
})

const emit = defineEmits<TooltipRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
  }) => any
}>()

useForwardExpose()
const providerContext = injectTooltipProviderContext()

const disableHoverableContent = computed(() => props.disableHoverableContent ?? providerContext.disableHoverableContent.value)
const disableClosingTrigger = computed(() => props.disableClosingTrigger ?? providerContext.disableClosingTrigger.value)
const disableTooltip = computed(() => props.disabled ?? providerContext.disabled.value)

const delayDuration = computed(() => props.delayDuration ?? providerContext.delayDuration.value)
const ignoreNonKeyboardFocus = computed(() => props.ignoreNonKeyboardFocus ?? providerContext.ignoreNonKeyboardFocus.value)

const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

watch(open, (isOpen) => {
  if (!providerContext.onClose)
    return
  if (isOpen) {
    providerContext.onOpen()
    // as `onChange` is called within a lifecycle method we
    // avoid dispatching via `dispatchDiscreteCustomEvent`.
    document.dispatchEvent(new CustomEvent(TOOLTIP_OPEN))
  }
  else {
    providerContext.onClose()
  }
})

const wasOpenDelayedRef = ref(false)
const trigger = ref<HTMLElement>()

const stateAttribute = computed(() => {
  if (!open.value)
    return 'closed'
  return wasOpenDelayedRef.value ? 'delayed-open' : 'instant-open'
})

const { start: startTimer, stop: clearTimer } = useTimeoutFn(() => {
  wasOpenDelayedRef.value = true
  open.value = true
}, delayDuration, { immediate: false })

function handleOpen() {
  clearTimer()
  wasOpenDelayedRef.value = false
  open.value = true
}
function handleClose() {
  clearTimer()
  open.value = false
}
function handleDelayedOpen() {
  startTimer()
}

provideTooltipRootContext({
  contentId: '',
  open,
  stateAttribute,
  trigger,
  onTriggerChange(el) {
    trigger.value = el
  },
  onTriggerEnter() {
    if (providerContext.isOpenDelayed.value)
      handleDelayedOpen()
    else handleOpen()
  },
  onTriggerLeave() {
    if (disableHoverableContent.value) {
      handleClose()
    }
    else {
      // Clear the timer in case the pointer leaves the trigger before the tooltip is opened.
      clearTimer()
    }
  },
  onOpen: handleOpen,
  onClose: handleClose,
  disableHoverableContent,
  disableClosingTrigger,
  disabled: disableTooltip,
  ignoreNonKeyboardFocus,
})
</script>

<template>
  <PopperRoot>
    <slot :open="open" />
  </PopperRoot>
</template>
