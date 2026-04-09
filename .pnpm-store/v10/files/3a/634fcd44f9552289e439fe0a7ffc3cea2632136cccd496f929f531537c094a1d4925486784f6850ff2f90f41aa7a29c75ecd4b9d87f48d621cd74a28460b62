<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Color, ColorChannel, ColorChannel as ColorChannelType, ColorSpace } from '@/shared/color'
import type { DataOrientation, Direction, FormFieldProps } from '@/shared/types'
import { createContext, useDirection, useFormControl, useForwardExpose } from '@/shared'

export interface ColorSliderRootProps extends PrimitiveProps, FormFieldProps {
  /** The color value (controlled). Can be a hex string or Color object. */
  modelValue?: string | Color
  /** The default color value (uncontrolled). */
  defaultValue?: string | Color
  /** The color space to operate in. */
  colorSpace?: ColorSpace
  /** The color channel that this slider manipulates. */
  channel: ColorChannel
  /** The orientation of the slider. */
  orientation?: DataOrientation
  /** The reading direction of the slider. */
  dir?: Direction
  /** Whether the slider is visually inverted. */
  inverted?: boolean
  /** When `true`, prevents the user from interacting with the slider. */
  disabled?: boolean
  /** Custom step value for increment/decrement. Defaults to the channel's natural step. */
  step?: number
}

export type ColorSliderRootEmits = {
  'update:modelValue': [value: string | Color]
  'update:color': [value: Color]
  'change': [value: string]
  'changeEnd': [value: string]
}

export interface ColorSliderRootContext {
  color: Ref<Color>
  channelValue: ComputedRef<number>
  channel: Ref<ColorChannel>
  colorSpace: Ref<ColorSpace>
  orientation: Ref<DataOrientation>
  disabled: Ref<boolean>
  inverted: Ref<boolean>
  min: ComputedRef<number>
  max: ComputedRef<number>
  step: ComputedRef<number>
}

export const [injectColorSliderRootContext, provideColorSliderRootContext]
  = createContext<ColorSliderRootContext>('ColorSliderRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, ref, toRefs, watch } from 'vue'
import { colorToString, convertToHsb, convertToHsl, convertToRgb, getChannelRange, getChannelValue, normalizeColor, setChannelValue } from '@/shared/color'
import { SliderRoot } from '@/Slider'
import { VisuallyHiddenInput } from '@/VisuallyHidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ColorSliderRootProps>(), {
  colorSpace: 'hsl',
  orientation: 'horizontal',
  disabled: false,
  inverted: false,
  defaultValue: '#000000',
  as: 'span',
})

const emits = defineEmits<ColorSliderRootEmits>()

const { orientation, disabled, inverted, dir: propDir, channel, colorSpace, step: stepProp } = toRefs(props)
const dir = useDirection(propDir)
const { forwardRef, currentElement } = useForwardExpose()
const isFormControl = useFormControl(currentElement)

// Normalize the model value to a Color object
const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
})

// Convert a color to the native color space for the given channel.
// This ensures setChannelValue/getChannelValue operate without cross-space round-trips.
function toNativeSpace(color: Color, ch: ColorChannelType, space: ColorSpace): Color {
  switch (ch) {
    case 'hue':
    case 'lightness':
      return convertToHsl(color)
    case 'saturation':
      return space === 'hsb' ? convertToHsb(color) : convertToHsl(color)
    case 'brightness':
      return convertToHsb(color)
    case 'red':
    case 'green':
    case 'blue':
      return convertToRgb(color)
    case 'alpha':
      return color
    default:
      return color
  }
}

// Internal color ref that preserves color space precision.
// Convert to the channel's native space to avoid cross-space round-trips during drag.
const internalColor = ref<Color>(toNativeSpace(normalizeColor(modelValue.value ?? props.defaultValue ?? '#000000'), channel.value, colorSpace.value))

// Check if a color is achromatic (hue information is lost in hex round-trips)
function isAchromatic(color: Color): boolean {
  const hsl = convertToHsl(color)
  return hsl.s === 0 || hsl.l === 0 || hsl.l >= 100
}

// Sync internal color from external modelValue changes (e.g. parent updates)
watch(() => modelValue.value, (newVal) => {
  if (newVal == null)
    return
  const parsed = normalizeColor(newVal)
  const currentHex = colorToString(internalColor.value, 'hex')
  const newHex = colorToString(parsed, 'hex')
  // Only update if the external value actually changed (avoid overwriting
  // precision during our own drag updates)
  if (currentHex !== newHex) {
    const nativeColor = toNativeSpace(parsed, channel.value, colorSpace.value)
    const currentChannelVal = getChannelValue(internalColor.value, channel.value)
    const newChannelVal = getChannelValue(nativeColor, channel.value)

    // Preserve this slider's channel value when:
    // 1. Color is achromatic (hue completely lost in hex round-trip)
    // 2. Channel value diff is within 2% of range (8-bit RGB quantization drift)
    // We still update the rest of the color so the track gradient stays correct.
    const range = channelRange.value.max - channelRange.value.min
    const shouldPreserve = (channel.value === 'hue' && isAchromatic(parsed))
      || Math.abs(currentChannelVal - newChannelVal) < range * 0.02

    if (shouldPreserve) {
      internalColor.value = setChannelValue(nativeColor, channel.value, currentChannelVal)
    }
    else {
      internalColor.value = nativeColor
    }
  }
})

const color = computed({
  get: () => internalColor.value,
  set: (newColor: Color) => {
    internalColor.value = newColor
    const hexString = colorToString(newColor, 'hex')
    modelValue.value = hexString
    emits('update:color', newColor)
  },
})

// Get channel range
const channelRange = computed(() => getChannelRange(channel.value))
const min = computed(() => channelRange.value.min)
const max = computed(() => channelRange.value.max)
const step = computed(() => stepProp.value ?? channelRange.value.step)

// Current channel value
const channelValue = computed(() => getChannelValue(color.value, channel.value))

// Convert channel value to array format for SliderRoot
const sliderValue = computed({
  get: () => [channelValue.value],
  set: (newValue: number[]) => {
    const clamped = Math.max(min.value, Math.min(max.value, newValue[0]))
    const newColor = setChannelValue(color.value, channel.value, clamped)
    color.value = newColor
    emits('change', colorToString(newColor, 'hex'))
  },
})

function handleValueCommit(values: number[]) {
  emits('changeEnd', colorToString(color.value, 'hex'))
}

provideColorSliderRootContext({
  color: computed(() => color.value) as Ref<Color>,
  channelValue,
  channel,
  colorSpace,
  orientation,
  disabled,
  inverted,
  min,
  max,
  step,
})
</script>

<template>
  <SliderRoot
    v-bind="$attrs"
    :ref="forwardRef"
    v-model="sliderValue"
    :orientation="orientation"
    :dir="dir"
    :disabled="disabled"
    :inverted="inverted"
    :min="min"
    :max="max"
    :step="step"
    :as="as"
    :as-child="asChild"
    @value-commit="handleValueCommit"
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
  </SliderRoot>
</template>
