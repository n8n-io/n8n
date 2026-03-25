<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { AcceptableValue, DataOrientation, Direction, FormFieldProps } from '@/shared/types'
import { createContext, useDirection, useFormControl, useForwardExpose } from '@/shared'

export interface RadioGroupRootProps extends PrimitiveProps, FormFieldProps {
  /** The controlled value of the radio item to check. Can be binded as `v-model`. */
  modelValue?: AcceptableValue
  /**
   * The value of the radio item that should be checked when initially rendered.
   *
   * Use when you do not need to control the state of the radio items.
   */
  defaultValue?: AcceptableValue
  /** When `true`, prevents the user from interacting with radio items. */
  disabled?: boolean
  /** The orientation of the component. */
  orientation?: DataOrientation
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** When `true`, keyboard navigation will loop from last item to first, and vice versa. */
  loop?: boolean
}
export type RadioGroupRootEmits = {
  /** Event handler called when the radio group value changes */
  'update:modelValue': [payload: string]
}

interface RadioGroupRootContext {
  modelValue?: Readonly<Ref<AcceptableValue | undefined>>
  changeModelValue: (value?: AcceptableValue) => void
  disabled: Ref<boolean>
  loop: Ref<boolean>
  orientation: Ref<DataOrientation | undefined>
  name?: string
  required: Ref<boolean>
}

export const [injectRadioGroupRootContext, provideRadioGroupRootContext]
  = createContext<RadioGroupRootContext>('RadioGroupRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { RovingFocusGroup } from '@/RovingFocus'
import { VisuallyHiddenInput } from '@/VisuallyHidden'

const props = withDefaults(defineProps<RadioGroupRootProps>(), {
  disabled: false,
  required: false,
  orientation: undefined,
  loop: true,
})

const emits = defineEmits<RadioGroupRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { forwardRef, currentElement } = useForwardExpose()
const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
})

const { disabled, loop, orientation, name, required, dir: propDir } = toRefs(props)
const dir = useDirection(propDir)
const isFormControl = useFormControl(currentElement)

provideRadioGroupRootContext({
  modelValue,
  changeModelValue: (value) => {
    modelValue.value = value
  },
  disabled,
  loop,
  orientation,
  name: name?.value,
  required,
})
</script>

<template>
  <RovingFocusGroup
    as-child
    :orientation="orientation"
    :dir="dir"
    :loop="loop"
  >
    <Primitive
      :ref="forwardRef"
      role="radiogroup"
      :data-disabled="disabled ? '' : undefined"
      :as-child="asChild"
      :as="as"
      :aria-orientation="orientation"
      :aria-required="required"
      :dir="dir"
    >
      <slot :model-value="modelValue" />

      <VisuallyHiddenInput
        v-if="isFormControl && name"
        :required="required"
        :disabled="disabled"
        :value="modelValue"
        :name="name"
      />
    </Primitive>
  </RovingFocusGroup>
</template>
