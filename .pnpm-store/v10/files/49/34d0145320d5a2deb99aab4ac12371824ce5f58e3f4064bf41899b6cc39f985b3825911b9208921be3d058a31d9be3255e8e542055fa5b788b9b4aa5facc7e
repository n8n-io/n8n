<script lang="ts">
import type { Ref } from 'vue'
import { createContext } from '@/shared'

export interface DialogRootProps {
  /** The controlled open state of the dialog. Can be binded as `v-model:open`. */
  open?: boolean
  /** The open state of the dialog when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
  /**
   * The modality of the dialog When set to `true`, <br>
   * interaction with outside elements will be disabled and only dialog content will be visible to screen readers.
   */
  modal?: boolean
}

export type DialogRootEmits = {
  /** Event handler called when the open state of the dialog changes. */
  'update:open': [value: boolean]
}

export interface DialogRootContext {
  open: Readonly<Ref<boolean>>
  modal: Ref<boolean>
  openModal: () => void
  onOpenChange: (value: boolean) => void
  onOpenToggle: () => void
  triggerElement: Ref<HTMLElement | undefined>
  contentElement: Ref<HTMLElement | undefined>
  contentId: string
  titleId: string
  descriptionId: string
}

export const [injectDialogRootContext, provideDialogRootContext]
  = createContext<DialogRootContext>('DialogRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { ref, toRefs } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogRootProps>(), {
  open: undefined,
  defaultOpen: false,
  modal: true,
})
const emit = defineEmits<DialogRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
    /** Close the dialog */
    close: () => void
  }) => any
}>()

const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

const triggerElement = ref<HTMLElement>()
const contentElement = ref<HTMLElement>()
const { modal } = toRefs(props)

provideDialogRootContext({
  open,
  modal,
  openModal: () => {
    open.value = true
  },
  onOpenChange: (value) => {
    open.value = value
  },
  onOpenToggle: () => {
    open.value = !open.value
  },
  contentId: '',
  titleId: '',
  descriptionId: '',
  triggerElement,
  contentElement,
})
</script>

<template>
  <slot
    :open="open"
    :close="() => open = false"
  />
</template>
