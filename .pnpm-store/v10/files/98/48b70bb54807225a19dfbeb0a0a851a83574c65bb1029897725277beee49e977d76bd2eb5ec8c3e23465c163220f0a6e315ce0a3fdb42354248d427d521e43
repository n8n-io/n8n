import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Matcher } from '@/date'
import { computed } from 'vue'
import { areAllMonthsBetweenValid, compareYearMonth, getMonthsBetween, isSameYearMonth } from '@/date'

export type UseRangeMonthPickerProps = {
  start: Ref<DateValue | undefined>
  end: Ref<DateValue | undefined>
  isMonthDisabled: Matcher
  isMonthUnavailable: Matcher
  focusedValue: Ref<DateValue | undefined>
  allowNonContiguousRanges: Ref<boolean>
  fixedDate: Ref<'start' | 'end' | undefined>
  maximumMonths?: Ref<number | undefined>
}

export function useRangeMonthPickerState(props: UseRangeMonthPickerProps) {
  const isStartInvalid = computed(() => {
    if (!props.start.value)
      return false
    if (props.isMonthDisabled(props.start.value))
      return true
    return false
  })

  const isEndInvalid = computed(() => {
    if (!props.end.value)
      return false
    if (props.isMonthDisabled(props.end.value))
      return true
    return false
  })

  const isInvalid = computed(() => {
    if (isStartInvalid.value || isEndInvalid.value)
      return true
    if (props.start.value && props.end.value && compareYearMonth(props.end.value, props.start.value) < 0)
      return true
    return false
  })

  const isSelectionStart = (date: DateValue) => {
    if (!props.start.value)
      return false
    return isSameYearMonth(props.start.value, date)
  }

  const isSelectionEnd = (date: DateValue) => {
    if (!props.end.value)
      return false
    return isSameYearMonth(props.end.value, date)
  }

  const isSelected = (date: DateValue) => {
    if (props.start.value && isSameYearMonth(props.start.value, date))
      return true
    if (props.end.value && isSameYearMonth(props.end.value, date))
      return true
    if (props.end.value && props.start.value) {
      return compareYearMonth(date, props.start.value) > 0 && compareYearMonth(date, props.end.value) < 0
    }
    return false
  }

  const rangeIsMonthDisabled = (date: DateValue) => {
    if (props.isMonthDisabled(date))
      return true

    if (props.maximumMonths?.value) {
      const maximumMonths = props.maximumMonths.value

      if (props.start.value && props.end.value) {
        if (props.fixedDate.value) {
          const diff = getMonthsBetween(props.start.value, props.end.value)
          if (diff <= maximumMonths) {
            const monthsLeft = maximumMonths - diff
            const startLimit = props.start.value.subtract({ months: monthsLeft })
            const endLimit = props.end.value.add({ months: monthsLeft })
            return compareYearMonth(date, startLimit) < 0 || compareYearMonth(date, endLimit) > 0
          }

          const fixedValue = props.fixedDate.value === 'start' ? props.start.value : props.end.value
          const maxDate = fixedValue.add({ months: maximumMonths - 1 })
          const minDate = fixedValue.subtract({ months: maximumMonths - 1 })
          return compareYearMonth(date, minDate) < 0 || compareYearMonth(date, maxDate) > 0
        }
        return false
      }
      if (props.start.value) {
        const maxDate = props.start.value.add({ months: maximumMonths - 1 })
        const minDate = props.start.value.subtract({ months: maximumMonths - 1 })
        return compareYearMonth(date, minDate) < 0 || compareYearMonth(date, maxDate) > 0
      }
    }

    return false
  }

  const highlightedRange = computed(() => {
    if (props.start.value && props.end.value && !props.fixedDate.value)
      return null
    if (!props.start.value || !props.focusedValue.value)
      return null

    const isStartBeforeFocused = compareYearMonth(props.start.value, props.focusedValue.value) < 0
    const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value
    const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value

    if (isSameYearMonth(start, end)) {
      return { start, end }
    }

    if (props.maximumMonths?.value && !props.end.value) {
      const maximumMonths = props.maximumMonths.value
      const anchor = props.start.value
      const focused = props.focusedValue.value

      if (compareYearMonth(focused, anchor) >= 0) {
        const maxEnd = anchor.add({ months: maximumMonths - 1 })
        const cappedEnd = compareYearMonth(focused, maxEnd) > 0 ? maxEnd : focused
        return { start: anchor, end: cappedEnd }
      }
      else {
        const minStart = anchor.subtract({ months: maximumMonths - 1 })
        const cappedStart = compareYearMonth(focused, minStart) < 0 ? minStart : focused
        return { start: cappedStart, end: anchor }
      }
    }

    const isValid = areAllMonthsBetweenValid(
      start,
      end,
      props.allowNonContiguousRanges.value ? () => false : props.isMonthUnavailable,
      rangeIsMonthDisabled,
    )
    if (isValid)
      return { start, end }

    return null
  })

  const isHighlightedStart = (date: DateValue) => {
    if (!highlightedRange.value?.start)
      return false
    return isSameYearMonth(highlightedRange.value.start, date)
  }

  const isHighlightedEnd = (date: DateValue) => {
    if (!highlightedRange.value?.end)
      return false
    return isSameYearMonth(highlightedRange.value.end, date)
  }

  return {
    isInvalid,
    isSelected,
    highlightedRange,
    isSelectionStart,
    isSelectionEnd,
    isHighlightedStart,
    isHighlightedEnd,
    isMonthDisabled: rangeIsMonthDisabled,
  }
}
