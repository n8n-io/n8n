<script lang="ts">
import type { ComputedRef, CSSProperties, Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Color, ColorChannel, ColorSpace } from '@/shared/color'
import type { FormFieldProps } from '@/shared/types'
import { createContext, useFormControl, useForwardExpose } from '@/shared'

export interface ColorAreaRootProps extends PrimitiveProps, FormFieldProps {
  /** The color value (controlled). Can be a hex string or Color object. */
  modelValue?: string | Color
  /** The default color value (uncontrolled). */
  defaultValue?: string | Color
  /** The color space to operate in. */
  colorSpace?: ColorSpace
  /** Color channel for the horizontal (x) axis. */
  xChannel?: ColorChannel
  /** Color channel for the vertical (y) axis. */
  yChannel?: ColorChannel
  /** When `true`, prevents the user from interacting with the area. */
  disabled?: boolean
  /** The name of the x channel input element for form submission. */
  xName?: string
  /** The name of the y channel input element for form submission. */
  yName?: string
}

export type ColorAreaRootEmits = {
  'update:modelValue': [value: string]
  'update:color': [value: Color]
  'change': [value: string]
  'changeEnd': [value: string]
}

export interface ColorAreaRootContext {
  color: Ref<Color>
  xValue: Ref<number>
  yValue: Ref<number>
  xChannel: Ref<ColorChannel>
  yChannel: Ref<ColorChannel>
  colorSpace: Ref<ColorSpace>
  disabled: Ref<boolean>
  xRange: ComputedRef<{ min: number, max: number, step: number }>
  yRange: ComputedRef<{ min: number, max: number, step: number }>
  thumbRef: Ref<HTMLElement | undefined>
  updateValues: (x: number, y: number) => void
  commitValues: () => void
}

export const [injectColorAreaRootContext, provideColorAreaRootContext]
  = createContext<ColorAreaRootContext>('ColorAreaRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, nextTick, ref, toRefs, watch } from 'vue'
import { Primitive } from '@/Primitive'
import {
  colorToString,
  convertToHsb,
  convertToHsl,
  getAreaBackgroundStyle,
  getChannelRange,
  getChannelValue,
  normalizeColor,
  setChannelValues,
} from '@/shared/color'
import { VisuallyHiddenInput } from '@/VisuallyHidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ColorAreaRootProps>(), {
  colorSpace: 'hsl',
  xChannel: 'hue',
  yChannel: 'saturation',
  disabled: false,
  defaultValue: '#ff0000',
  as: 'div',
})

const emits = defineEmits<ColorAreaRootEmits>()

defineSlots<{
  default?: (props: {
    /** CSS styles for the color area background gradient */
    style: CSSProperties
  }) => any
}>()

const { colorSpace, xChannel, yChannel, disabled } = toRefs(props)
const { forwardRef, currentElement } = useForwardExpose()
const isFormControl = useFormControl(currentElement)

// Normalize the model value to a Color object
const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
})

// The actual color object for rendering
const color = computed({
  get: () => normalizeColor(modelValue.value ?? '#000000'),
  set: (newColor: Color) => {
    const hexString = colorToString(newColor, 'hex')
    modelValue.value = hexString
    emits('update:color', newColor)
  },
})

// Get channel ranges
const xRange = computed(() => getChannelRange(xChannel.value))
const yRange = computed(() => getChannelRange(yChannel.value))

// Store exact channel values as refs to avoid floating-point drift
// Initialize from the color value (rounded to nearest integer)
const xValue = ref(Math.round(getChannelValue(color.value, xChannel.value)))
const yValue = ref(Math.round(getChannelValue(color.value, yChannel.value)))

// Store the hue separately to preserve it when saturation is 0 (grayscale)
const hueValue = ref(colorSpace.value === 'hsl'
  ? convertToHsl(color.value).h
  : colorSpace.value === 'hsb'
    ? convertToHsb(color.value).h
    : 0)

