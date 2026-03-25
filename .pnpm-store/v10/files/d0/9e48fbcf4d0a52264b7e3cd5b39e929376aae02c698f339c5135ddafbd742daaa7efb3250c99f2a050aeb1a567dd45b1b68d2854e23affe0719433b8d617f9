<script lang="ts">
import type { Ref } from 'vue'
import { createContext, useForwardExpose, useId } from '@/shared'

export interface MenubarMenuProps {
  /**
   * A unique value that associates the item with an active value when the navigation menu is controlled.
   *
   * This prop is managed automatically when uncontrolled.
   */
  value?: string
}

type MenubarMenuContext = {
  value: string
  triggerId: string
  triggerElement: Ref<HTMLElement | undefined>
  contentId: string
  wasKeyboardTriggerOpenRef: Ref<boolean>
}

export const [injectMenubarMenuContext, provideMenubarMenuContext]
  = createContext<MenubarMenuContext>('MenubarMenu')
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MenuRoot } from '@/Menu'
import { injectMenubarRootContext } from './MenubarRoot.vue'

const props = defineProps<MenubarMenuProps>()

const value = useId(props.value)
const rootContext = injectMenubarRootContext()
useForwardExpose()

const triggerElement = ref<HTMLElement>()
const wasKeyboardTriggerOpenRef = ref(false)

const open = computed(() => rootContext.modelValue.value === value)

watch(open, () => {
  if (!open.value)
    wasKeyboardTriggerOpenRef.value = false
})

provideMenubarMenuContext({
  value,
  triggerElement,
  triggerId: value,
  contentId: '',
  wasKeyboardTriggerOpenRef,
})
</script>

<template>
  <MenuRoot
    :open="open"
    :modal="false"
    :dir="rootContext.dir.value"
    @update:open="
      (value) => {
        // Menu only calls `@update:open` when dismissing so we
        // want to close our MenuBar based on the same events.
        if (!value) rootContext.onMenuClose();
      }
    "
  >
    <slot />
  </MenuRoot>
</template>
