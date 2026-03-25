<script lang="ts">
import type { Ref } from 'vue'
import type { Direction } from '../shared/types'
import type { MenuEmits, MenuProps } from '@/Menu'
import { createContext, useDirection, useForwardExpose } from '@/shared'

export interface DropdownMenuRootProps extends MenuProps {
  /** The open state of the dropdown menu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
}
export type DropdownMenuRootEmits = MenuEmits

export interface DropdownMenuRootContext {
  open: Readonly<Ref<boolean>>
  onOpenChange: (open: boolean) => void
  onOpenToggle: () => void
  triggerId: string
  triggerElement: Ref<HTMLElement | undefined>
  contentId: string
  modal: Ref<boolean>
  dir: Ref<Direction>
}

export const [injectDropdownMenuRootContext, provideDropdownMenuRootContext]
  = createContext<DropdownMenuRootContext>('DropdownMenuRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { ref, toRefs } from 'vue'
import { MenuRoot } from '@/Menu'

const props = withDefaults(defineProps<DropdownMenuRootProps>(), {
  modal: true,
  open: undefined,
})
const emit = defineEmits<DropdownMenuRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
  }) => any
}>()

useForwardExpose()
const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

const triggerElement = ref<HTMLElement>()

const { modal, dir: propDir } = toRefs(props)
const dir = useDirection(propDir)
provideDropdownMenuRootContext({
  open,
  onOpenChange: (value) => {
    open.value = value
  },
  onOpenToggle: () => {
    open.value = !open.value
  },
  triggerId: '',
  triggerElement,
  contentId: '',
  modal,
  dir,
})
</script>

<template>
  <MenuRoot
    v-model:open="open"
    :dir="dir"
    :modal="modal"
  >
    <slot :open="open" />
  </MenuRoot>
</template>
