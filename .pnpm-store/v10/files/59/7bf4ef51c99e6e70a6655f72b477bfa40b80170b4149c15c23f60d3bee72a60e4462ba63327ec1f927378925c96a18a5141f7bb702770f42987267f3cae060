<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { computed } from 'vue'

export interface ComboboxEmptyProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectComboboxRootContext } from './ComboboxRoot.vue'

const props = defineProps<ComboboxEmptyProps>()
const rootContext = injectComboboxRootContext()

const isRender = computed(() => rootContext.ignoreFilter.value
  ? rootContext.allItems.value.size === 0
  : rootContext.filterState.value.count === 0,
)
</script>

<template>
  <Primitive
    v-if="isRender"
    v-bind="props"
  >
    <slot>No options</slot>
  </Primitive>
</template>
