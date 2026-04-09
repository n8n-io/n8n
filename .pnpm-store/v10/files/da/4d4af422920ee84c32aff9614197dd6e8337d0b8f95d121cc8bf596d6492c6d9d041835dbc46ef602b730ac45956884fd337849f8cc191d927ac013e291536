<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Color, ColorChannel, ColorSpace } from '@/shared/color'
import type { FormFieldProps } from '@/shared/types'
import { createContext, useFormControl, useForwardExpose, useLocale } from '@/shared'

export interface ColorFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The color value (controlled). Can be a hex string or Color object. */
  modelValue?: string | Color
  /** The default color value (uncontrolled). */
  defaultValue?: string | Color
  /** The color space to operate in when displaying a channel. */
  colorSpace?: ColorSpace
  /** The color channel to display. If not provided, displays hex value. */
  channel?: ColorChannel
  /** Placeholder text when the field is empty. */
  placeholder?: string
  /** When `true`, prevents the user from interacting with the field. */
  disabled?: boolean
  /** When `true`, the field is read-only. */
  readonly?: boolean
  /** When `true`, prevents the value from changing on wheel scroll. */
  disableWheelChange?: boolean
  /** The locale to use for number formatting. */
  locale?: string
  /** Custom step value for increment/decrement. Defaults to channel step or 1 for hex. */
  step?: number
}

export type ColorFieldRootEmits = {
  'update:modelValue': [value: string]
  'update:color': [value: Color]
}

export interface ColorFieldRootContext {
  color: Ref<Color>
  inputValue: Ref<string>
  channel: Ref<ColorChannel | undefined>
  colorSpace: Ref<ColorSpace>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  disableWheelChange: Ref<boolean>
  placeholder: Ref<string | undefined>
  updateValue: (value: string) => void
  commit: () => void
  increment: () => void
  decrement: () => void
  incrementToMax: () => void
  decrementToMin: () => void
  incrementPage: () => void
  decrementPage: () => void
  handleWheel: (event: WheelEvent) => void
}

export const [injectColorFieldRootContext, provideColorFieldRootContext]
  = createContext<ColorFieldRootContext>('ColorFieldRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, ref, toRefs, watch } from 'vue'
import { Primitive } from '@/Primitive'
import {
  colorToString,
  convertToRgb,
  getChannelRange,
  getChannelValue,
  isValidColor,
  normalizeColor,
  parseColor,
  setChannelValue,
} from '@/shared/color'
import { VisuallyHiddenInput } from '@/VisuallyHidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ColorFieldRootProps>(), {
  colorSpace: 'hsl',
  disabled: false,
  readonly: false,
  disableWheelChange: false,
  defaultValue: '#000000',
  as: 'div',
})

const emits = defineEmits<ColorFieldRootEmits>()

const { colorSpace, channel, disabled, readonly, disableWheelChange, placeholder, locale: propLocale, step: stepProp } = toRefs(props)
const { forwardRef, currentElement } = useForwardExpose()
const isFormControl = useFormControl(currentElement)
const locale = useLocale(propLocale)

// Normalize the model value
const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
})

const color = computed({
  get: () => normalizeColor(modelValue.value ?? '#000000'),
  set: (newColor: Color) => {
    const hexString = colorToString(newColor, 'hex')
    modelValue.value = hexString
    emits('update:color', newColor)
  },
})

// Input value for the text field
const inputValue = ref('')
const isEditing = ref(false)

// Update input value when color changes (unless user is editing)
watch(() => color.value, (newColor) => {
  if (!isEditing.value) {
    inputValue.value = formatValue(newColor)
  }
}, { immediate: true })

function formatValue(c: Color): string {
  if (channel.value) {
    const value = getChannelValue(c, channel.value)
    if (channel.value === 'alpha') {
      return String(Math.round(value))
    }
    return String(Math.round(value))
  }
  // Hex mode
  return colorToString(c, 'hex')
}

// The effective step size
const MIN_HEX_INT = 0x000000
const MAX_HEX_INT = 0xFFFFFF
const PAGE_STEP_MULTIPLIER = 10

function getStep(): number {
  if (stepProp.value != null)
    return stepProp.value
  if (channel.value)
    return getChannelRange(channel.value).step
  // Hex mode: step by 1 in the integer space (like react-spectrum)
  return 1
}

function updateValue(value: string) {
  inputValue.value = value
}

