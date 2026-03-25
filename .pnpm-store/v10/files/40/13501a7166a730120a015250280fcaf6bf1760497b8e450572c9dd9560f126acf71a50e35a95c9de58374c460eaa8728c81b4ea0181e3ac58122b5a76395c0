<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import type { FormFieldProps } from '@/shared/types'
import { useFormControl, useForwardExpose } from '@/shared'
import { injectToggleGroupRootContext } from '@/ToggleGroup/ToggleGroupRoot.vue'
import VisuallyHiddenInput from '@/VisuallyHidden/VisuallyHiddenInput.vue'

export type ToggleEmits = {
  /** Event handler called when the value of the toggle changes. */
  'update:modelValue': [value: boolean]
}

export type DataState = 'on' | 'off'

export interface ToggleProps extends PrimitiveProps, FormFieldProps {
  /**
   * The pressed state of the toggle when it is initially rendered. Use when you do not need to control its open state.
   */
  defaultValue?: boolean
  /**
   * The controlled pressed state of the toggle. Can be bind as `v-model`.
   */
  modelValue?: boolean | null
  /**
   * When `true`, prevents the user from interacting with the toggle.
   */
  disabled?: boolean
}
</script>

<script setup lang="ts">
import type { Ref } from 'vue'
import { useVModel } from '@vueuse/core'
import { computed } from 'vue'
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<ToggleProps>(), {
  modelValue: undefined,
  disabled: false,
  as: 'button',
})

const emits = defineEmits<ToggleEmits>()

defineSlots<{
  default?: (props: {
    /** Current value */
    modelValue: typeof modelValue.value
    /** Current state */
    state: typeof dataState.value
    /** Current pressed state */
    pressed: typeof modelValue.value
    /** Current disabled state */
    disabled: boolean
  }) => any
}>()

const { forwardRef, currentElement } = useForwardExpose()
const toggleGroupContext = injectToggleGroupRootContext(null)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
}) as Ref<boolean>

function togglePressed() {
  modelValue.value = !modelValue.value
}

const dataState = computed<DataState>(() => {
  return modelValue.value ? 'on' : 'off'
})

const isFormControl = useFormControl(currentElement)
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :type="as === 'button' ? 'button' : undefined"
    :as-child="props.asChild"
    :as="as"
    :aria-pressed="modelValue"
    :data-state="dataState"
    :data-disabled="disabled ? '' : undefined"
    :disabled="disabled"
    @click="togglePressed"
  >
    <slot
      :model-value="modelValue"
      :disabled="disabled"
      :pressed="modelValue"
      :state="dataState"
    />

    <VisuallyHiddenInput
      v-if="isFormControl && name && !toggleGroupContext"
      type="checkbox"
      :name="name"
      :value="modelValue"
      :required="required"
    />
  </Primitive>
</template>
