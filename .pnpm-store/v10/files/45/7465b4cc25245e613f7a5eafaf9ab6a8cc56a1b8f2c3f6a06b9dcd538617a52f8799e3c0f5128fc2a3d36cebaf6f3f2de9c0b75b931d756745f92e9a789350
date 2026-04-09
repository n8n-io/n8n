<script lang="ts">
import type { PrimitiveProps } from '..'
import { refAutoReset } from '@vueuse/shared'
import { Primitive } from '..'
import { injectListboxRootContext } from './ListboxRoot.vue'

export interface ListboxContentProps extends PrimitiveProps { }
</script>

<script setup lang="ts">
import { useCollection } from '@/Collection'

defineProps<ListboxContentProps>()

const { CollectionSlot } = useCollection()
const rootContext = injectListboxRootContext()

const isClickFocus = refAutoReset(false, 10)
</script>

<template>
  <CollectionSlot>
    <Primitive
      role="listbox"
      :as="as"
      :as-child="asChild"
      :tabindex="rootContext.focusable.value ? rootContext.highlightedElement.value ? '-1' : '0' : '-1'"
      :aria-orientation="rootContext.orientation.value"
      :aria-multiselectable="!!rootContext.multiple.value"
      :data-orientation="rootContext.orientation.value"
      @mousedown.left="isClickFocus = true"
      @focus="(ev) => {
        if (isClickFocus)
          return
        rootContext.onEnter(ev)
      }"
      @keydown.down.up.left.right.home.end="(event: KeyboardEvent) => {
        if (
          // when orientation is vertical, ignore left/right
          (
            rootContext.orientation.value === 'vertical'
            && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
          )
          // when orientation is horizontal, ignore up/down
          || (
            rootContext.orientation.value === 'horizontal'
            && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
          )
        ) {
          return
        }

        event.preventDefault()
        rootContext.focusable.value ? rootContext.onKeydownNavigation(event) : undefined
      }"
      @keydown.enter="rootContext.onKeydownEnter"
      @keydown="rootContext.onKeydownTypeAhead"
    >
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
