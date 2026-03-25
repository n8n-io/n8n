<script lang="ts">
import type { DateValue } from '@internationalized/date'

import type { Ref } from 'vue'
import type { Grid, Matcher, WeekDayFormat } from '@/date'
import type { PrimitiveProps } from '@/Primitive'

import type { Formatter } from '@/shared'
import type { Direction } from '@/shared/types'
import { isEqualDay, isSameDay } from '@internationalized/date'
import { createContext, useDirection, useLocale } from '@/shared'
import { getDefaultDate, handleCalendarInitialFocus } from '@/shared/date'
import { useCalendar, useCalendarState } from './useCalendar'

type CalendarRootContext = {
  locale: Ref<string>
  modelValue: Ref<DateValue | DateValue[] | undefined>
  placeholder: Ref<DateValue>
  pagedNavigation: Ref<boolean>
  preventDeselect: Ref<boolean>
  grid: Ref<Grid<DateValue>[]>
  weekDays: Ref<string[]>
  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>
  weekdayFormat: Ref<WeekDayFormat>
  fixedWeeks: Ref<boolean>
  multiple: Ref<boolean>
  numberOfMonths: Ref<number>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  initialFocus: Ref<boolean>
  onDateChange: (date: DateValue) => void
  onPlaceholderChange: (date: DateValue) => void
  fullCalendarLabel: Ref<string>
  parentElement: Ref<HTMLElement | undefined>
  headingValue: Ref<string>
  isInvalid: Ref<boolean>
  isDateDisabled: Matcher
  isDateSelected: Matcher
  isDateUnavailable?: Matcher
  isOutsideVisibleView: (date: DateValue) => boolean
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean
  formatter: Formatter
  dir: Ref<Direction>
  disableDaysOutsideCurrentView: Ref<boolean>
}

export interface CalendarRootProps extends PrimitiveProps {
  /** The default value for the calendar */
  defaultValue?: DateValue
  /** The default placeholder date */
  defaultPlaceholder?: DateValue
  /** The placeholder date, which is used to determine what month to display when no date is selected */
  placeholder?: DateValue
  /** This property causes the previous and next buttons to navigate by the number of months displayed at once, rather than one month */
  pagedNavigation?: boolean
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean
  /** The day of the week to start the calendar on */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** The format to use for the weekday strings provided via the weekdays slot prop */
  weekdayFormat?: WeekDayFormat
  /** The accessible label for the calendar */
  calendarLabel?: string
  /** Whether or not to always display 6 weeks in the calendar */
  fixedWeeks?: boolean
  /** The maximum date that can be selected */
  maxValue?: DateValue
  /** The minimum date that can be selected */
  minValue?: DateValue
  /** The locale to use for formatting dates */
  locale?: string
  /** The number of months to display at once */
  numberOfMonths?: number
  /** Whether the calendar is disabled */
  disabled?: boolean
  /** Whether the calendar is readonly */
  readonly?: boolean
  /** If true, the calendar will focus the selected day, today, or the first day of the month depending on what is visible when the calendar is mounted */
  initialFocus?: boolean
  /** A function that returns whether or not a date is disabled */
  isDateDisabled?: Matcher
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher
  /** The reading direction of the calendar when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** A function that returns the next page of the calendar. It receives the current placeholder as an argument inside the component. */
  nextPage?: (placeholder: DateValue) => DateValue
  /** A function that returns the previous page of the calendar. It receives the current placeholder as an argument inside the component. */
  prevPage?: (placeholder: DateValue) => DateValue
  /** The controlled checked state of the calendar */
  modelValue?: DateValue | DateValue[] | undefined
  /** Whether multiple dates can be selected */
  multiple?: boolean
  /** Whether or not to disable days outside the current view. */
  disableDaysOutsideCurrentView?: boolean
}

export type CalendarRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | undefined]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue]
}

export const [injectCalendarRootContext, provideCalendarRootContext]
  = createContext<CalendarRootContext>('CalendarRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { onMounted, toRefs, watch } from 'vue'
import { Primitive, usePrimitiveElement } from '@/Primitive'

const props = withDefaults(defineProps<CalendarRootProps>(), {
  defaultValue: undefined,
  as: 'div',
  pagedNavigation: false,
  preventDeselect: false,
  weekStartsOn: 0,
  weekdayFormat: 'narrow',
  fixedWeeks: false,
  multiple: false,
  numberOfMonths: 1,
  disabled: false,
  readonly: false,
  initialFocus: false,
  placeholder: undefined,
  isDateDisabled: undefined,
  isDateUnavailable: undefined,
  disableDaysOutsideCurrentView: false,
})
const emits = defineEmits<CalendarRootEmits>()
defineSlots<{
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue
    /** The grid of dates */
    grid: Grid<DateValue>[]
    /** The days of the week */
    weekDays: string[]
    /** The start of the week */
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
    /** The calendar locale */
    locale: string
    /** Whether or not to always display 6 weeks in the calendar */
    fixedWeeks: boolean
    /** The current date of the calendar */
    modelValue: DateValue | DateValue[] | undefined
  }) => any
}>()

