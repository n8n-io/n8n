<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface ComboboxLabelProps extends PrimitiveProps {
  for?: string
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { useForwardExpose, useId } from '@/shared'
import { injectComboboxGroupContext } from './ComboboxGroup.vue'

const props = withDefaults(defineProps<ComboboxLabelProps>(), {
  as: 'div',
})

useForwardExpose()
const groupContext = injectComboboxGroupContext({ id: '', labelId: '' })

groupContext.labelId ||= useId(undefined, 'reka-combobox-group-label')
</script>

<template>
  <Primitive
    v-bind="props"
    :id="groupContext.labelId"
  >
    <slot />
  </Primitive>
</template>
