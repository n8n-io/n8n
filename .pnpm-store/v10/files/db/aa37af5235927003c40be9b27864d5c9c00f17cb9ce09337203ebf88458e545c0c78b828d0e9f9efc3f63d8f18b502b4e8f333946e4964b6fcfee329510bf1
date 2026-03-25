<script lang="ts">
import type { ListboxGroupProps } from '@/Listbox'
import { computed, onMounted, onUnmounted } from 'vue'
import { createContext, useId } from '@/shared'
import { injectComboboxRootContext } from './ComboboxRoot.vue'

export interface ComboboxGroupProps extends ListboxGroupProps {}

type ComboboxGroupContext = {
  id: string
  labelId: string
}

export const [injectComboboxGroupContext, provideComboboxGroupContext]
  = createContext<ComboboxGroupContext>('ComboboxGroup')
</script>

<script setup lang="ts">
import { ListboxGroup } from '@/Listbox'

const props = defineProps<ComboboxGroupProps>()
const id = useId(undefined, 'reka-combobox-group')
const rootContext = injectComboboxRootContext()

const isRender = computed(() => rootContext.ignoreFilter.value ? true : !rootContext.filterSearch.value ? true : rootContext.filterState.value.groups.has(id))

const context = provideComboboxGroupContext({
  id,
  labelId: '',
})

onMounted(() => {
  if (!rootContext.allGroups.value.has(id))
    rootContext.allGroups.value.set(id, new Set())
})
onUnmounted(() => {
  rootContext.allGroups.value.delete(id)
})
</script>

<template>
  <ListboxGroup
    :id="id"
    :aria-labelledby="context.labelId"
    v-bind="props"
    :hidden="isRender ? undefined : true"
  >
    <slot />
  </ListboxGroup>
</template>
