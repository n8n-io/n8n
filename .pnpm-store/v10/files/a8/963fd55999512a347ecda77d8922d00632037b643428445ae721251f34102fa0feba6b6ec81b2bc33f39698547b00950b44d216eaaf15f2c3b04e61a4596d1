<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Matcher } from '@/date'
import type { DateRangeType } from '@/DateRangeField/DateRangeFieldRoot.vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Formatter } from '@/shared'
import type { DateStep, HourCycle, SegmentPart, SegmentValueObj, TimeValue } from '@/shared/date'
import type { TimeRange } from '@/shared/date/types'
import type { Direction, FormFieldProps } from '@/shared/types'
import { getLocalTimeZone, Time, toCalendarDateTime, today } from '@internationalized/date'
import { areAllDaysBetweenValid, isBefore, isBeforeOrSame } from '@/date'
import { createContext, isNullish, useDateFormatter, useDirection, useKbd, useLocale } from '@/shared'
import {
  createContent,
  getDefaultTime,
  getTimeFieldSegmentElements,
  initializeTimeSegmentValues,
  isSegmentNavigationKey,
  normalizeDateStep,
  normalizeHourCycle,

  syncSegmentValues,

  syncTimeSegmentValues,

} from '@/shared/date'

type TimeRangeFieldRootContext = {
  locale: Ref<string>
  startValue: Ref<DateValue | undefined>
  endValue: Ref<DateValue | undefined>
  placeholder: Ref<DateValue>
  isInvalid: Ref<boolean>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  formatter: Formatter
  hourCycle: HourCycle
  step: Ref<DateStep>
  segmentValues: Record<DateRangeType, Ref<SegmentValueObj>>
  segmentContents: Ref<{ start: { part: SegmentPart, value: string }[], end: { part: SegmentPart, value: string }[] }>
  elements: Ref<Set<HTMLElement>>
  focusNext: () => void
  setFocusedElement: (el: HTMLElement) => void
}

export interface TimeRangeFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the field */
  defaultValue?: TimeRange
  /** The default placeholder time */
  defaultPlaceholder?: TimeValue
  /** The placeholder time, which is used to determine what time to display when no time is selected. This updates as the user navigates the field */
  placeholder?: TimeValue
  /** The controlled checked state of the field. Can be bound as `v-model`. */
  modelValue?: TimeRange | null
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep
  /** The granularity to use for formatting times. Defaults to minute. The field will render segments for each part of the time up to and including the specified granularity */
  granularity?: 'hour' | 'minute' | 'second'
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean
  /** The maximum time that can be selected */
  maxValue?: TimeValue
  /** The minimum time that can be selected */
  minValue?: TimeValue
  /** The locale to use for formatting times */
  locale?: string
  /** Whether or not the time field is disabled */
  disabled?: boolean
  /** Whether or not the time field is readonly */
  readonly?: boolean
  /** Id of the element */
  id?: string
  /** The reading direction of the time field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** A function that returns whether or not a time is unavailable */
  isTimeUnavailable?: Matcher
}

export type TimeRangeFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: TimeRange]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: TimeValue]
}

export const [injectTimeRangeFieldRootContext, provideTimeRangeFieldRootContext]
  = createContext<TimeRangeFieldRootContext>('TimeRangeFieldRoot')

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

const props = withDefaults(defineProps<TimeRangeFieldRootProps>(), {
  defaultValue: undefined,
  disabled: false,
  readonly: false,
  placeholder: undefined,
  isTimeUnavailable: undefined,
})
const emits = defineEmits<TimeRangeFieldRootEmits>()
defineSlots<{
  default?: (props: {
    /** The current time of the field */
    modelValue: TimeRange | undefined
    /** The time field segment contents */
    segments: { start: { part: SegmentPart, value: string }[], end: { part: SegmentPart, value: string }[] }
    /** Value if the input is invalid */
    isInvalid: boolean
  }) => any
}>()

