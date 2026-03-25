<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Formatter } from '@/shared'
import type { DateStep, HourCycle, SegmentPart, SegmentValueObj, TimeValue } from '@/shared/date'
import type { Direction, FormFieldProps } from '@/shared/types'
import { getLocalTimeZone, isEqualDay, Time, toCalendarDateTime, today } from '@internationalized/date'
import { isBefore } from '@/date'
import { createContext, isNullish, useDateFormatter, useDirection, useKbd, useLocale } from '@/shared'
import {
  createContent,
  getDefaultTime,
  getTimeFieldSegmentElements,

  initializeTimeSegmentValues,
  isSegmentNavigationKey,
  normalizeDateStep,
  normalizeHourCycle,

  syncTimeSegmentValues,

} from '@/shared/date'

type TimeFieldRootContext = {
  locale: Ref<string>
  modelValue: Ref<DateValue | undefined>
  placeholder: Ref<DateValue>
  isInvalid: Ref<boolean>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  formatter: Formatter
  hourCycle: HourCycle
  step: Ref<DateStep>
  segmentValues: Ref<SegmentValueObj>
  segmentContents: Ref<{ part: SegmentPart, value: string }[]>
  elements: Ref<Set<HTMLElement>>
  focusNext: () => void
  setFocusedElement: (el: HTMLElement) => void
}

export interface TimeFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the calendar */
  defaultValue?: TimeValue
  /** The default placeholder date */
  defaultPlaceholder?: TimeValue
  /** The placeholder date, which is used to determine what time to display when no time is selected. This updates as the user navigates the field */
  placeholder?: TimeValue
  /** The controlled checked state of the field. Can be bound as `v-model`. */
  modelValue?: TimeValue | null
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep
  /** The granularity to use for formatting times. Defaults to minute if a Time is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: 'hour' | 'minute' | 'second'
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean
  /** The maximum date that can be selected */
  maxValue?: TimeValue
  /** The minimum date that can be selected */
  minValue?: TimeValue
  /** The locale to use for formatting dates */
  locale?: string
  /** Whether or not the time field is disabled */
  disabled?: boolean
  /** Whether or not the time field is readonly */
  readonly?: boolean
  /** Id of the element */
  id?: string
  /** The reading direction of the time field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
}

export type TimeFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: TimeValue | undefined]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: TimeValue]
}

export const [injectTimeFieldRootContext, provideTimeFieldRootContext]
  = createContext<TimeFieldRootContext>('TimeFieldRoot')

function convertValue(value: TimeValue, date: DateValue = today(getLocalTimeZone())) {
  if (value && 'day' in value) {
    return value
  }

  return toCalendarDateTime(date, value)
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, toRefs, watch } from 'vue'
import { Primitive, usePrimitiveElement } from '@/Primitive'
import { VisuallyHidden } from '@/VisuallyHidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<TimeFieldRootProps>(), {
  defaultValue: undefined,
  disabled: false,
  readonly: false,
  placeholder: undefined,
  isDateUnavailable: undefined,
})
const emits = defineEmits<TimeFieldRootEmits>()
defineSlots<{
  default?: (props: {
    /** The current time of the field */
    modelValue: TimeValue | undefined
    /** The time field segment contents */
    segments: { part: SegmentPart, value: string }[]
    /** Value if the input is invalid */
    isInvalid: boolean
  }) => any
}>()

const { disabled, readonly, granularity, defaultValue, minValue, maxValue, dir: propDir, locale: propLocale } = toRefs(props)
const locale = useLocale(propLocale)
const dir = useDirection(propDir)

const formatter = useDateFormatter(locale.value, {
  hourCycle: normalizeHourCycle(props.hourCycle),
})
const { primitiveElement, currentElement: parentElement }
  = usePrimitiveElement()
const segmentElements = ref<Set<HTMLElement>>(new Set())

const step = computed(() => normalizeDateStep(props))

const convertedMinValue = computed(() => minValue.value ? convertValue(minValue.value) : undefined)
const convertedMaxValue = computed(() => maxValue.value ? convertValue(maxValue.value) : undefined)

onMounted(() => {
  getTimeFieldSegmentElements(parentElement.value).forEach(item => segmentElements.value.add(item as HTMLElement))
})

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: defaultValue.value,
  passive: (props.modelValue === undefined) as false,
}) as Ref<TimeValue>

const convertedModelValue = computed({
  get() {
    if (isNullish(modelValue.value))
      return modelValue.value
    return convertValue(modelValue.value)
  },
  set(newValue) {
    if (newValue) {
      modelValue.value = modelValue.value && 'day' in modelValue.value ? newValue : new Time(newValue.hour, newValue.minute, newValue.second, modelValue.value?.millisecond)
    }
    else {
      modelValue.value = newValue
    }
    return newValue
  },
})

const defaultDate = getDefaultTime({
  defaultPlaceholder: props.placeholder,
  defaultValue: modelValue.value,
})

const placeholder = useVModel(props, 'placeholder', emits, {
  defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
  passive: (props.placeholder === undefined) as false,
}) as Ref<TimeValue>

