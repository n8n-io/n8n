<script lang="ts">
import type {
  MenuSubContentEmits,
  MenuSubContentProps,
} from '@/Menu'
import { useCollection } from '@/Collection'

export type MenubarSubContentEmits = MenuSubContentEmits

export interface MenubarSubContentProps extends MenuSubContentProps {}
</script>

<script setup lang="ts">
import { MenuSubContent } from '@/Menu'
import { useForwardExpose, useForwardPropsEmits } from '@/shared'
import { wrapArray } from '@/shared/useTypeahead'
import { injectMenubarMenuContext } from './MenubarMenu.vue'
import { injectMenubarRootContext } from './MenubarRoot.vue'

const props = defineProps<MenubarSubContentProps>()
const emits = defineEmits<MenubarSubContentEmits>()
const forwarded = useForwardPropsEmits(props, emits)
useForwardExpose()

const { getItems } = useCollection({ key: 'Menubar' })

const rootContext = injectMenubarRootContext()
const menuContext = injectMenubarMenuContext()

function handleArrowNavigation(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const targetIsSubTrigger = target.hasAttribute(
    'data-reka-menubar-subtrigger',
  )

  // Prevent navigation when we're opening a submenu
  if (targetIsSubTrigger)
    return

  let candidateValues = getItems().filter(i => i.ref.dataset.disabled !== '').map(i => i.ref.dataset.value)
  const currentIndex = candidateValues.indexOf(menuContext.value)

  candidateValues = rootContext.loop.value
    ? wrapArray(candidateValues, currentIndex + 1)
    : candidateValues.slice(currentIndex + 1)

  const [nextValue] = candidateValues
  if (nextValue)
    rootContext.onMenuOpen(nextValue)
}
</script>

<template>
  <MenuSubContent
    v-bind="forwarded"
    data-reka-menubar-content=""
    :style="{
      '--reka-menubar-content-transform-origin':
        'var(--reka-popper-transform-origin)',
      '--reka-menubar-content-available-width':
        'var(--reka-popper-available-width)',
      '--reka-menubar-content-available-height':
        'var(--reka-popper-available-height)',
      '--reka-menubar-trigger-width': 'var(--reka-popper-anchor-width)',
      '--reka-menubar-trigger-height': 'var(--reka-popper-anchor-height)',
    }"
    @keydown.arrow-right="handleArrowNavigation"
  >
    <slot />
  </MenuSubContent>
</template>