function commit() {
  isEditing.value = false

  if (channel.value) {
    // Channel mode - parse as number
    const numValue = parseFloat(inputValue.value)
    if (!isNaN(numValue)) {
      const range = getChannelRange(channel.value)
      const clamped = Math.max(range.min, Math.min(range.max, numValue))
      color.value = setChannelValue(color.value, channel.value, clamped)
    }
    // Reset to formatted value
    inputValue.value = formatValue(color.value)
  }
  else {
    // Hex mode - parse as color
    const trimmed = inputValue.value.trim()
    if (isValidColor(trimmed)) {
      color.value = parseColor(trimmed)
    }
    // Reset to formatted value
    inputValue.value = formatValue(color.value)
  }
}

function addHexValue(delta: number) {
  const intDelta = Math.trunc(delta)
  const hexInt = color.value.space === 'rgb'
    ? ((Math.round((color.value as any).r) << 16) | (Math.round((color.value as any).g) << 8) | Math.round((color.value as any).b))
    : (() => {
        const rgb = convertToRgb(color.value)
        return (Math.round(rgb.r) << 16) | (Math.round(rgb.g) << 8) | Math.round(rgb.b)
      })()
  const clamped = Math.min(Math.max(hexInt + intDelta, MIN_HEX_INT), MAX_HEX_INT)
  const hex = `#${clamped.toString(16).padStart(6, '0')}`
  color.value = parseColor(hex)
  inputValue.value = formatValue(color.value)
}

function increment() {
  if (disabled.value || readonly.value)
    return
  const step = getStep()
  if (channel.value) {
    const currentValue = getChannelValue(color.value, channel.value)
    color.value = setChannelValue(color.value, channel.value, currentValue + step)
    inputValue.value = formatValue(color.value)
  }
  else {
    addHexValue(step)
  }
}

function decrement() {
  if (disabled.value || readonly.value)
    return
  const step = getStep()
  if (channel.value) {
    const currentValue = getChannelValue(color.value, channel.value)
    color.value = setChannelValue(color.value, channel.value, currentValue - step)
    inputValue.value = formatValue(color.value)
  }
  else {
    addHexValue(-step)
  }
}

function incrementPage() {
  if (disabled.value || readonly.value)
    return
  const step = getStep() * PAGE_STEP_MULTIPLIER
  if (channel.value) {
    const currentValue = getChannelValue(color.value, channel.value)
    color.value = setChannelValue(color.value, channel.value, currentValue + step)
    inputValue.value = formatValue(color.value)
  }
  else {
    addHexValue(step)
  }
}

function decrementPage() {
  if (disabled.value || readonly.value)
    return
  const step = getStep() * PAGE_STEP_MULTIPLIER
  if (channel.value) {
    const currentValue = getChannelValue(color.value, channel.value)
    color.value = setChannelValue(color.value, channel.value, currentValue - step)
    inputValue.value = formatValue(color.value)
  }
  else {
    addHexValue(-step)
  }
}

function incrementToMax() {
  if (disabled.value || readonly.value)
    return
  if (channel.value) {
    const range = getChannelRange(channel.value)
    color.value = setChannelValue(color.value, channel.value, range.max)
    inputValue.value = formatValue(color.value)
  }
  else {
    addHexValue(MAX_HEX_INT)
  }
}

function decrementToMin() {
  if (disabled.value || readonly.value)
    return
  if (channel.value) {
    const range = getChannelRange(channel.value)
    color.value = setChannelValue(color.value, channel.value, range.min)
    inputValue.value = formatValue(color.value)
  }
  else {
    addHexValue(-MAX_HEX_INT)
  }
}

function handleWheel(event: WheelEvent) {
  if (disableWheelChange.value || disabled.value || readonly.value)
    return

  event.preventDefault()

  if (event.deltaY > 0)
    decrement()
  else
    increment()
}

provideColorFieldRootContext({
  color: computed(() => color.value) as Ref<Color>,
  inputValue,
  channel,
  colorSpace,
  disabled,
  readonly,
  disableWheelChange,
  placeholder,
  updateValue,
  commit,
  increment,
  decrement,
  incrementToMax,
  decrementToMin,
  incrementPage,
  decrementPage,
  handleWheel,
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="group"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
  >
    <slot />

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      type="text"
      :value="colorToString(color, 'hex')"
      :name="name"
      :disabled="disabled"
      :required="required"
    />
  </Primitive>
</template>
