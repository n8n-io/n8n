<script lang="ts">
import type { ListboxRootEmits, ListboxRootProps } from '@/Listbox'
import { useVModel } from '@vueuse/core'
import { useForwardPropsEmits } from '@/shared'

export interface ColorSwatchPickerRootProps extends Omit<ListboxRootProps, 'by'> {
  defaultValue?: string | string[]
  modelValue?: string | string[]
}

export type ColorSwatchPickerRootEmits = ListboxRootEmits
</script>

<script setup lang="ts">
import { ListboxContent, ListboxRoot } from '@/Listbox'

const props = withDefaults(defineProps<ColorSwatchPickerRootProps>(), {
  as: 'div',
  defaultValue: undefined,
  dir: 'ltr',
  disabled: false,
  loop: false,
  orientation: 'horizontal',
})

const emits = defineEmits<ColorSwatchPickerRootEmits>()

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? (props.multiple ? [] : ''),
  // Cast required for VueUse's passive option type; enables passive sync when modelValue is undefined
  passive: (props.modelValue === undefined) as false,
})

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <ListboxRoot
    v-bind="forwarded"
    v-model="modelValue"
    as-child
  >
    <ListboxContent
      :as-child="asChild"
      :as="as"
    >
      <slot :model-value="modelValue" />
    </ListboxContent>
  </ListboxRoot>
</template>
