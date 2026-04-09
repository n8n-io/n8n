<script lang="ts">
import type { Ref } from 'vue'
import type { MenuGroupProps } from './MenuGroup.vue'
import type { AcceptableValue } from '@/shared/types'
import { createContext, useForwardProps } from '@/shared'

interface MenuRadioGroupContext {
  modelValue: Ref<AcceptableValue>
  onValueChange: (payload: AcceptableValue) => void
}

export interface MenuRadioGroupProps extends MenuGroupProps {
  /** The value of the selected item in the group. */
  modelValue?: AcceptableValue
}

export type MenuRadioGroupEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [payload: AcceptableValue]
}

export const [injectMenuRadioGroupContext, provideMenuRadioGroupContext]
  = createContext<MenuRadioGroupContext>('MenuRadioGroup')
</script>

<script setup lang="ts">
import { reactiveOmit, useVModel } from '@vueuse/core'
import MenuGroup from './MenuGroup.vue'

const props = withDefaults(defineProps<MenuRadioGroupProps>(), {
  modelValue: '',
})
const emits = defineEmits<MenuRadioGroupEmits>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const delegatedProps = reactiveOmit(props, ['modelValue'])
const forwarded = useForwardProps(delegatedProps)

const modelValue = useVModel(props, 'modelValue', emits)

provideMenuRadioGroupContext({
  modelValue,
  onValueChange: (payload) => {
    modelValue.value = payload
  },
})
</script>

<template>
  <MenuGroup v-bind="forwarded">
    <slot :model-value="modelValue" />
  </MenuGroup>
</template>
