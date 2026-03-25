<script lang="ts">
import type { ListboxItemEmits, ListboxItemProps } from '@/Listbox'
import type { AcceptableValue } from '@/shared/types'
import { computed, onMounted, onUnmounted } from 'vue'
import { usePrimitiveElement } from '@/Primitive'
import { useId } from '@/shared'
import { injectComboboxGroupContext } from './ComboboxGroup.vue'
import { injectComboboxRootContext } from './ComboboxRoot.vue'

export { injectListboxItemContext as injectComboboxItemContext } from '@/Listbox'

export type ComboboxItemEmits<T = AcceptableValue> = ListboxItemEmits<T>
export interface ComboboxItemProps<T = AcceptableValue> extends ListboxItemProps<T> {
  /**
   * A string representation of the item contents.
   *
   * If the children are not plain text, then the `textValue` prop must also be set to a plain text representation, which will be used for autocomplete in the ComboBox.
   */
  textValue?: string
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import { ListboxItem } from '@/Listbox'

const props = defineProps<ComboboxItemProps<T>>()
const emits = defineEmits<ComboboxItemEmits<T>>()

const id = useId(undefined, 'reka-combobox-item')
const rootContext = injectComboboxRootContext()
const groupContext = injectComboboxGroupContext(null)

const { primitiveElement, currentElement } = usePrimitiveElement()

if (props.value === '') {
  throw new Error(
    'A <ComboboxItem /> must have a value prop that is not an empty string. This is because the Combobox value can be set to an empty string to clear the selection and show the placeholder.',
  )
}

const isRender = computed(() => {
  if (rootContext.isVirtual.value || rootContext.ignoreFilter.value || !rootContext.filterSearch.value) {
    return true
  }
  else {
    const filteredCurrentItem = rootContext.filterState.value.items.get(id)
    // If the filtered items is undefined means not in the all times map yet
    // Do the first render to add into the map
    if (filteredCurrentItem === undefined) {
      return true
    }

    // Check with filter
    return filteredCurrentItem > 0
  }
})

onMounted(() => {
  // textValue to perform filter
  rootContext.allItems.value.set(id, props.textValue || currentElement.value.textContent || currentElement.value.innerText)

  const groupId = groupContext?.id
  if (groupId) {
    if (!rootContext.allGroups.value.has(groupId)) {
      rootContext.allGroups.value.set(groupId, new Set([id]))
    }
    else {
      rootContext.allGroups.value.get(groupId)?.add(id)
    }
  }
})
onUnmounted(() => {
  rootContext.allItems.value.delete(id)
})
</script>

<template>
  <ListboxItem
    v-if="isRender"
    v-bind="props"
    :id="id"
    ref="primitiveElement"
    :disabled="rootContext.disabled.value || disabled"
    @select="(event) => {
      emits('select', event as any)
      if (event.defaultPrevented)
        return

      if (!rootContext.multiple.value && !disabled && !rootContext.disabled.value) {
        event.preventDefault()
        rootContext.onOpenChange(false)
        rootContext.modelValue.value = props.value
      }
    }"
  >
    <slot>{{ value }}</slot>
  </ListboxItem>
</template>
