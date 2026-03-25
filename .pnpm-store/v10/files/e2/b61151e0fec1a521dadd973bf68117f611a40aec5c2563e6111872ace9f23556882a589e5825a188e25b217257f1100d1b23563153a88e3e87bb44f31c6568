<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import { createContext, isNullish, useForwardExpose } from '@/shared'

export type ProgressRootEmits = {
  /** Event handler called when the progress value changes */
  'update:modelValue': [value: string[] | undefined]
  /** Event handler called when the max value changes */
  'update:max': [value: number]
}

export interface ProgressRootProps extends PrimitiveProps {
  /** The progress value. Can be bind as `v-model`. */
  modelValue?: number | null
  /** The maximum progress value. */
  max?: number
  /**
   * A function to get the accessible label text in a human-readable format.
   *
   *  If not provided, the value label will be read as the numeric value as a percentage of the max value.
   */
  getValueLabel?: (value: number | null | undefined, max: number) => string | undefined
  /**
   * A function to get the accessible value text representing the current value in a human-readable format.
   */
  getValueText?: (value: number | null | undefined, max: number) => string | undefined
}

const DEFAULT_MAX = 100

interface ProgressRootContext {
  modelValue?: Readonly<Ref<ProgressRootProps['modelValue']>>
  max: Readonly<Ref<number>>
  progressState: ComputedRef<ProgressState>
}

export const [injectProgressRootContext, provideProgressRootContext]
  = createContext<ProgressRootContext>('ProgressRoot')

export type ProgressState = 'indeterminate' | 'loading' | 'complete'

const isNumber = (v: any): v is number => typeof v === 'number'

function validateValue(value: any, max: number): number | null {
  const isValidValueError
    = isNullish(value)
      || (isNumber(value) && !Number.isNaN(value) && value <= max && value >= 0)

  if (isValidValueError)
    return value as null

  console.error(`Invalid prop \`value\` of value \`${value}\` supplied to \`ProgressRoot\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${DEFAULT_MAX} if no \`max\` prop is set)
  - \`null\`  or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`)
  return null
}

function validateMax(max: number): number {
  const isValidMaxError = isNumber(max) && !Number.isNaN(max) && max > 0

  if (isValidMaxError)
    return max

  console.error(
    `Invalid prop \`max\` of value \`${max}\` supplied to \`ProgressRoot\`. Only numbers greater than 0 are valid max values. Defaulting to \`${DEFAULT_MAX}\`.`,
  )
  return DEFAULT_MAX
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, nextTick, watch } from 'vue'
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<ProgressRootProps>(), {
  max: DEFAULT_MAX,
  getValueLabel: (value: number | null | undefined, max: number) =>
    isNumber(value) ? `${Math.round((value / max) * DEFAULT_MAX)}%` : undefined,
})

const emit = defineEmits<ProgressRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

useForwardExpose()
const modelValue = useVModel(props, 'modelValue', emit, {
  passive: (props.modelValue === undefined) as false,
})

const max = useVModel(props, 'max', emit, {
  passive: (props.max === undefined) as false,
})

// ------- Watch for correct values -------
watch(
  () => modelValue.value,
  async (value) => {
    const correctedValue = validateValue(value, props.max)
    if (correctedValue !== value) {
      await nextTick()
      modelValue.value = correctedValue
    }
  },
  { immediate: true },
)

watch(
  () => props.max,
  (newMax) => {
    const correctedMax = validateMax(props.max)
    if (correctedMax !== newMax)
      max.value = correctedMax
  },
  { immediate: true },
)
// ------- End of watch for correct values -------

const progressState = computed<ProgressState>(() => {
  if (isNullish(modelValue.value))
    return 'indeterminate'
  if (modelValue.value === max.value)
    return 'complete'
  return 'loading'
})

provideProgressRootContext({
  modelValue,
  max,
  progressState,
})
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :aria-valuemax="max"
    :aria-valuemin="0"
    :aria-valuenow="isNumber(modelValue) ? modelValue : undefined"
    :aria-valuetext="getValueText?.(modelValue, max)"
    :aria-label="getValueLabel(modelValue, max)"
    role="progressbar"
    :data-state="progressState"
    :data-value="modelValue ?? undefined"
    :data-max="max"
  >
    <slot :model-value="modelValue" />
  </Primitive>
</template>
