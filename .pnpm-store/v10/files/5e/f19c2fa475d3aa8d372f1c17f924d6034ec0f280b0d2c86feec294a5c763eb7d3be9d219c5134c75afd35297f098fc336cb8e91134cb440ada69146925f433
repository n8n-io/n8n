<script lang="ts">
import type { Ref } from 'vue'
import { createContext } from '@/shared'

export interface PopoverRootProps {
  /**
   * The open state of the popover when it is initially rendered. Use when you do not need to control its open state.
   */
  defaultOpen?: boolean
  /**
   * The controlled open state of the popover.
   */
  open?: boolean
  /**
   * The modality of the popover. When set to true, interaction with outside elements will be disabled and only popover content will be visible to screen readers.
   *
   * @defaultValue false
   */
  modal?: boolean
}
export type PopoverRootEmits = {
  /**
   * Event handler called when the open state of the popover changes.
   */
  'update:open': [value: boolean]
}

export interface PopoverRootContext {
  triggerElement: Ref<HTMLElement | undefined>
  triggerId: string
  contentId: string
  open: Ref<boolean>
  modal: Ref<boolean>
  onOpenChange: (value: boolean) => void
  onOpenToggle: () => void
  hasCustomAnchor: Ref<boolean>
}

export const [injectPopoverRootContext, providePopoverRootContext]
  = createContext<PopoverRootContext>('PopoverRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { ref, toRefs } from 'vue'
import { PopperRoot } from '@/Popper'

const props = withDefaults(defineProps<PopoverRootProps>(), {
  defaultOpen: false,
  open: undefined,
  modal: false,
})
const emit = defineEmits<PopoverRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
    /** Close the popover */
    close: () => void
  }) => any
}>()

const { modal } = toRefs(props)

const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

const triggerElement = ref<HTMLElement>()
const hasCustomAnchor = ref(false)

providePopoverRootContext({
  contentId: '',
  triggerId: '',
  modal,
  open,
  onOpenChange: (value) => {
    open.value = value
  },
  onOpenToggle: () => {
    open.value = !open.value
  },
  triggerElement,
  hasCustomAnchor,
})
</script>

<template>
  <PopperRoot>
    <slot
      :open="open"
      :close="() => open = false"
    />
  </PopperRoot>
</template>