const {
  disabled,
  readonly,
  initialFocus,
  pagedNavigation,
  weekStartsOn,
  weekdayFormat,
  fixedWeeks,
  multiple,
  minValue,
  maxValue,
  numberOfMonths,
  preventDeselect,
  isDateDisabled: propsIsDateDisabled,
  isDateUnavailable: propsIsDateUnavailable,
  calendarLabel,
  defaultValue,
  nextPage: propsNextPage,
  prevPage: propsPrevPage,
  dir: propDir,
  locale: propLocale,
  disableDaysOutsideCurrentView,
} = toRefs(props)

const { primitiveElement, currentElement: parentElement }
  = usePrimitiveElement()
const locale = useLocale(propLocale)
const dir = useDirection(propDir)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: defaultValue.value,
  passive: (props.modelValue === undefined) as false,
}) as Ref<DateValue | DateValue[] | undefined>

const defaultDate = getDefaultDate({
  defaultPlaceholder: props.placeholder,
  defaultValue: modelValue.value,
  locale: props.locale,
})

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
  isDateDisabled,
  isDateUnavailable,
  isNextButtonDisabled,
  isPrevButtonDisabled,
  weekdays,
  isOutsideVisibleView,
  nextPage,
  prevPage,
  formatter,
  grid,
} = useCalendar({
  locale,
  placeholder,
  weekStartsOn,
  fixedWeeks,
  numberOfMonths,
  minValue,
  maxValue,
  disabled,
  weekdayFormat,
  pagedNavigation,
  isDateDisabled: propsIsDateDisabled.value,
  isDateUnavailable: propsIsDateUnavailable.value,
  calendarLabel,
  nextPage: propsNextPage,
  prevPage: propsPrevPage,
})

const {
  isInvalid,
  isDateSelected,
} = useCalendarState({
  date: modelValue,
  isDateDisabled,
  isDateUnavailable,
})

watch(modelValue, (_modelValue) => {
  if (Array.isArray(_modelValue) && _modelValue.length) {
    const lastValue = _modelValue[_modelValue.length - 1]
    if (lastValue && !isEqualDay(placeholder.value, lastValue))
      onPlaceholderChange(lastValue)
  }
  else if (!Array.isArray(_modelValue) && _modelValue && !isEqualDay(placeholder.value, _modelValue)) {
    onPlaceholderChange(_modelValue)
  }
})

function onDateChange(value: DateValue) {
  if (!multiple.value) {
    if (!modelValue.value) {
      modelValue.value = value.copy()
      return
    }

    if (!preventDeselect.value && isEqualDay(modelValue.value as DateValue, value)) {
      placeholder.value = value.copy()
      modelValue.value = undefined
    }
    else { modelValue.value = value.copy() }
  }
  else if (!modelValue.value) {
    modelValue.value = [value.copy()]
  }
  else if (Array.isArray(modelValue.value)) {
    const index = modelValue.value.findIndex(date => isSameDay(date, value))
    if (index === -1) {
      modelValue.value = [...modelValue.value, value]
    }
    else if (!preventDeselect.value) {
      const next = modelValue.value.filter(date => !isSameDay(date, value))
      if (!next.length) {
        placeholder.value = value.copy()
        modelValue.value = undefined
        return
      }
      modelValue.value = next.map(date => date.copy())
    }
  }
}

onMounted(() => {
  if (initialFocus.value)
    handleCalendarInitialFocus(parentElement.value)
})

provideCalendarRootContext({
  isDateUnavailable,
  dir,
  isDateDisabled,
  locale,
  formatter,
  modelValue,
  placeholder,
  disabled,
  initialFocus,
  pagedNavigation,
  grid,
  weekDays: weekdays,
  weekStartsOn,
  weekdayFormat,
  fixedWeeks,
  multiple,
  numberOfMonths,
  readonly,
  preventDeselect,
  fullCalendarLabel,
  headingValue,
  isInvalid,
  isDateSelected,
  isNextButtonDisabled,
  isPrevButtonDisabled,
  isOutsideVisibleView,
  nextPage,
  prevPage,
  parentElement,
  onPlaceholderChange,
  onDateChange,
  disableDaysOutsideCurrentView,
})
</script>

<template>
  <Primitive
    ref="primitiveElement"
    :as="as"
    :as-child="asChild"
    role="application"
    :aria-label="fullCalendarLabel"
    :data-readonly="readonly ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    :dir="dir"
  >
    <slot
      :date="placeholder"
      :grid="grid"
      :week-days="weekdays"
      :week-starts-on="weekStartsOn"
      :locale="locale"
      :fixed-weeks="fixedWeeks"
      :model-value="modelValue"
    />
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
  </Primitive>
</template>
