<script lang="ts">
import type { Ref } from 'vue'
import type { DataOrientation, Direction } from '../shared/types'
import type { PrimitiveProps } from '@/Primitive'
import { useVModel } from '@vueuse/core'
import { computed, nextTick, ref, toRefs, watch } from 'vue'
import { Primitive } from '@/Primitive'
import { createContext, useDirection, useForwardExpose } from '@/shared'

export interface StepperRootContext {
  modelValue: Ref<number | undefined>
  changeModelValue: (value: number) => void
  orientation: Ref<DataOrientation>
  dir: Ref<Direction>
  linear: Ref<boolean>
  totalStepperItems: Ref<Set<HTMLElement>>
}

export interface StepperRootProps extends PrimitiveProps {
  /**
   * The value of the step that should be active when initially rendered. Use when you do not need to control the state of the steps.
   */
  defaultValue?: number
  /**
   * The orientation the steps are laid out.
   * Mainly so arrow navigation is done accordingly (left & right vs. up & down).
   * @defaultValue horizontal
   */
  orientation?: DataOrientation
  /**
   * The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction
  /** The controlled value of the step to activate. Can be bound as `v-model`. */
  modelValue?: number
  /** Whether or not the steps must be completed in order. */
  linear?: boolean
}
export type StepperRootEmits = {
  /** Event handler called when the value changes */
  'update:modelValue': [payload: number | undefined]
}

export const [injectStepperRootContext, provideStepperRootContext]
  = createContext<StepperRootContext>('StepperRoot')
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<StepperRootProps>(), {
  orientation: 'horizontal',
  linear: true,
  defaultValue: 1,
})
const emits = defineEmits<StepperRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current step */
    modelValue: number | undefined
    /** Total number of steps */
    totalSteps: number
    /** Whether or not the next step is disabled */
    isNextDisabled: boolean
    /** Whether or not the previous step is disabled */
    isPrevDisabled: boolean
    /** Whether or not the first step is active */
    isFirstStep: boolean
    /** Whether or not the last step is active */
    isLastStep: boolean
    /** Go to a specific step */
    goToStep: (step: number) => void
    /** Go to the next step */
    nextStep: () => void
    /** Go to the previous step */
    prevStep: () => void
    /** Whether or not there is a next step */
    hasNext: () => boolean
    /** Whether or not there is a previous step */
    hasPrev: () => boolean
  }) => any
}>()

const { dir: propDir, orientation: propOrientation, linear } = toRefs(props)
const dir = useDirection(propDir)

const totalStepperItems = ref<Set<HTMLElement>>(new Set())

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: (props.modelValue === undefined) as false,
})

const totalStepperItemsArray = computed(() => Array.from(totalStepperItems.value))

const isFirstStep = computed(() => modelValue.value === 1)
const isLastStep = computed(() => modelValue.value === totalStepperItemsArray.value.length)

const totalSteps = computed(() => totalStepperItems.value.size)

function goToStep(step: number) {
  if (step > totalSteps.value)
    return

  if (step < 1)
    return

  if (totalStepperItems.value.size && !!totalStepperItemsArray.value[step] && !!totalStepperItemsArray.value[step].getAttribute('disabled'))
    return

  if (linear.value) {
    if (step > (modelValue.value ?? 1) + 1)
      return
  }

  modelValue.value = step
}

function nextStep() {
  goToStep((modelValue.value ?? 1) + 1)
}

function prevStep() {
  goToStep((modelValue.value ?? 1) - 1)
}

function hasNext() {
  return (modelValue.value ?? 1) < totalSteps.value
}

function hasPrev() {
  return (modelValue.value ?? 1) > 1
}

const nextStepperItem = ref<HTMLElement | null>(null)
const prevStepperItem = ref<HTMLElement | null>(null)
const isNextDisabled = computed(() => nextStepperItem.value ? nextStepperItem.value.getAttribute('disabled') === '' : true)
const isPrevDisabled = computed(() => prevStepperItem.value ? prevStepperItem.value.getAttribute('disabled') === '' : true)

watch(modelValue, async () => {
  await nextTick(() => {
    nextStepperItem.value = totalStepperItemsArray.value.length && modelValue.value! < totalStepperItemsArray.value.length ? totalStepperItemsArray.value[modelValue.value!] : null
    prevStepperItem.value = totalStepperItemsArray.value.length && modelValue.value! > 1 ? totalStepperItemsArray.value[modelValue.value! - 2] : null
  })
})
watch(totalStepperItemsArray, async () => {
  await nextTick(() => {
    nextStepperItem.value = totalStepperItemsArray.value.length && modelValue.value! < totalStepperItemsArray.value.length ? totalStepperItemsArray.value[modelValue.value!] : null
    prevStepperItem.value = totalStepperItemsArray.value.length && modelValue.value! > 1 ? totalStepperItemsArray.value[modelValue.value! - 2] : null
  })
})

provideStepperRootContext({
  modelValue,
  changeModelValue: (value: number) => {
    modelValue.value = value
  },
  orientation: propOrientation,
  dir,
  linear,
  totalStepperItems,
})

defineExpose({
  goToStep,
  nextStep,
  prevStep,
  modelValue,
  totalSteps,
  isNextDisabled,
  isPrevDisabled,
  isFirstStep,
  isLastStep,
  hasNext,
  hasPrev,
})

useForwardExpose()
</script>

<template>
  <Primitive
    role="group"
    aria-label="progress"
    :as="as"
    :as-child="asChild"
    :data-linear="linear ? '' : undefined"
    :data-orientation="orientation"
  >
    <slot
      :model-value="modelValue"
      :total-steps="totalStepperItems.size"
      :is-next-disabled="isNextDisabled"
      :is-prev-disabled="isPrevDisabled"
      :is-first-step="isFirstStep"
      :is-last-step="isLastStep"
      :go-to-step="goToStep"
      :next-step="nextStep"
      :prev-step="prevStep"
      :has-next="hasNext"
      :has-prev="hasPrev"
    />

    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      :style="{
        transform: 'translateX(-100%)',
        position: 'absolute',
        pointerEvents: 'none',
        opacity: 0,
        margin: 0,
      }"
    >
      Step {{ modelValue }} of {{ totalStepperItems.size }}
    </div>
  </Primitive>
</template>
