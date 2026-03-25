<script lang="ts">
import type { Ref } from 'vue'
import type { MenuContext } from './MenuRoot.vue'
import { createContext } from '@/shared'

export interface MenuSubContext {
  contentId: string
  triggerId: string
  trigger: Ref<HTMLElement | undefined>
  onTriggerChange: (trigger: HTMLElement | undefined) => void
  parentMenuContext?: MenuContext
}

export const [injectMenuSubContext, provideMenuSubContext]
  = createContext<MenuSubContext>('MenuSub')

export interface MenuSubProps {
  /** The controlled open state of the menu. Can be used as `v-model:open`. */
  open?: boolean
}

export type MenuSubEmits = {
  /** Event handler called when the open state of the submenu changes. */
  'update:open': [payload: boolean]
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import {
  ref,
  watchEffect,
} from 'vue'
import { PopperRoot } from '@/Popper'
import { injectMenuContext, provideMenuContext } from './MenuRoot.vue'

const props = withDefaults(defineProps<MenuSubProps>(), {
  open: undefined,
})
const emits = defineEmits<MenuSubEmits>()

const open = useVModel(props, 'open', emits, {
  defaultValue: false,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

const parentMenuContext = injectMenuContext()
const trigger = ref<HTMLElement>()
const content = ref<HTMLElement>()

// Prevent the parent menu from reopening with open submenus.
watchEffect((cleanupFn) => {
  if (parentMenuContext?.open.value === false)
    open.value = false
  cleanupFn(() => (open.value = false))
})

provideMenuContext({
  open,
  onOpenChange: (value) => {
    open.value = value
  },
  content,
  onContentChange: (element) => {
    content.value = element
  },
})

provideMenuSubContext({
  triggerId: '',
  contentId: '',
  trigger,
  onTriggerChange: (element) => {
    trigger.value = element
  },
})
</script>

<template>
  <PopperRoot>
    <slot />
  </PopperRoot>
</template>
