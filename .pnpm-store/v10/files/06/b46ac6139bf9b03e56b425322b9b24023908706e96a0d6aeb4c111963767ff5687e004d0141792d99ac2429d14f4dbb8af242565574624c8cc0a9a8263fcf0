<script lang="ts">
export interface ComboboxVirtualizerProps<T extends AcceptableValue = AcceptableValue> extends ListboxVirtualizerProps<T> {}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { VirtualItem, Virtualizer } from '@tanstack/vue-virtual'
import type { ListboxVirtualizerProps } from '@/Listbox/ListboxVirtualizer.vue'
import type { AcceptableValue } from '@/shared/types'
import ListboxVirtualizer from '@/Listbox/ListboxVirtualizer.vue'
import { injectComboboxRootContext } from './ComboboxRoot.vue'

const props = defineProps<ComboboxVirtualizerProps<T>>()

defineSlots<{
  default?: (props: {
    option: T
    virtualizer: Virtualizer<HTMLElement, Element>
    virtualItem: VirtualItem
  }) => any
}>()

const rootContext = injectComboboxRootContext()
// set virtual true when this component mounted
rootContext.isVirtual.value = true
</script>

<template>
  <ListboxVirtualizer
    v-slot="slotProps"
    v-bind="props"
  >
    <slot v-bind="slotProps" />
  </ListboxVirtualizer>
</template>
