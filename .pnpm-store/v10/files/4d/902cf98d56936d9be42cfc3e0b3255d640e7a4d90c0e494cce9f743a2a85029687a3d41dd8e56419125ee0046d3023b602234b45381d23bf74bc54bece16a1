<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { computed } from 'vue'
import { injectNumberFieldRootContext } from './NumberFieldRoot.vue'
import { usePressedHold } from './utils'

export interface NumberFieldDecrementProps extends PrimitiveProps {
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { Primitive, usePrimitiveElement } from '@/Primitive'

const props = withDefaults(defineProps<NumberFieldDecrementProps>(), {
  as: 'button',
})

const rootContext = injectNumberFieldRootContext()
const isDisabled = computed(() => rootContext.disabled?.value || rootContext.readonly.value || props.disabled || rootContext.isDecreaseDisabled.value)

const { primitiveElement, currentElement } = usePrimitiveElement()
const { isPressed, onTrigger } = usePressedHold({ target: currentElement, disabled: isDisabled })

onTrigger(() => {
  rootContext.handleDecrease()
})
</script>

<template>
  <Primitive
    v-bind="props"
    ref="primitiveElement"
    tabindex="-1"
    aria-label="Decrease"
    :type="as === 'button' ? 'button' : undefined"
    :style="{
      userSelect: isPressed ? 'none' : undefined,
    }"
    :disabled="isDisabled ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :data-pressed="isPressed ? 'true' : undefined"
    @contextmenu.prevent
  >
    <slot />
  </Primitive>
</template>
