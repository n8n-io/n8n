import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Matcher } from '@/date'
import { computed } from 'vue'
import { areAllYearsBetweenValid, getYearsBetween, isSameYear } from '@/date'

export type UseRangeYearPickerProps = {
  start: Ref<DateValue | undefined>
  end: Ref<DateValue | undefined>
  isYearDisabled: Matcher
  isYearUnavailable: Matcher
  focusedValue: Ref<DateValue | undefined>
  allowNonContiguousRanges: Ref<boolean>
  fixedDate: Ref<'start' | 'end' | undefined>
  maximumYears?: Ref<number | undefined>
}

export function useRangeYearPickerState(props: UseRangeYearPickerProps) {
  const isStartInvalid = computed(() => {
    if (!props.start.value)
      return false
    if (props.isYearDisabled(props.start.value))
      return true
    return false
  })

  const isEndInvalid = computed(() => {
    if (!props.end.value)
      return false
    if (props.isYearDisabled(props.end.value))
      return true
    return false
  })

  const isInvalid = computed(() => {
    if (isStartInvalid.value || isEndInvalid.value)
      return true
    if (props.start.value && props.end.value && props.end.value.year < props.start.value.year)
      return true
    return false
  })

  const isSelectionStart = (date: DateValue) => {
    if (!props.start.value)
      return false
    return isSameYear(props.start.value, date)
  }

  const isSelectionEnd = (date: DateValue) => {
    if (!props.end.value)
      return false
    return isSameYear(props.end.value, date)
  }

  const isSelected = (date: DateValue) => {
    if (props.start.value && isSameYear(props.start.value, date))
      return true
    if (props.end.value && isSameYear(props.end.value, date))
      return true
    if (props.end.value && props.start.value) {
      return date.year > props.start.value.year && date.year < props.end.value.year
    }
    return false
  }

  const rangeIsYearDisabled = (date: DateValue) => {
    if (props.isYearDisabled(date))
      return true

    if (props.maximumYears?.value) {
      const maximumYears = props.maximumYears.value

      if (props.start.value && props.end.value) {
        if (props.fixedDate.value) {
          const diff = getYearsBetween(props.start.value, props.end.value)
          if (diff <= maximumYears) {
            const yearsLeft = maximumYears - diff
            const startLimit = props.start.value.subtract({ years: yearsLeft })
            const endLimit = props.end.value.add({ years: yearsLeft })
            return date.year < startLimit.year || date.year > endLimit.year
          }

          const fixedValue = props.fixedDate.value === 'start' ? props.start.value : props.end.value
          const maxDate = fixedValue.add({ years: maximumYears - 1 })
          const minDate = fixedValue.subtract({ years: maximumYears - 1 })
          return date.year < minDate.year || date.year > maxDate.year
        }
        return false
      }
      if (props.start.value) {
        const maxDate = props.start.value.add({ years: maximumYears - 1 })
        const minDate = props.start.value.subtract({ years: maximumYears - 1 })
        return date.year < minDate.year || date.year > maxDate.year
      }
    }

    return false
  }

  const highlightedRange = computed(() => {
    if (props.start.value && props.end.value && !props.fixedDate.value)
      return null
    if (!props.start.value || !props.focusedValue.value)
      return null

    const isStartBeforeFocused = props.start.value.year < props.focusedValue.value.year
    const start = isStartBeforeFocused ? props.start.value : props.focusedValue.value
    const end = isStartBeforeFocused ? props.focusedValue.value : props.start.value

    if (isSameYear(start, end)) {
      return { start, end }
    }

    if (props.maximumYears?.value && !props.end.value) {
      const maximumYears = props.maximumYears.value
      const anchor = props.start.value
      const focused = props.focusedValue.value

      if (focused.year >= anchor.year) {
        const maxEnd = anchor.add({ years: maximumYears - 1 })
        const cappedEnd = focused.year > maxEnd.year ? maxEnd : focused
        return { start: anchor, end: cappedEnd }
      }
      else {
        const minStart = anchor.subtract({ years: maximumYears - 1 })
        const cappedStart = focused.year < minStart.year ? minStart : focused
        return { start: cappedStart, end: anchor }
      }
    }

    const isValid = areAllYearsBetweenValid(
      start,
      end,
      props.allowNonContiguousRanges.value ? () => false : props.isYearUnavailable,
      rangeIsYearDisabled,
    )
    if (isValid)
      return { start, end }

    return null
  })

  const isHighlightedStart = (date: DateValue) => {
    if (!highlightedRange.value?.start)
      return false
    return isSameYear(highlightedRange.value.start, date)
  }

  const isHighlightedEnd = (date: DateValue) => {
    if (!highlightedRange.value?.end)
      return false
    return isSameYear(highlightedRange.value.end, date)
  }

  return {
    isInvalid,
    isSelected,
    highlightedRange,
    isSelectionStart,
    isSelectionEnd,
    isHighlightedStart,
    isHighlightedEnd,
    isYearDisabled: rangeIsYearDisabled,
  }
}
