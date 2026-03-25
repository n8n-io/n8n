<script lang="ts">
import type { HTMLAttributes, Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { FormFieldProps } from '@/shared/types'
import { useVModel } from '@vueuse/core'
import { computed, ref, toRefs } from 'vue'
import { clamp, createContext, isNullish, snapValueToStep, useFormControl, useLocale } from '@/shared'

export interface NumberFieldRootProps extends PrimitiveProps, FormFieldProps {
  defaultValue?: number
  modelValue?: number | null
  /** The smallest value allowed for the input. */
  min?: number
  /** The largest value allowed for the input. */
  max?: number
  /** The amount that the input value changes with each increment or decrement "tick". */
  step?: number
  /** When `false`, prevents the value from snapping to the nearest increment of the step value */
  stepSnapping?: boolean
  /** Formatting options for the value displayed in the number field. This also affects what characters are allowed to be typed by the user. */
  formatOptions?: Intl.NumberFormatOptions
  /** The locale to use for formatting dates */
  locale?: string
  /** When `true`, prevents the user from interacting with the Number Field. */
  disabled?: boolean
  /** When `true`, the Number Field is read-only. */
  readonly?: boolean
  /** When `true`, prevents the value from changing on wheel scroll. */
  disableWheelChange?: boolean
  /** When `true`, inverts the direction of the wheel change. */
  invertWheelChange?: boolean
  /** Id of the element */
  id?: string
}

export type NumberFieldRootEmits = {
  'update:modelValue': [val: number]
}

interface NumberFieldRootContext {
  modelValue: Ref<number | undefined>
  handleIncrease: (multiplier?: number) => void
  handleDecrease: (multiplier?: number) => void
  handleMinMaxValue: (type: 'min' | 'max') => void
  inputEl: Ref<HTMLInputElement | undefined>
  onInputElement: (el: HTMLInputElement) => void
  inputMode: Ref<HTMLAttributes['inputmode']>
  textValue: Ref<string>
  validate: (val: string) => boolean
  applyInputValue: (val: string) => void
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  disableWheelChange: Ref<boolean>
  invertWheelChange: Ref<boolean>
  max: Ref<number | undefined>
  min: Ref<number | undefined>
  isDecreaseDisabled: Ref<boolean>
  isIncreaseDisabled: Ref<boolean>
  id: Ref<string | undefined>
}

export const [injectNumberFieldRootContext, provideNumberFieldRootContext] = createContext<NumberFieldRootContext>('NumberFieldRoot')
</script>

<script setup lang="ts">
import { Primitive, usePrimitiveElement } from '@/Primitive'
import { VisuallyHiddenInput } from '@/VisuallyHidden'
import { handleDecimalOperation, useNumberFormatter, useNumberParser } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<NumberFieldRootProps>(), {
  as: 'div',
  defaultValue: undefined,
  step: 1,
  stepSnapping: true,
})
const emits = defineEmits<NumberFieldRootEmits>()
const { disabled, readonly, disableWheelChange, invertWheelChange, min, max, step, stepSnapping, formatOptions, id, locale: propLocale } = toRefs(props)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
}) as Ref<number | undefined>

const { primitiveElement, currentElement } = usePrimitiveElement()

const locale = useLocale(propLocale)
const isFormControl = useFormControl(currentElement)
const inputEl = ref<HTMLInputElement>()

const isDecreaseDisabled = computed(() => (
  !isNullish(modelValue.value) && (
    clampInputValue(modelValue.value) === min.value
    || (min.value && !isNaN(modelValue.value)
    )
      ? (handleDecimalOperation('-', modelValue.value, step.value) < min.value)
      : false)),
)
const isIncreaseDisabled = computed(() => (
  !isNullish(modelValue.value) && (
    clampInputValue(modelValue.value) === max.value
    || (max.value && !isNaN(modelValue.value)
    )
      ? (handleDecimalOperation('+', modelValue.value, step.value) > max.value)
      : false)),
)

