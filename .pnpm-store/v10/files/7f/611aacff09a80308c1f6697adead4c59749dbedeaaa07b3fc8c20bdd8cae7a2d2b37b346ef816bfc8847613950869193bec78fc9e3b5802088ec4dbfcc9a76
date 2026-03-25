<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectSelectRootContext } from './SelectRoot.vue'

export interface SelectItemTextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { Primitive } from '@/Primitive'
import { injectSelectContentContext } from './SelectContentImpl.vue'
import { injectSelectItemContext } from './SelectItem.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SelectItemTextProps>(), {
  as: 'span',
})

const rootContext = injectSelectRootContext()
const contentContext = injectSelectContentContext()
const itemContext = injectSelectItemContext()

const { forwardRef, currentElement: itemTextElement } = useForwardExpose()

const optionProps = computed(() => {
  return {
    value: itemContext.value,
    disabled: itemContext.disabled.value,
    textContent: itemTextElement.value?.textContent ?? itemContext.value?.toString() ?? '',
  }
})

onMounted(() => {
  if (!itemTextElement.value)
    return
  itemContext.onItemTextChange(itemTextElement.value)
  contentContext.itemTextRefCallback(
    itemTextElement.value,
    itemContext.value,
    itemContext.disabled.value,
  )
  rootContext.onOptionAdd(optionProps.value)
})

onUnmounted(() => {
  rootContext.onOptionRemove(optionProps.value)
})
</script>

<template>
  <Primitive
    :id="itemContext.textId"
    :ref="forwardRef"
    v-bind="{ ...props, ...$attrs }"
  >
    <slot />
  </Primitive>
</template>