const { disabled, readonly, granularity, defaultValue, minValue, maxValue, dir: propDir, locale: propLocale, isTimeUnavailable: propsIsTimeUnavailable } = toRefs(props)
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
  defaultValue: defaultValue.value ?? { start: undefined, end: undefined },
  passive: (props.modelValue === undefined) as false,
}) as Ref<TimeRange>

const isStartInvalid = computed(() => {
  if (!modelValue.value?.start)
    return false

  const convertedStartValue = convertValue(modelValue.value.start)

  if (propsIsTimeUnavailable.value?.(convertedStartValue))
    return true

  if (convertedMinValue.value && isBefore(convertedStartValue, convertedMinValue.value))
    return true

  if (convertedMaxValue.value && isBefore(convertedMaxValue.value, convertedStartValue))
    return true

  return false
})

const isEndInvalid = computed(() => {
  if (!modelValue.value?.end)
    return false

  const convertedEndValue = convertValue(modelValue.value.end)

  if (propsIsTimeUnavailable.value?.(convertedEndValue))
    return true

  if (convertedMinValue.value && isBefore(convertedEndValue, convertedMinValue.value))
    return true

  if (convertedMaxValue.value && isBefore(convertedMaxValue.value, convertedEndValue))
    return true

  return false
})

const isInvalid = computed(() => {
  if (isStartInvalid.value || isEndInvalid.value)
    return true

  if (!modelValue.value?.start || !modelValue.value?.end)
    return false

  const convertedModelValue = {
    start: convertValue(modelValue.value.start),
    end: convertValue(modelValue.value.end),
  }

  if (!isBeforeOrSame(convertedModelValue.start, convertedModelValue.end))
    return true

  if (propsIsTimeUnavailable.value !== undefined) {
    const allValid = areAllDaysBetweenValid(
      convertedModelValue.start,
      convertedModelValue.end,
      propsIsTimeUnavailable.value,
      undefined,
    )
    if (!allValid)
      return true
  }
  return false
})

const startValue = ref(modelValue.value?.start?.copy()) as Ref<TimeValue | undefined>
const endValue = ref(modelValue.value?.end?.copy()) as Ref<TimeValue | undefined>

watch([startValue, endValue], ([_startValue, _endValue]) => {
  modelValue.value = { start: _startValue?.copy(), end: _endValue?.copy() }
})

const convertedStartValue = computed({
  get() {
    if (isNullish(startValue.value))
      return startValue.value
    return convertValue(startValue.value)
  },
  set(newValue) {
    if (newValue) {
      startValue.value = startValue.value && 'day' in startValue.value ? newValue : new Time(newValue.hour, newValue.minute, newValue.second, startValue.value?.millisecond)
    }
    else {
      startValue.value = newValue
    }
    return newValue
  },
})

const convertedEndValue = computed({
  get() {
    if (isNullish(endValue.value))
      return endValue.value
    return convertValue(endValue.value)
  },
  set(newValue) {
    if (newValue) {
      endValue.value = endValue.value && 'day' in endValue.value ? newValue : new Time(newValue.hour, newValue.minute, newValue.second, endValue.value?.millisecond)
    }
    else {
      endValue.value = newValue
    }
    return newValue
  },
})

const convertedModelValue = computed(() => ({ start: convertedStartValue.value, end: convertedEndValue.value }))

