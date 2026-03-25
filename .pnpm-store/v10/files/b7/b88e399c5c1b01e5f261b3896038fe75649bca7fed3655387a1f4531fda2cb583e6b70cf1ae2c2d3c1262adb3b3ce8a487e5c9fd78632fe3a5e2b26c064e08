/*
  * Adapted from https://github.com/melt-ui/melt-ui/blob/develop/src/lib/builders/range-calendar/create.ts
*/

import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Matcher } from '@/date'
import { isSameDay } from '@internationalized/date'
import { computed } from 'vue'
import { areAllDaysBetweenValid, getDaysBetween, isBefore, isBetween } from '@/date'

export type UseRangeCalendarProps = {
  start: Ref<DateValue | undefined>
  end: Ref<DateValue | undefined>
  isDateDisabled: Matcher
  isDateUnavailable: Matcher
  isDateHighlightable?: Matcher
  focusedValue: Ref<DateValue | undefined>
  allowNonContiguousRanges: Ref<boolean>
  fixedDate: Ref<'start' | 'end' | undefined>
  maximumDays?: Ref<number | undefined>
}

export function useRangeCalendarState(props: UseRangeCalendarProps) {
  const isStartInvalid = computed(() => {
    if (!props.start.value)
      return false
    if (props.isDateDisabled(props.start.value))
      return true
    return false
  })

  const isEndInvalid = computed(() => {
    if (!props.end.value)
      return false
    if (props.isDateDisabled(props.end.value))
      return true
    return false
  })

  const isInvalid = computed(
    () => {
      if (isStartInvalid.value || isEndInvalid.value)
        return false
      if (props.start.value && props.end.value && isBefore(props.end.value, props.start.value))
        return true
      return false
    },
  )

  const isSelectionStart = (date: DateValue) => {
    if (!props.start.value)
      return false
    return isSameDay(props.start.value, date)
  }

  const isSelectionEnd = (date: DateValue) => {
    if (!props.end.value)
      return false
    return isSameDay(props.end.value, date)
  }

  const isSelected = (date: DateValue) => {
    if (props.start.value && isSameDay(props.start.value, date))
      return true
    if (props.end.value && isSameDay(props.end.value, date))
      return true
    if (props.end.value && props.start.value)
      return isBetween(date, props.start.value, props.end.value)

    return false
  }

  // Check if a date exceeds maximum days limit from the start date
  const rangeIsDateDisabled = (date: DateValue) => {
    if (props.isDateDisabled(date))
      return true

    // Check if exceeds maximum days limit
    if (props.maximumDays?.value) {
      if (props.start.value && props.end.value) {
        if (props.fixedDate.value) {
          const diff = getDaysBetween(props.start.value, props.end.value).length
          if (diff <= props.maximumDays.value) {
            const daysLeft = props.maximumDays.value - diff - 1
            const startLimit = props.start.value.subtract({ days: daysLeft })
            const endLimit = props.end.value.add({ days: daysLeft })
            return !isBetween(date, startLimit, endLimit)
          }
        }
        return false
      }
      if (props.start.value) {
        const maxDate = props.start.value.add({ days: props.maximumDays.value })
        const minDate = props.start.value.subtract({ days: props.maximumDays.value })
        return !isBetween(date, minDate, maxDate)
      }
    }

    if (!props.start.value || props.end.value || isSameDay(props.start.value, date))
      return false

    return false
  }

  const isDateHighlightable = (date: DateValue) => {
    if (props.isDateHighlightable?.(date))
      return true
    return false
  }

  const highlightedRange = computed(() => {
    if (props.start.value && props.end.value && !props.fixedDate.value)
      return null
    if (!props.start.value || !props.focusedValue.value)
      return null

    const isStartBeforeFocused = isBefore(props.start.value, props.focusedValue.value)
    const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value
    const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value

    if (isSameDay(start, end)) {
      return {
        start,
        end,
      }
    }

    // If maximum days is set and the range exceeds it, limit the highlight
    // We only apply this when we're in the middle of a selection (no end date yet)
    if (props.maximumDays?.value && !props.end.value) {
      // Determine the direction of selection and limit to maximum days
      const cappedEnd = isStartBeforeFocused
        ? start.add({ days: props.maximumDays.value })
        : start.subtract({ days: props.maximumDays.value })

      return {
        start,
        end: cappedEnd,
      }
    }

    const isValid = areAllDaysBetweenValid(start, end, props.allowNonContiguousRanges.value ? () => false : props.isDateUnavailable, rangeIsDateDisabled, props.isDateHighlightable)
    if (isValid) {
      return {
        start,
        end,
      }
    }
    return null
  })

  const isHighlightedStart = (date: DateValue) => {
    if (!highlightedRange.value || !highlightedRange.value.start)
      return false
    return isSameDay(highlightedRange.value.start, date)
  }

  const isHighlightedEnd = (date: DateValue) => {
    if (!highlightedRange.value || !highlightedRange.value.end)
      return false
    return isSameDay(highlightedRange.value.end, date)
  }

  return {
    isInvalid,
    isSelected,
    isDateHighlightable,
    highlightedRange,
    isSelectionStart,
    isSelectionEnd,
    isHighlightedStart,
    isHighlightedEnd,
    isDateDisabled: rangeIsDateDisabled,
  }
}
