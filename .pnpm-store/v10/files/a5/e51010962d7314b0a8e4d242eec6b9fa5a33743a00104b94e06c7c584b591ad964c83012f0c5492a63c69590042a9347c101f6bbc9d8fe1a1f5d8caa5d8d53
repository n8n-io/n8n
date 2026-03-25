<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface RovingFocusItemProps extends PrimitiveProps {
  tabStopId?: string
  /**
   * When `false`, item will not be focusable.
   * @defaultValue `true`
   */
  focusable?: boolean
  /** When `true`, item will be initially focused. */
  active?: boolean
  /** When `true`, shift + arrow key will allow focusing on next/previous item. */
  allowShiftKey?: boolean
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useCollection } from '@/Collection'
import { Primitive } from '@/Primitive'
import { useId } from '@/shared'
import { injectRovingFocusGroupContext } from './RovingFocusGroup.vue'
import { focusFirst, getFocusIntent, wrapArray } from './utils'

const props = withDefaults(defineProps<RovingFocusItemProps>(), {
  focusable: true,
  as: 'span',
})

const context = injectRovingFocusGroupContext()
const randomId = useId()
const id = computed(() => props.tabStopId || randomId)
const isCurrentTabStop = computed(
  () => context.currentTabStopId.value === id.value,
)

const { getItems, CollectionItem } = useCollection()

onMounted(() => {
  if (props.focusable)
    context.onFocusableItemAdd()
})
onUnmounted(() => {
  if (props.focusable)
    context.onFocusableItemRemove()
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab' && event.shiftKey) {
    context.onItemShiftTab()
    return
  }

  if (event.target !== event.currentTarget)
    return

  const focusIntent = getFocusIntent(
    event,
    context.orientation.value,
    context.dir.value,
  )

  if (focusIntent !== undefined) {
    if (event.metaKey || event.ctrlKey || event.altKey || (props.allowShiftKey ? false : event.shiftKey))
      return
    event.preventDefault()
    let candidateNodes = [...getItems().map(i => i.ref).filter(i => i.dataset.disabled !== '')]

    if (focusIntent === 'last') {
      candidateNodes.reverse()
    }
    else if (focusIntent === 'prev' || focusIntent === 'next') {
      if (focusIntent === 'prev')
        candidateNodes.reverse()
      const currentIndex = candidateNodes.indexOf(
        event.currentTarget as HTMLElement,
      )

      candidateNodes = context.loop.value
        ? wrapArray(candidateNodes, currentIndex + 1)
        : candidateNodes.slice(currentIndex + 1)
    }

    nextTick(() => focusFirst(candidateNodes))
  }
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :tabindex="isCurrentTabStop ? 0 : -1"
      :data-orientation="context.orientation.value"
      :data-active="active ? '' : undefined"
      :data-disabled="!focusable ? '' : undefined"
      :as="as"
      :as-child="asChild"
      @mousedown="
        (event) => {
          // We prevent focusing non-focusable items on `mousedown`.
          // Even though the item has tabIndex={-1}, that only means take it out of the tab order.
          if (!focusable) event.preventDefault();
          // Safari doesn't focus a button when clicked so we run our logic on mousedown also
          else context.onItemFocus(id);
        }
      "
      @focus="context.onItemFocus(id)"
      @keydown="handleKeydown"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
