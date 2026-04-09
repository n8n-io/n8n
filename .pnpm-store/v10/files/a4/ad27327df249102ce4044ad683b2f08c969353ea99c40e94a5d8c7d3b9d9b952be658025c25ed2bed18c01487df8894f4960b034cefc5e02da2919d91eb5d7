<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Grid, Matcher } from '@/date'
import type { PrimitiveProps } from '@/Primitive'
import type { Formatter } from '@/shared'
import type { DateRange } from '@/shared/date'
import type { Direction } from '@/shared/types'
import { compareYearMonth, isSameYearMonth } from '@/date'
import { useMonthPicker } from '@/MonthPicker/useMonthPicker'
import { createContext, useDirection, useId, useKbd, useLocale } from '@/shared'
import { getDefaultDate, handleCalendarInitialFocus } from '@/shared/date'
import { useRangeMonthPickerState } from './useRangeMonthPicker'

type MonthRangePickerRootContext = {
  modelValue: Ref<DateRange>
  startValue: Ref<DateValue | undefined>
  endValue: Ref<DateValue | undefined>
  locale: Ref<string>
  placeholder: Ref<DateValue>
  preventDeselect: Ref<boolean>
  grid: Ref<Grid<DateValue>>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  initialFocus: Ref<boolean>
  onPlaceholderChange: (date: DateValue) => void
  fullCalendarLabel: Ref<string>
  parentElement: Ref<HTMLElement | undefined>
  headingValue: Ref<string>
  headingId: string
  isInvalid: Ref<boolean>
  isMonthDisabled: Matcher
  isMonthUnavailable?: Matcher
  allowNonContiguousRanges: Ref<boolean>
  highlightedRange: Ref<{ start: DateValue, end: DateValue } | null>
  focusedValue: Ref<DateValue | undefined>
  lastPressedDateValue: Ref<DateValue | undefined>
  isSelected: (date: DateValue) => boolean
  isSelectionEnd: (date: DateValue) => boolean
  isSelectionStart: (date: DateValue) => boolean
  isHighlightedStart: (date: DateValue) => boolean
  isHighlightedEnd: (date: DateValue) => boolean
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean
  formatter: Formatter
  dir: Ref<Direction>
  fixedDate: Ref<'start' | 'end' | undefined>
  maximumMonths: Ref<number | undefined>
  minValue: Ref<DateValue | undefined>
  maxValue: Ref<DateValue | undefined>
}

export interface MonthRangePickerRootProps extends PrimitiveProps {
  /** The default placeholder date */
  defaultPlaceholder?: DateValue
  /** The default value for the calendar */
  defaultValue?: DateRange
  /** The controlled selected month range of the month range picker. Can be bound as `v-model`. */
  modelValue?: DateRange | null
  /** The placeholder date, which is used to determine what year to display when no date is selected. */
  placeholder?: DateValue
  /** When combined with `isMonthUnavailable`, determines whether non-contiguous ranges may be selected. */
  allowNonContiguousRanges?: boolean
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean
  /** The maximum number of months that can be selected in a range */
  maximumMonths?: number
  /** The accessible label for the calendar */
  calendarLabel?: string
  /** The maximum date that can be selected */
  maxValue?: DateValue
  /** The minimum date that can be selected */
  minValue?: DateValue
  /** The locale to use for formatting dates */
  locale?: string
  /** Whether or not the calendar is disabled */
  disabled?: boolean
  /** Whether or not the calendar is readonly */
  readonly?: boolean
  /** If true, the calendar will focus the selected month on mount */
  initialFocus?: boolean
  /** A function that returns whether or not a month is disabled */
  isMonthDisabled?: Matcher
  /** A function that returns whether or not a month is unavailable */
  isMonthUnavailable?: Matcher
  /** The reading direction of the calendar when applicable. */
  dir?: Direction
  /** A function that returns the next page of the calendar. */
  nextPage?: (placeholder: DateValue) => DateValue
  /** A function that returns the previous page of the calendar. */
  prevPage?: (placeholder: DateValue) => DateValue
  /** Which part of the range should be fixed */
  fixedDate?: 'start' | 'end'
}

