<script lang="ts">
import type { DateValue } from '@internationalized/date'

import type { Ref } from 'vue'
import type { Matcher } from '@/date'
import type { PrimitiveProps } from '@/Primitive'
import type { Formatter } from '@/shared'
import type { DateRange, DateStep, Granularity, HourCycle, SegmentPart, SegmentValueObj } from '@/shared/date'
import type { Direction, FormFieldProps } from '@/shared/types'
import {
  areAllDaysBetweenValid,
  hasTime,
  isBefore,
  isBeforeOrSame,

} from '@/date'
import { createContext, useDateFormatter, useDirection, useKbd, useLocale } from '@/shared'
import {
  createContent,

  getDefaultDate,
  getSegmentElements,

  initializeSegmentValues,
  isSegmentNavigationKey,
  normalizeDateStep,
  normalizeHourCycle,

  syncSegmentValues,
} from '@/shared/date'

export type DateRangeType = 'start' | 'end'

type DateRangeFieldRootContext = {
  locale: Ref<string>
  startValue: Ref<DateValue | undefined>
  endValue: Ref<DateValue | undefined>
  placeholder: Ref<DateValue>
  isDateUnavailable?: Matcher
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

export interface DateRangeFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the calendar */
  defaultValue?: DateRange
  /** The default placeholder date */
  defaultPlaceholder?: DateValue
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue
  /** The controlled checked state of the calendar. Can be bound as `v-model`. */
  modelValue?: DateRange | null
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep
  /** The granularity to use for formatting times. Defaults to day if a CalendarDate is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: Granularity
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean
  /** The maximum date that can be selected */
  maxValue?: DateValue
  /** The minimum date that can be selected */
  minValue?: DateValue
  /** The locale to use for formatting dates */
  locale?: string
  /** Whether or not the date field is disabled */
  disabled?: boolean
  /** Whether or not the date field is readonly */
  readonly?: boolean
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher
  /** Id of the element */
  id?: string
  /** The reading direction of the date field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
}

export type DateRangeFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [DateRange]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue]
}

export const [injectDateRangeFieldRootContext, provideDateRangeFieldRootContext]
  = createContext<DateRangeFieldRootContext>('DateRangeFieldRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, toRefs, watch } from 'vue'
import { Primitive, usePrimitiveElement } from '@/Primitive'
import { VisuallyHidden } from '@/VisuallyHidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DateRangeFieldRootProps>(), {
  defaultValue: undefined,
  disabled: false,
  readonly: false,
  placeholder: undefined,
  isDateUnavailable: undefined,
})
const emits = defineEmits<DateRangeFieldRootEmits>()
const { disabled, readonly, isDateUnavailable: propsIsDateUnavailable, dir: propDir, locale: propLocale } = toRefs(props)
const locale = useLocale(propLocale)
const dir = useDirection(propDir)

const formatter = useDateFormatter(locale.value, {
  hourCycle: normalizeHourCycle(props.hourCycle),
})
const { primitiveElement, currentElement: parentElement }
  = usePrimitiveElement()
const segmentElements = ref<Set<HTMLElement>>(new Set())

onMounted(() => {
  getSegmentElements(parentElement.value).forEach(item => segmentElements.value.add(item as HTMLElement))
})

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? { start: undefined, end: undefined },
  passive: (props.modelValue === undefined) as false,
}) as Ref<DateRange | null>

const defaultDate = getDefaultDate({
  defaultPlaceholder: props.placeholder,
  granularity: props.granularity,
  defaultValue: modelValue.value?.start,
  locale: props.locale,
})

const placeholder = useVModel(props, 'placeholder', emits, {
  defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
  passive: (props.placeholder === undefined) as false,
}) as Ref<DateValue>

const step = computed(() => normalizeDateStep(props))

const inferredGranularity = computed(() => {
  if (props.granularity)
    return !hasTime(placeholder.value) ? 'day' : props.granularity

  return hasTime(placeholder.value) ? 'minute' : 'day'
})

const isStartInvalid = computed(() => {
  if (!modelValue.value?.start)
    return false

  if (propsIsDateUnavailable.value?.(modelValue.value.start))
    return true

  if (props.minValue && isBefore(modelValue.value.start, props.minValue))
    return true

  if (props.maxValue && isBefore(props.maxValue, modelValue.value.start))
    return true

  return false
})

const isEndInvalid = computed(() => {
  if (!modelValue.value?.end)
    return false

  if (propsIsDateUnavailable.value?.(modelValue.value.end))
    return true

  if (props.minValue && isBefore(modelValue.value.end, props.minValue))
    return true

  if (props.maxValue && isBefore(props.maxValue, modelValue.value.end))
    return true

  return false
})

const isInvalid = computed(() => {
  if (isStartInvalid.value || isEndInvalid.value)
    return true

  if (!modelValue.value?.start || !modelValue.value?.end)
    return false

  if (!isBeforeOrSame(modelValue.value.start, modelValue.value.end))
    return true

  if (propsIsDateUnavailable.value !== undefined) {
    const allValid = areAllDaysBetweenValid(
      modelValue.value.start,
      modelValue.value.end,
      propsIsDateUnavailable.value,
      undefined,
    )
    if (!allValid)
      return true
  }
  return false
})

const initialSegments = initializeSegmentValues(inferredGranularity.value)

const startSegmentValues = ref<SegmentValueObj>(modelValue.value?.start ? { ...syncSegmentValues({ value: modelValue.value.start, formatter }) } : { ...initialSegments })
const endSegmentValues = ref<SegmentValueObj>(modelValue.value?.end ? { ...syncSegmentValues({ value: modelValue.value.end, formatter }) } : { ...initialSegments })

const startSegmentContent = computed(() => createContent({
  granularity: inferredGranularity.value,
  dateRef: placeholder.value,
  formatter,
  hideTimeZone: props.hideTimeZone,
  hourCycle: props.hourCycle,
  segmentValues: startSegmentValues.value,
  locale,
}))

const endSegmentContent = computed(() => createContent({
  granularity: inferredGranularity.value,
  dateRef: placeholder.value,
  formatter,
  hideTimeZone: props.hideTimeZone,
  hourCycle: props.hourCycle,
  segmentValues: endSegmentValues.value,
  locale,
}))

const segmentContents = computed(() => ({
  start: startSegmentContent.value.arr,
  end: endSegmentContent.value.arr,
}))

const editableSegmentContents = computed(() => ({ start: segmentContents.value.start.filter(({ part }) => part !== 'literal'), end: segmentContents.value.end.filter(({ part }) => part !== 'literal') }))

const startValue = ref(modelValue.value?.start?.copy()) as Ref<DateValue | undefined>
const endValue = ref(modelValue.value?.end?.copy()) as Ref<DateValue | undefined>

watch([startValue, endValue], ([_startValue, _endValue]) => {
  modelValue.value = { start: _startValue?.copy(), end: _endValue?.copy() }
})

watch(modelValue, (_modelValue) => {
  const isStartChanged = _modelValue?.start && startValue.value
    ? _modelValue.start.compare(startValue.value) !== 0
    : _modelValue?.start !== startValue.value
  if (isStartChanged) {
    startValue.value = _modelValue?.start?.copy()
  }

  const isEndChanged = _modelValue?.end && endValue.value
    ? _modelValue.end.compare(endValue.value) !== 0
    : _modelValue?.end !== endValue.value
  if (isEndChanged) {
    endValue.value = _modelValue?.end?.copy()
  }
})

watch([startValue, locale], ([_startValue]) => {
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
      getSegmentElements(parentElement.value).forEach(item => segmentElements.value.add(item as HTMLElement))
    })
  }
})

watch(modelValue, (_modelValue) => {
  if (_modelValue && _modelValue.start !== undefined && placeholder.value.compare(_modelValue.start) !== 0)
    placeholder.value = _modelValue.start.copy()
})

watch([endValue, locale], ([_endValue]) => {
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
  el.getAttribute('data-reka-date-field-segment') === currentFocusedElement.value?.getAttribute('data-reka-date-field-segment')
  && el.getAttribute('data-reka-date-range-field-segment-type') === currentFocusedElement.value?.getAttribute('data-reka-date-range-field-segment-type')))

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

provideDateRangeFieldRootContext({
  isDateUnavailable: propsIsDateUnavailable.value,
  locale,
  startValue,
  endValue,
  placeholder,
  disabled,
  formatter,
  hourCycle: props.hourCycle,
  step,
  readonly,
  segmentValues: { start: startSegmentValues, end: endSegmentValues },
  isInvalid,
  segmentContents: editableSegmentContents,
  elements: segmentElements,
  setFocusedElement,
  focusNext() {
    nextFocusableSegment.value?.focus()
  },
})

defineExpose({
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