function handleChangingValue(type: 'increase' | 'decrease', multiplier = 1) {
  inputEl.value?.focus()
  if (props.disabled || props.readonly)
    return
  const currentInputValue = numberParser.parse(inputEl.value?.value ?? '')
  if (isNaN(currentInputValue)) {
    modelValue.value = min.value ?? 0
  }
  else {
    if (type === 'increase')
      modelValue.value = clampInputValue(currentInputValue + ((step.value ?? 1) * multiplier))
    else
      modelValue.value = clampInputValue(currentInputValue - ((step.value ?? 1) * multiplier))
  }
}

function handleIncrease(multiplier = 1) {
  handleChangingValue('increase', multiplier)
}
function handleDecrease(multiplier = 1) {
  handleChangingValue('decrease', multiplier)
}

function handleMinMaxValue(type: 'min' | 'max') {
  if (type === 'min' && min.value !== undefined)
    modelValue.value = clampInputValue(min.value)
  else if (type === 'max' && max.value !== undefined)
    modelValue.value = clampInputValue(max.value)
}

// Formatter
const numberFormatter = useNumberFormatter(locale, formatOptions)
const numberParser = useNumberParser(locale, formatOptions)

const inputMode = computed<HTMLAttributes['inputmode']>(() => {
  // The inputMode attribute influences the software keyboard that is shown on touch devices.
  // Browsers and operating systems are quite inconsistent about what keys are available, however.
  // We choose between numeric and decimal based on whether we allow negative and fractional numbers,
  // and based on testing on various devices to determine what keys are available in each inputMode.
  const hasDecimals = numberFormatter.resolvedOptions().maximumFractionDigits! > 0

  return hasDecimals ? 'decimal' : 'numeric'
})
// Replace negative textValue formatted using currencySign: 'accounting'
// with a textValue that can be announced using a minus sign.
const textValueFormatter = useNumberFormatter(locale, formatOptions)
const textValue = computed(() => isNullish(modelValue.value) || isNaN(modelValue.value) ? '' : textValueFormatter.format(modelValue.value))

function validate(val: string) {
  return numberParser.isValidPartialNumber(val, min.value, max.value)
}

function setInputValue(val: string) {
  if (inputEl.value)
    inputEl.value.value = val
}

function clampInputValue(val: number) {
  // Clamp to min and max, round to the nearest step, and round to specified number of digits
  let clampedValue: number
  if (step.value === undefined || isNaN(step.value) || !stepSnapping.value)
    clampedValue = clamp(val, min.value, max.value)
  else
    clampedValue = snapValueToStep(val, min.value, max.value, step.value)

  clampedValue = numberParser.parse(numberFormatter.format(clampedValue))
  return clampedValue
}

function applyInputValue(val: string) {
  const parsedValue = numberParser.parse(val)
  modelValue.value = isNaN(parsedValue) ? undefined : clampInputValue(parsedValue)
  // Set to empty state if input value is empty
  if (!val.length)
    return setInputValue(val)

  // if it failed to parse, then reset input to formatted version of current number
  if (isNaN(parsedValue))
    return setInputValue(textValue.value)

  return setInputValue(textValue.value)
}

provideNumberFieldRootContext({
  modelValue,
  handleDecrease,
  handleIncrease,
  handleMinMaxValue,
  inputMode,
  inputEl,
  onInputElement: el => inputEl.value = el,
  textValue,
  validate,
  applyInputValue,
  disabled,
  readonly,
  disableWheelChange,
  invertWheelChange,
  max,
  min,
  isDecreaseDisabled,
  isIncreaseDisabled,
  id,
})
</script>

<template>
  <Primitive
    v-bind="$attrs"
    ref="primitiveElement"
    role="group"
    :as="as"
    :as-child="asChild"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
  >
    <slot
      :model-value="modelValue"
      :text-value="textValue"
    />

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      type="text"
      :value="modelValue"
      :name="name"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
    />
  </Primitive>
</template>
