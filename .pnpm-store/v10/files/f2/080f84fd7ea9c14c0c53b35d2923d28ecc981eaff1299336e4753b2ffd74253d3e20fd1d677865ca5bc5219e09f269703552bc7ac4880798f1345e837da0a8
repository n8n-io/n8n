import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Grid, Matcher } from '@/date'
import type { DateFormatterOptions } from '@/shared/useDateFormatter'
import { endOfMonth } from '@internationalized/date'
import { computed, ref, watch } from 'vue'
import { createMonthGrid, isAfter, isBefore, isSameYearMonth, toDate } from '@/date'
import { useDateFormatter } from '@/shared'

export type UseMonthPickerProps = {
  locale: Ref<string>
  placeholder: Ref<DateValue>
  minValue: Ref<DateValue | undefined>
  maxValue: Ref<DateValue | undefined>
  disabled: Ref<boolean>
  isMonthDisabled?: Matcher | Ref<Matcher | undefined>
  isMonthUnavailable?: Matcher | Ref<Matcher | undefined>
  calendarLabel: Ref<string | undefined>
  nextPage: Ref<((placeholder: DateValue) => DateValue) | undefined>
  prevPage: Ref<((placeholder: DateValue) => DateValue) | undefined>
}

export type UseMonthPickerStateProps = {
  isMonthDisabled: Matcher
  isMonthUnavailable: Matcher
  date: Ref<DateValue | DateValue[] | undefined>
}

export function useMonthPickerState(props: UseMonthPickerStateProps) {
  function isMonthSelected(dateObj: DateValue) {
    if (Array.isArray(props.date.value))
      return props.date.value.some(d => isSameYearMonth(d, dateObj))
    else if (!props.date.value)
      return false
    else
      return isSameYearMonth(props.date.value, dateObj)
  }

  const isInvalid = computed(() => {
    if (Array.isArray(props.date.value)) {
      if (!props.date.value.length)
        return false
      for (const dateObj of props.date.value) {
        if (props.isMonthDisabled?.(dateObj))
          return true
        if (props.isMonthUnavailable?.(dateObj))
          return true
      }
    }
    else {
      if (!props.date.value)
        return false
      if (props.isMonthDisabled?.(props.date.value))
        return true
      if (props.isMonthUnavailable?.(props.date.value))
        return true
    }
    return false
  })

  return { isMonthSelected, isInvalid }
}

export function useMonthPicker(props: UseMonthPickerProps) {
  const formatter = useDateFormatter(props.locale.value)

  const resolveMatcher = (matcher?: Matcher | Ref<Matcher | undefined>) =>
    typeof matcher === 'function' ? matcher : matcher?.value

  const headingFormatOptions = computed(() => {
    const options: DateFormatterOptions = {
      calendar: props.placeholder.value.calendar.identifier,
    }

    if (props.placeholder.value.calendar.identifier === 'gregory' && props.placeholder.value.era === 'BC')
      options.era = 'short'

    return options
  })

  const grid = ref<Grid<DateValue>>(createMonthGrid({ dateObj: props.placeholder.value })) as Ref<Grid<DateValue>>

  function isMonthDisabled(dateObj: DateValue) {
    if (resolveMatcher(props.isMonthDisabled)?.(dateObj) || props.disabled.value)
      return true
    if (props.maxValue.value && isAfter(dateObj.set({ day: 1 }), props.maxValue.value))
      return true
    if (props.minValue.value && isBefore(endOfMonth(dateObj), props.minValue.value))
      return true
    return false
  }

  const isMonthUnavailable = (date: DateValue) => {
    if (resolveMatcher(props.isMonthUnavailable)?.(date))
      return true
    return false
  }

  const isNextButtonDisabled = (nextPageFunc?: (date: DateValue) => DateValue) => {
    if (!props.maxValue.value)
      return false
    if (props.disabled.value)
      return true

    const currentDate = grid.value.value
    if (nextPageFunc || props.nextPage.value) {
      const nextDate = (nextPageFunc || props.nextPage.value)!(currentDate)
      return isAfter(nextDate.set({ month: 1, day: 1 }), props.maxValue.value)
    }

    const nextYear = currentDate.add({ years: 1 }).set({ month: 1, day: 1 })
    return isAfter(nextYear, props.maxValue.value)
  }

  const isPrevButtonDisabled = (prevPageFunc?: (date: DateValue) => DateValue) => {
    if (!props.minValue.value)
      return false
    if (props.disabled.value)
      return true

    const currentDate = grid.value.value
    if (prevPageFunc || props.prevPage.value) {
      const prevDate = (prevPageFunc || props.prevPage.value)!(currentDate)
      return isBefore(endOfMonth(prevDate.set({ month: 12 })), props.minValue.value)
    }

    const prevYear = currentDate.subtract({ years: 1 }).set({ month: 12, day: 31 })
    return isBefore(prevYear, props.minValue.value)
  }

  const nextPage = (nextPageFunc?: (date: DateValue) => DateValue) => {
    const currentDate = grid.value.value

    if (nextPageFunc || props.nextPage.value) {
      const newDate = (nextPageFunc || props.nextPage.value)!(currentDate)
      grid.value = createMonthGrid({ dateObj: newDate })
      props.placeholder.value = newDate.set({ day: 1 })
      return
    }

    const newDate = currentDate.add({ years: 1 })
    grid.value = createMonthGrid({ dateObj: newDate })
    props.placeholder.value = newDate.set({ day: 1 })
  }

  const prevPage = (prevPageFunc?: (date: DateValue) => DateValue) => {
    const currentDate = grid.value.value

    if (prevPageFunc || props.prevPage.value) {
      const newDate = (prevPageFunc || props.prevPage.value)!(currentDate)
      grid.value = createMonthGrid({ dateObj: newDate })
      props.placeholder.value = newDate.set({ day: 1 })
      return
    }

    const newDate = currentDate.subtract({ years: 1 })
    grid.value = createMonthGrid({ dateObj: newDate })
    props.placeholder.value = newDate.set({ day: 1 })
  }

  watch(props.placeholder, (value) => {
    if (value.year === grid.value.value.year)
      return
    grid.value = createMonthGrid({ dateObj: value })
  })

  watch(props.locale, () => {
    formatter.setLocale(props.locale.value)
    grid.value = createMonthGrid({ dateObj: props.placeholder.value })
  })

  const headingValue = computed(() => {
    if (props.locale.value !== formatter.getLocale())
      formatter.setLocale(props.locale.value)

    return formatter.fullYear(toDate(grid.value.value), headingFormatOptions.value)
  })

  const fullCalendarLabel = computed(() => `${props.calendarLabel.value ?? 'Month Picker'}, ${headingValue.value}`)

  return {
    isMonthDisabled,
    isMonthUnavailable,
    isNextButtonDisabled,
    isPrevButtonDisabled,
    grid,
    formatter,
    nextPage,
    prevPage,
    headingValue,
    fullCalendarLabel,
  }
}
