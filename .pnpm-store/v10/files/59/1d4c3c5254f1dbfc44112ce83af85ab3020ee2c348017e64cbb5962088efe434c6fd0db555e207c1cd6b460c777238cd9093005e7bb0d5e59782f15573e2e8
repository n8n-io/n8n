<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface ListboxGroupLabelProps extends PrimitiveProps {
  for?: string
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectListboxGroupContext } from './ListboxGroup.vue'

const props = withDefaults(defineProps<ListboxGroupLabelProps>(), {
  as: 'div',
})

const groupContext = injectListboxGroupContext({ id: '' })
</script>

<template>
  <Primitive
    v-bind="props"
    :id="groupContext.id"
  >
    <slot />
  </Primitive>
</template>