const convertedPlaceholder = computed({
  get() {
    return convertValue(placeholder.value)
  },
  set(newValue) {
    if (newValue)
      placeholder.value = 'day' in placeholder.value ? newValue.copy() : new Time(newValue.hour, newValue.minute, newValue.second, placeholder.value?.millisecond)
    return newValue
  },
})

const inferredGranularity = computed(() => {
  if (granularity.value)
    return granularity.value

  return 'minute'
})

const isInvalid = computed(() => {
  if (!modelValue.value)
    return false

  if (convertedMinValue.value && isBefore(convertedModelValue.value, convertedMinValue.value))
    return true

  if (convertedMaxValue.value && isBefore(convertedMaxValue.value, convertedModelValue.value))
    return true

  return false
})

const initialSegments = initializeTimeSegmentValues(inferredGranularity.value)

const segmentValues = ref<SegmentValueObj>(modelValue.value ? { ...syncTimeSegmentValues({ value: convertedModelValue.value, formatter }) } : { ...initialSegments })

const allSegmentContent = computed(() => createContent({
  granularity: inferredGranularity.value,
  dateRef: convertedPlaceholder.value,
  formatter,
  hideTimeZone: props.hideTimeZone,
  hourCycle: props.hourCycle,
  segmentValues: segmentValues.value,
  locale,
  isTimeValue: true,
}))

const segmentContents = computed(() => allSegmentContent.value.arr)

const editableSegmentContents = computed(() => segmentContents.value.filter(({ part }) => part !== 'literal'))

watch(locale, (value) => {
  if (formatter.getLocale() !== value) {
    formatter.setLocale(value)
    // Locale changed, so we need to clear the segment elements and re-get them (different order)
    // Get the focusable elements again on the next tick
    nextTick(() => {
      segmentElements.value.clear()
      getTimeFieldSegmentElements(parentElement.value).forEach(item => segmentElements.value.add(item as HTMLElement))
    })
  }
})

watch(convertedModelValue, (_modelValue) => {
  if (!isNullish(_modelValue) && (!isEqualDay(convertedPlaceholder.value, _modelValue) || convertedPlaceholder.value.compare(_modelValue) !== 0))
    placeholder.value = _modelValue.copy()
})

watch([convertedModelValue, locale], ([_modelValue]) => {
  if (!isNullish(_modelValue)) {
    segmentValues.value = { ...syncTimeSegmentValues({ value: _modelValue, formatter }) }
  }
  // If segment has null value, means that user modified it, thus do not reset the segmentValues
  else if (Object.values(segmentValues.value).every(value => value !== null) && isNullish(_modelValue)) {
    segmentValues.value = { ...initialSegments }
  }
})

const currentFocusedElement = ref<HTMLElement | null>(null)

const currentSegmentIndex = computed(() =>
  Array.from(segmentElements.value).findIndex(el =>
    el.getAttribute('data-reka-time-field-segment')
    === currentFocusedElement.value?.getAttribute('data-reka-time-field-segment')))

const nextFocusableSegment = computed(() => {
  const sign = dir.value === 'rtl' ? -1 : 1
  const nextCondition = sign < 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1
  if (nextCondition)
    return null
  const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value + sign]
  return segmentToFocus
})

const prevFocusableSegment = computed(() => {
  const sign = dir.value === 'rtl' ? -1 : 1
  const prevCondition = sign > 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1
  if (prevCondition)
    return null

  const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value - sign]
  return segmentToFocus
})

const kbd = useKbd()

function handleKeydown(e: KeyboardEvent) {
  if (!isSegmentNavigationKey(e.key))
    return
  if (e.key === kbd.ARROW_LEFT)
    prevFocusableSegment.value?.focus()
  if (e.key === kbd.ARROW_RIGHT)
    nextFocusableSegment.value?.focus()
}

function setFocusedElement(el: HTMLElement) {
  currentFocusedElement.value = el
}

provideTimeFieldRootContext({
  locale,
  modelValue: convertedModelValue,
  placeholder: convertedPlaceholder,
  disabled,
  formatter,
  hourCycle: props.hourCycle,
  step,
  readonly,
  segmentValues,
  isInvalid,
  segmentContents: editableSegmentContents,
  elements: segmentElements,
  setFocusedElement,
  focusNext() {
    nextFocusableSegment.value?.focus()
  },
})

defineExpose({
  /** Helper to set the focused element inside the DateField */
  setFocusedElement,
})
</script>

<template>
  <Primitive
    v-bind="$attrs"
    ref="primitiveElement"
    role="group"
    :aria-disabled="disabled ? true : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    :dir="dir"
    @keydown.left.right="handleKeydown"
  >
    <slot
      :model-value="modelValue"
      :segments="segmentContents"
      :is-invalid="isInvalid"
    />

    <VisuallyHidden
      :id="id"
      as="input"
      feature="focusable"
      tabindex="-1"
      :value="modelValue ? modelValue.toString() : ''"
      :name="name"
      :disabled="disabled"
      :required="required"
      @focus="Array.from(segmentElements)?.[0]?.focus()"
    />
  </Primitive>
</template>
