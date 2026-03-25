<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface ListboxItemIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectListboxItemContext } from './ListboxItem.vue'

const props = withDefaults(defineProps<ListboxItemIndicatorProps>(), {
  as: 'span',
})

useForwardExpose()
const itemContext = injectListboxItemContext()
</script>

<template>
  <Primitive
    v-if="itemContext.isSelected.value"
    aria-hidden="true"
    v-bind="props"
  >
    <slot />
  </Primitive>
</template>