export type MonthRangePickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateRange]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue]
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue | undefined]
}

export const [injectMonthRangePickerRootContext, provideMonthRangePickerRootContext]
  = createContext<MonthRangePickerRootContext>('MonthRangePickerRoot')
</script>

<script setup lang="ts">
import { useEventListener, useVModel } from '@vueuse/core'
import { computed, onMounted, ref, toRefs, watch } from 'vue'
import { Primitive, usePrimitiveElement } from '@/Primitive'

const props = withDefaults(defineProps<MonthRangePickerRootProps>(), {
  defaultValue: () => ({ start: undefined, end: undefined }),
  as: 'div',
  preventDeselect: false,
  disabled: false,
  readonly: false,
  initialFocus: false,
  placeholder: undefined,
  isMonthDisabled: undefined,
  isMonthUnavailable: undefined,
  allowNonContiguousRanges: false,
  maximumMonths: undefined,
})
const emits = defineEmits<MonthRangePickerRootEmits>()

defineSlots<{
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue
    /** The grid of months */
    grid: Grid<DateValue>
    /** The calendar locale */
    locale: string
    /** The current date range */
    modelValue: DateRange
  }) => any
}>()

const {
  disabled,
  readonly,
  initialFocus,
  preventDeselect,
  isMonthUnavailable: propsIsMonthUnavailable,
  isMonthDisabled: propsIsMonthDisabled,
  calendarLabel,
  maxValue,
  minValue,
  dir: propDir,
  locale: propLocale,
  nextPage: propsNextPage,
  prevPage: propsPrevPage,
  allowNonContiguousRanges,
  fixedDate,
  maximumMonths,
} = toRefs(props)

const { primitiveElement, currentElement: parentElement } = usePrimitiveElement()
const dir = useDirection(propDir)
const locale = useLocale(propLocale)
const headingId = useId(undefined, 'reka-month-range-picker-heading')

const lastPressedDateValue = ref() as Ref<DateValue | undefined>
const focusedValue = ref() as Ref<DateValue | undefined>
const isEditing = ref(false)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? { start: undefined, end: undefined },
  passive: (props.modelValue === undefined) as false,
}) as Ref<DateRange | null>

const normalizeRange = (value?: DateRange | null): DateRange => value ?? { start: undefined, end: undefined }
const normalizedModelValue = computed(() => normalizeRange(modelValue.value))

const validModelValue = ref(normalizeRange(modelValue.value)) as Ref<DateRange>

const defaultDate = getDefaultDate({
  defaultPlaceholder: props.placeholder,
  defaultValue: normalizeRange(modelValue.value).start,
  locale: props.locale,
})

const startValue = ref(normalizeRange(modelValue.value).start) as Ref<DateValue | undefined>
const endValue = ref(normalizeRange(modelValue.value).end) as Ref<DateValue | undefined>

const placeholder = useVModel(props, 'placeholder', emits, {
  defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
  passive: (props.placeholder === undefined) as false,
}) as Ref<DateValue>

function onPlaceholderChange(value: DateValue) {
  placeholder.value = value.copy()
}

const {
  fullCalendarLabel,
  headingValue,
  isMonthDisabled,
  isMonthUnavailable,
  isNextButtonDisabled,
  isPrevButtonDisabled,
  grid,
  nextPage,
  prevPage,
  formatter,
} = useMonthPicker({
  locale,
  placeholder,
  minValue,
  maxValue,
  disabled,
  isMonthDisabled: propsIsMonthDisabled,
  isMonthUnavailable: propsIsMonthUnavailable,
  calendarLabel,
  nextPage: propsNextPage,
  prevPage: propsPrevPage,
})

const {
  isInvalid,
  isSelected,
  highlightedRange,
  isSelectionStart,
  isSelectionEnd,
  isHighlightedStart,
  isHighlightedEnd,
  isMonthDisabled: rangeIsMonthDisabled,
} = useRangeMonthPickerState({
  start: startValue,
  end: endValue,
  isMonthDisabled,
  isMonthUnavailable,
  focusedValue,
  allowNonContiguousRanges,
  fixedDate,
  maximumMonths,
})

