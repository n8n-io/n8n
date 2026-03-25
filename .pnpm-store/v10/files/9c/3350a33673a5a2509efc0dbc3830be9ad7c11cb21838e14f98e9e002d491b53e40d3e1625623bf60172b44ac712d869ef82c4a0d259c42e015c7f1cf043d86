<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import { useCollection } from '@/Collection'
import { createContext, getActiveElement, useArrowNavigation, useForwardExpose, useId } from '@/shared'

export interface NavigationMenuItemProps extends PrimitiveProps {
  /**
   * A unique value that associates the item with an active value when the navigation menu is controlled.
   *
   *  This prop is managed automatically when uncontrolled.
   */
  value?: string
}

export type NavigationMenuItemContext = {
  value: string
  contentId: string
  triggerRef: Ref<HTMLElement | undefined>
  focusProxyRef: Ref<HTMLElement | undefined>
  wasEscapeCloseRef: Ref<boolean>
  onEntryKeyDown: () => void
  onFocusProxyEnter: (side: 'start' | 'end') => void
  onContentFocusOutside: () => void
  onRootContentClose: () => void
}

export const [injectNavigationMenuItemContext, provideNavigationMenuItemContext]
  = createContext<NavigationMenuItemContext>('NavigationMenuItem')
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { Primitive } from '@/Primitive'
import { injectNavigationMenuContext } from './NavigationMenuRoot.vue'
import {
  focusFirst,
  getTabbableCandidates,
  makeContentId,
  removeFromTabOrder,
} from './utils'

const props = withDefaults(defineProps<NavigationMenuItemProps>(), {
  as: 'li',
})

useForwardExpose()
const { getItems } = useCollection({ key: 'NavigationMenu' })

const context = injectNavigationMenuContext()

const value = useId(props.value)
const triggerRef = ref<HTMLElement>()
const focusProxyRef = ref<HTMLElement>()

const contentId = makeContentId(context.baseId, value)

let restoreContentTabOrderRef: () => void = () => ({})

const wasEscapeCloseRef = ref(false)
async function handleContentEntry(side = 'start') {
  const el = document.getElementById(contentId)
  if (el) {
    restoreContentTabOrderRef()
    const candidates = getTabbableCandidates(el)
    if (candidates.length)
      focusFirst(side === 'start' ? candidates : candidates.reverse())
  }
}

function handleContentExit() {
  const el = document.getElementById(contentId)
  if (el) {
    const candidates = getTabbableCandidates(el)
    if (candidates.length)
      restoreContentTabOrderRef = removeFromTabOrder(candidates)
  }
}

provideNavigationMenuItemContext({
  value,
  contentId,
  triggerRef,
  focusProxyRef,
  wasEscapeCloseRef,
  onEntryKeyDown: handleContentEntry,
  onFocusProxyEnter: handleContentEntry,
  onContentFocusOutside: handleContentExit,
  onRootContentClose: handleContentExit,
})

function handleClose() {
  context.onItemDismiss()
  triggerRef.value?.focus()
}

function handleKeydown(ev: KeyboardEvent) {
  const currentFocus = getActiveElement() as HTMLElement
  if (ev.keyCode === 32 || ev.key === 'Enter') {
    if (context.modelValue.value === value) {
      handleClose()
      ev.preventDefault()
      return
    }
    else {
      (ev.target as HTMLElement).click()
      ev.preventDefault()
      return
    }
  }

  const itemsArray = getItems().filter(i =>
    i.ref.parentElement?.hasAttribute('data-menu-item'),
  ).map(i => i.ref)

  // prevent triggering when the focus is on link
  if (!itemsArray.includes(currentFocus))
    return

  const newSelectedElement = useArrowNavigation(ev, currentFocus, undefined, {
    itemsArray,
    loop: false,
  })

  if (newSelectedElement)
    newSelectedElement?.focus()

  ev.preventDefault()
  ev.stopPropagation()
}
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    data-menu-item
    @keydown.up.down.left.right.home.end.space="handleKeydown"
  >
    <slot />
  </Primitive>
</template>
