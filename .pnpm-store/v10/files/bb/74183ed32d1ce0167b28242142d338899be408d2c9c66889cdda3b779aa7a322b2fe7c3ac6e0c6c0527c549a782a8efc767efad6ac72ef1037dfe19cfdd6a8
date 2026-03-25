<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { AcceptableValue, DataOrientation, Direction, FormFieldProps, SingleOrMultipleProps } from '../shared/types'
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useDirection, useFormControl, useForwardExpose } from '@/shared'
import VisuallyHiddenInput from '@/VisuallyHidden/VisuallyHiddenInput.vue'

export interface ToggleGroupRootProps<T = AcceptableValue | AcceptableValue[]>
  extends PrimitiveProps, FormFieldProps, SingleOrMultipleProps<T> {
  /** When `false`, navigating through the items using arrow keys will be disabled. */
  rovingFocus?: boolean
  /** When `true`, prevents the user from interacting with the toggle group and all its items. */
  disabled?: boolean
  /** The orientation of the component, which determines how focus moves: `horizontal` for left/right arrows and `vertical` for up/down arrows. */
  orientation?: DataOrientation
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** When `loop` and `rovingFocus` is `true`, keyboard navigation will loop from last item to first, and vice versa. */
  loop?: boolean
}
export type ToggleGroupRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [payload: AcceptableValue | AcceptableValue[]]
}

interface ToggleGroupRootContext {
  isSingle: ComputedRef<boolean>
  modelValue: Ref<AcceptableValue | AcceptableValue[] | undefined>
  changeModelValue: (value: AcceptableValue) => void
  dir?: Ref<Direction>
  orientation?: DataOrientation
  loop: Ref<boolean>
  rovingFocus: Ref<boolean>
  disabled?: Ref<boolean>
}

export const [injectToggleGroupRootContext, provideToggleGroupRootContext]
  = createContext<ToggleGroupRootContext>('ToggleGroupRoot')
</script>

<script setup lang="ts">
import { toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { RovingFocusGroup } from '@/RovingFocus'
import { useSingleOrMultipleValue } from '@/shared/useSingleOrMultipleValue'

const props = withDefaults(defineProps<ToggleGroupRootProps>(), {
  loop: true,
  rovingFocus: true,
  disabled: false,
})
const emits = defineEmits<ToggleGroupRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current toggle values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { loop, rovingFocus, disabled, dir: propDir } = toRefs(props)
const dir = useDirection(propDir)
const { forwardRef, currentElement } = useForwardExpose()

const { modelValue, changeModelValue, isSingle } = useSingleOrMultipleValue(props, emits)
const isFormControl = useFormControl(currentElement)

provideToggleGroupRootContext({
  isSingle,
  modelValue,
  changeModelValue,
  dir,
  orientation: props.orientation,
  loop,
  rovingFocus,
  disabled,
})
</script>

<template>
  <component
    :is="rovingFocus ? RovingFocusGroup : Primitive"
    as-child
    :orientation="rovingFocus ? orientation : undefined"
    :dir="dir"
    :loop="rovingFocus ? loop : undefined"
  >
    <Primitive
      :ref="forwardRef"
      role="group"
      :as-child="asChild"
      :as="as"
    >
      <slot :model-value="modelValue" />

      <VisuallyHiddenInput
        v-if="isFormControl && name"
        :name="name"
        :required="required"
        :value="modelValue"
      />
    </Primitive>
  </component>
</template>