watch(modelValue, (_modelValue) => {
  const next = normalizeRange(_modelValue)

  const isStartSynced = (!next.start && !startValue.value)
    || (!!next.start && !!startValue.value && isSameYearMonth(next.start, startValue.value))

  if (!isStartSynced) {
    startValue.value = next.start?.copy?.()
  }

  const isEndSynced = (!next.end && !endValue.value)
    || (!!next.end && !!endValue.value && isSameYearMonth(next.end, endValue.value))

  if (!isEndSynced) {
    endValue.value = next.end?.copy?.()
  }

  if (next.start && next.end) {
    validModelValue.value = {
      start: next.start.copy(),
      end: next.end.copy(),
    }
  }
})

watch(startValue, (_startValue) => {
  if (_startValue && !isSameYearMonth(_startValue, placeholder.value))
    onPlaceholderChange(_startValue)

  emits('update:startValue', _startValue)
})

watch([startValue, endValue], ([_startValue, _endValue]) => {
  const value = modelValue.value

  if (
    value
    && value.start
    && value.end
    && _startValue
    && _endValue
    && isSameYearMonth(value.start, _startValue)
    && isSameYearMonth(value.end, _endValue)
  ) {
    return
  }

  isEditing.value = true
  if (_endValue && _startValue) {
    const nextValue = compareYearMonth(_endValue, _startValue) < 0
      ? { start: _endValue.copy(), end: _startValue.copy() }
      : { start: _startValue.copy(), end: _endValue.copy() }

    modelValue.value = { start: nextValue.start, end: nextValue.end }
    isEditing.value = false
    validModelValue.value = { start: nextValue.start.copy(), end: nextValue.end.copy() }
  }
  else {
    modelValue.value = _startValue
      ? { start: _startValue.copy(), end: undefined }
      : { start: _endValue?.copy(), end: undefined }
  }
})

const kbd = useKbd()
useEventListener(parentElement, 'keydown', (ev) => {
  if (ev.key === kbd.ESCAPE && isEditing.value) {
    startValue.value = validModelValue.value.start?.copy()
    endValue.value = validModelValue.value.end?.copy()
  }
})

provideMonthRangePickerRootContext({
  isMonthUnavailable,
  startValue,
  endValue,
  formatter,
  modelValue: normalizedModelValue,
  placeholder,
  disabled,
  initialFocus,
  grid,
  readonly,
  preventDeselect,
  fullCalendarLabel,
  headingValue,
  headingId,
  isInvalid,
  isMonthDisabled: rangeIsMonthDisabled,
  allowNonContiguousRanges,
  highlightedRange,
  focusedValue,
  lastPressedDateValue,
  isSelected,
  isSelectionEnd,
  isSelectionStart,
  isNextButtonDisabled,
  isPrevButtonDisabled,
  nextPage,
  prevPage,
  parentElement,
  onPlaceholderChange,
  locale,
  dir,
  isHighlightedStart,
  isHighlightedEnd,
  fixedDate,
  maximumMonths,
  minValue,
  maxValue,
})

onMounted(() => {
  if (initialFocus.value)
    handleCalendarInitialFocus(parentElement.value)
})
</script>

<template>
  <Primitive
    ref="primitiveElement"
    :as="as"
    :as-child="asChild"
    :aria-label="fullCalendarLabel"
    :data-readonly="readonly ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    :dir="dir"
  >
    <div
      style="border: 0px; clip: rect(0px, 0px, 0px, 0px); clip-path: inset(50%); height: 1px; margin: -1px; overflow: hidden; padding: 0px; position: absolute; white-space: nowrap; width: 1px;"
    >
      <div
        role="heading"
        aria-level="2"
      >
        {{ fullCalendarLabel }}
      </div>
    </div>

    <slot
      :date="placeholder"
      :grid="grid"
      :locale="locale"
      :model-value="normalizedModelValue"
    />
  </Primitive>
</template>