const defaultDate = getDefaultTime({
  defaultPlaceholder: props.placeholder,
  defaultValue: modelValue.value?.start,
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

const initialSegments = initializeTimeSegmentValues(inferredGranularity.value)

const startSegmentValues = ref<SegmentValueObj>(convertedStartValue.value ? { ...syncTimeSegmentValues({ value: convertedStartValue.value, formatter }) } : { ...initialSegments })
const endSegmentValues = ref<SegmentValueObj>(convertedEndValue.value ? { ...syncTimeSegmentValues({ value: convertedEndValue.value, formatter }) } : { ...initialSegments })

const startSegmentContent = computed(() => createContent({
  granularity: inferredGranularity.value,
  dateRef: convertedPlaceholder.value,
  formatter,
  hideTimeZone: props.hideTimeZone,
  hourCycle: props.hourCycle,
  segmentValues: startSegmentValues.value,
  locale,
  isTimeValue: true,
}))

const endSegmentContent = computed(() => createContent({
  granularity: inferredGranularity.value,
  dateRef: convertedPlaceholder.value,
  formatter,
  hideTimeZone: props.hideTimeZone,
  hourCycle: props.hourCycle,
  segmentValues: endSegmentValues.value,
  locale,
  isTimeValue: true,
}))

const segmentContents = computed(() => ({
  start: startSegmentContent.value.arr,
  end: endSegmentContent.value.arr,
}))

const editableSegmentContents = computed(() => ({ start: segmentContents.value.start.filter(({ part }) => part !== 'literal'), end: segmentContents.value.end.filter(({ part }) => part !== 'literal') }))

watch(convertedModelValue, (_modelValue) => {
  const isStartChanged = _modelValue?.start && convertedStartValue.value
    ? _modelValue.start.compare(convertedStartValue.value) !== 0
    : _modelValue?.start !== convertedStartValue.value
  if (isStartChanged) {
    convertedStartValue.value = _modelValue?.start?.copy()
  }

  const isEndChanged = _modelValue?.end && convertedEndValue.value
    ? _modelValue.end.compare(convertedEndValue.value) !== 0
    : _modelValue?.end !== convertedEndValue.value
  if (isEndChanged) {
    convertedEndValue.value = _modelValue?.end?.copy()
  }
})

watch([convertedStartValue, locale], ([_startValue]) => {
  if (_startValue !== undefined) {
    startSegmentValues.value = { ...syncSegmentValues({ value: _startValue, formatter }) }
  }
  // If segment has null value, means that user modified it, thus do not reset the segmentValues
  else if (Object.values(startSegmentValues.value).every(value => value !== null) && _startValue === undefined) {
    startSegmentValues.value = { ...initialSegments }
  }
})

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
  if (_modelValue && _modelValue.start !== undefined && placeholder.value.compare(_modelValue.start) !== 0)
    placeholder.value = _modelValue.start.copy()
})

watch([convertedEndValue, locale], ([_endValue]) => {
  if (_endValue !== undefined) {
    endSegmentValues.value = { ...syncSegmentValues({ value: _endValue, formatter }) }
  }
  // If segment has null value, means that user modified it, thus do not reset the segmentValues
  else if (Object.values(endSegmentValues.value).every(value => value !== null) && _endValue === undefined) {
    endSegmentValues.value = { ...initialSegments }
  }
})

const currentFocusedElement = ref<HTMLElement | null>(null)

const currentSegmentIndex = computed(() => Array.from(segmentElements.value).findIndex(el =>
  el.getAttribute('data-reka-time-field-segment') === currentFocusedElement.value?.getAttribute('data-reka-time-field-segment')
  && el.getAttribute('data-reka-time-range-field-segment-type') === currentFocusedElement.value?.getAttribute('data-reka-time-range-field-segment-type')))

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

provideTimeRangeFieldRootContext({
  locale,
  startValue: convertedStartValue,
  endValue: convertedEndValue,
  placeholder: convertedPlaceholder,
  disabled,
  formatter,
  hourCycle: props.hourCycle,
  step,
  readonly,
  isInvalid,
  segmentValues: { start: startSegmentValues, end: endSegmentValues },
  segmentContents: editableSegmentContents,
  elements: segmentElements,
  setFocusedElement,
  focusNext() {
    nextFocusableSegment.value?.focus()
  },
})

defineExpose({
  /** Helper to set the focused element inside the TimeRangeField */
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
      :value="`${modelValue?.start?.toString()} - ${modelValue?.end?.toString()}`"
      :name="name"
      :disabled="disabled"
      :required="required"
      @focus="Array.from(segmentElements)?.[0]?.focus()"
    />
  </Primitive>
</template>
