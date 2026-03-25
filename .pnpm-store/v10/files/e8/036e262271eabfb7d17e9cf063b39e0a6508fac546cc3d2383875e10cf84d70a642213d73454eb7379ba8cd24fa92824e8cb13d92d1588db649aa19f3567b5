<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Direction, FormFieldProps } from '@/shared/types'
import { computed, ref, toRefs, watch } from 'vue'
import { createContext, useDirection, useForwardExpose } from '@/shared'
import VisuallyHiddenInput from '@/VisuallyHidden/VisuallyHiddenInput.vue'

export type PinInputType = 'text' | 'number'

// Using this type to avoid mixed arrays (string | number)[].
// The value type can be number[] only when the type is explicitly set to 'number'
export type PinInputValue<Type extends PinInputType> = [Type] extends ['number'] ? number[] : string[]

// provide the mixed arrays because the `type` is dynamic in the context
export type PinInputContextValue<Type extends PinInputType = 'text'> =
  Type extends 'number'
    ? Type extends 'string'
      ? string[] | number[]
      : number[]
    : string[]

export type PinInputRootEmits<Type extends PinInputType = 'text'> = {
  'update:modelValue': [value: PinInputValue<Type>]
  'complete': [value: PinInputValue<Type>]
}

export interface PinInputRootProps<Type extends PinInputType = 'text'> extends PrimitiveProps, FormFieldProps {
  /** The controlled checked state of the pin input. Can be binded as `v-model`. */
  modelValue?: PinInputValue<Type> | null
  /** The default value of the pin inputs when it is initially rendered. Use when you do not need to control its checked state. */
  defaultValue?: PinInputValue<Type>[]
  /** The placeholder character to use for empty pin-inputs. */
  placeholder?: string
  /** When `true`, pin inputs will be treated as password. */
  mask?: boolean
  /** When `true`, mobile devices will autodetect the OTP from messages or clipboard, and enable the autocomplete field. */
  otp?: boolean
  /** Input type for the inputs. */
  type?: Type
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** When `true`, prevents the user from interacting with the pin input */
  disabled?: boolean
  /** Id of the element */
  id?: string
}

export interface PinInputRootContext<Type extends PinInputType = 'text'> {
  modelValue: Ref<PinInputContextValue<Type>>
  currentModelValue: ComputedRef<PinInputContextValue<Type>>
  mask: Ref<boolean>
  otp: Ref<boolean>
  placeholder: Ref<string>
  type: Ref<PinInputType>
  dir: Ref<Direction>
  disabled: Ref<boolean>
  isCompleted: ComputedRef<boolean>
  inputElements?: Ref<Set<HTMLInputElement>>
  onInputElementChange: (el: HTMLInputElement) => void
  isNumericMode: ComputedRef<boolean>
}

export const [injectPinInputRootContext, providePinInputRootContext]
  = createContext<PinInputRootContext<PinInputType>>('PinInputRoot')
</script>

<script setup lang="ts" generic="Type extends PinInputType">
import { useVModel } from '@vueuse/core'
import { Primitive } from '@/Primitive'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<PinInputRootProps<Type>>(), {
  placeholder: '',
  type: 'text' as any,
})
const emits = defineEmits<PinInputRootEmits<Type>>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { mask, otp, placeholder, type, disabled, dir: propDir } = toRefs(props)
const { forwardRef } = useForwardExpose()
const dir = useDirection(propDir)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? [] as any,
  passive: (props.modelValue === undefined) as false,
}) as Ref<PinInputValue<Type>>

const currentModelValue = computed(() => Array.isArray(modelValue.value) ? [...modelValue.value] : [])

const inputElements = ref<Set<HTMLInputElement>>(new Set())
function onInputElementChange(el: HTMLInputElement) {
  inputElements.value.add(el)
}

const isNumericMode = computed(() => props.type === 'number')
const isCompleted = computed(() => {
  const modelValues = currentModelValue.value.filter(i => !!i || (isNumericMode.value && i === 0))
  return modelValues.length === inputElements.value.size
})

watch(modelValue, () => {
  if (isCompleted.value)
    emits('complete', modelValue.value)
}, { deep: true })

providePinInputRootContext({
  modelValue,
  currentModelValue: currentModelValue as ComputedRef<PinInputValue<Type>>,
  mask,
  otp,
  placeholder,
  type,
  dir,
  disabled,
  isCompleted,
  inputElements,
  onInputElementChange,
  isNumericMode,
})
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :ref="forwardRef"
    :dir="dir"
    :data-complete="isCompleted ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot :model-value="modelValue" />

    <VisuallyHiddenInput
      :id="id"
      as="input"
      feature="focusable"
      tabindex="-1"
      :value="currentModelValue.join('')"
      :name="name ?? ''"
      :disabled="disabled"
      :required="required"
      @focus="Array.from(inputElements)?.[0]?.focus()"
    />
  </Primitive>
</template>