// Track when we're in the middle of an update to prevent circular sync
let isUpdating = false

// Sync channel values when color changes externally
watch(() => color.value, (newColor) => {
  // Skip if we just triggered this update ourselves
  if (isUpdating)
    return

  const newX = Math.round(getChannelValue(newColor, xChannel.value))
  const newY = Math.round(getChannelValue(newColor, yChannel.value))

  // Only update if the rounded value meaningfully changed.
  // During drag, xValue/yValue store exact floats (e.g. 80.45).
  // External updates (e.g. hue slider) should not snap these to integers.
  if (Math.round(xValue.value) !== newX)
    xValue.value = newX
  if (Math.round(yValue.value) !== newY)
    yValue.value = newY

  // Update hue if saturation is not 0 (to preserve hue for grayscale colors)
  if (colorSpace.value === 'hsl') {
    const hsl = convertToHsl(newColor)
    if (hsl.s > 0)
      hueValue.value = hsl.h
  }
  else if (colorSpace.value === 'hsb') {
    const hsb = convertToHsb(newColor)
    if (hsb.s > 0)
      hueValue.value = hsb.h
  }
}, { immediate: true })

// Background styles for the color area
// Use preserved hue to ensure background doesn't change when saturation is 0
const areaStyles = computed(() => {
  // Create a color with the preserved hue for background computation
  let bgColor = color.value
  if (colorSpace.value === 'hsl' || colorSpace.value === 'hsb') {
    if (colorSpace.value === 'hsl') {
      bgColor = { space: 'hsl', h: hueValue.value, s: 100, l: 50, alpha: 1 }
    }
    else {
      bgColor = { space: 'hsb', h: hueValue.value, s: 100, b: 100, alpha: 1 }
    }
  }
  return getAreaBackgroundStyle(bgColor, xChannel.value, yChannel.value, colorSpace.value)
})

function updateValues(x: number, y: number) {
  const clampedX = Math.max(xRange.value.min, Math.min(xRange.value.max, x))
  const clampedY = Math.max(yRange.value.min, Math.min(yRange.value.max, y))

  // Update exact values
  xValue.value = clampedX
  yValue.value = clampedY

  // Prevent watch from syncing back to xValue/yValue
  isUpdating = true

  // Update color from exact values (with preserved hue)
  const channels: Array<{ channel: ColorChannel, value: number }> = [
    { channel: xChannel.value, value: clampedX },
    { channel: yChannel.value, value: clampedY },
  ]

  // Preserve hue only when it is NOT directly controlled by an axis
  const usesHueAxis = xChannel.value === 'hue' || yChannel.value === 'hue'
  if (!usesHueAxis && (colorSpace.value === 'hsl' || colorSpace.value === 'hsb')) {
    channels.push({ channel: 'hue', value: hueValue.value })
  }

  color.value = setChannelValues(color.value, channels)

  // Re-enable watch sync after Vue has processed the update
  nextTick(() => {
    isUpdating = false
  })
}

function commitValues() {
  emits('changeEnd', colorToString(color.value, 'hex'))
}

const thumbRef = ref<HTMLElement>()

provideColorAreaRootContext({
  color: computed(() => color.value) as Ref<Color>,
  xValue,
  yValue,
  xChannel,
  yChannel,
  colorSpace,
  disabled,
  xRange,
  yRange,
  thumbRef,
  updateValues,
  commitValues,
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="group"
    :aria-disabled="disabled ? 'true' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot :style="areaStyles" />

    <VisuallyHiddenInput
      v-if="isFormControl && xName"
      type="text"
      :value="xValue"
      :name="xName"
      :disabled="disabled"
    />
    <VisuallyHiddenInput
      v-if="isFormControl && yName"
      type="text"
      :value="yValue"
      :name="yName"
      :disabled="disabled"
    />
  </Primitive>
</template>
