<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import type { AcceptableValue } from '@/shared/types'
import { valueComparator } from './utils'

export interface SelectValueProps extends PrimitiveProps {
  /** The content that will be rendered inside the `SelectValue` when no `value` or `defaultValue` is set. */
  placeholder?: string
}
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectSelectRootContext } from './SelectRoot.vue'

const props = withDefaults(defineProps<SelectValueProps>(), {
  as: 'span',
  placeholder: '',
})

const { forwardRef, currentElement } = useForwardExpose()

const rootContext = injectSelectRootContext()

onMounted(() => {
  rootContext.valueElement = currentElement
})

const selectedLabel = computed(() => {
  let list: string[] = []
  const options = Array.from(rootContext.optionsSet.value)
  const getOption = (value?: AcceptableValue) => options.find(option => valueComparator(value, option.value, rootContext.by))
  if (Array.isArray(rootContext.modelValue.value)) {
    list = rootContext.modelValue.value.map(value => getOption(value)?.textContent ?? '')
  }
  else {
    list = [getOption(rootContext.modelValue.value)?.textContent ?? '']
  }
  return list.filter(Boolean)
})

const slotText = computed(() => {
  return selectedLabel.value.length ? selectedLabel.value.join(', ') : props.placeholder
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    :style="{ pointerEvents: 'none' }"
    :data-placeholder="selectedLabel.length ? undefined : props.placeholder"
  >
    <slot
      :selected-label="selectedLabel"
      :model-value="rootContext.modelValue.value"
    >
      {{ slotText }}
    </slot>
  </Primitive>
</template>
