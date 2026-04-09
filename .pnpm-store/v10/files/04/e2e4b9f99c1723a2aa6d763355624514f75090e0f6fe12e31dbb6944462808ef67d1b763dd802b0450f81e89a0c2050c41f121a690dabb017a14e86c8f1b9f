<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'
import { endOfYear, getLocalTimeZone, startOfYear, toCalendar, today } from '@internationalized/date'
import { computed, nextTick } from 'vue'
import { isSameYear, isYearBetweenInclusive, toDate } from '@/date'
import { useKbd } from '@/shared'

export interface YearRangePickerCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  year: DateValue
}

export interface YearRangePickerCellTriggerSlot {
  default?: (props: {
    /** Current year value */
    yearValue: string
    /** Current disable state */
    disabled: boolean
    /** Current selected state */
    selected: boolean
    /** Current year is today's year state */
    today: boolean
    /** Current unavailable state */
    unavailable: boolean
    /** Current highlighted state */
    highlighted: boolean
    /** Current highlighted start state */
    highlightedStart: boolean
    /** Current highlighted end state */
    highlightedEnd: boolean
    /** Current selection start state */
    selectionStart: boolean
    /** Current selection end state */
    selectionEnd: boolean
  }) => any
}
</script>

<script setup lang="ts">
import { Primitive, usePrimitiveElement } from '@/Primitive'
import { injectYearRangePickerRootContext } from './YearRangePickerRoot.vue'

const props = withDefaults(defineProps<YearRangePickerCellTriggerProps>(), { as: 'div' })

defineSlots<YearRangePickerCellTriggerSlot>()

const kbd = useKbd()
const rootContext = injectYearRangePickerRootContext()

const { primitiveElement } = usePrimitiveElement()

const yearValue = computed(() => {
  rootContext.locale.value
  return rootContext.formatter.fullYear(toDate(props.year))
})

const labelText = computed(() => {
  rootContext.locale.value
  return rootContext.formatter.custom(toDate(props.year), { year: 'numeric' })
})

const isUnavailable = computed(() => rootContext.isYearUnavailable?.(props.year) ?? false)

const isCurrentYear = computed(() => {
  const todayDate = toCalendar(today(getLocalTimeZone()), props.year.calendar)
  return isSameYear(props.year, todayDate)
})

const isDisabled = computed(() => rootContext.isYearDisabled(props.year))

const isFocusedYear = computed(() => {
  return !rootContext.disabled.value && isSameYear(props.year, rootContext.placeholder.value)
})

const isSelectedYear = computed(() => rootContext.isSelected(props.year))
const isSelectionStart = computed(() => rootContext.isSelectionStart(props.year))
const isSelectionEnd = computed(() => rootContext.isSelectionEnd(props.year))
const isHighlightStart = computed(() => rootContext.isHighlightedStart(props.year))
const isHighlightEnd = computed(() => rootContext.isHighlightedEnd(props.year))
const isHighlighted = computed(() => rootContext.highlightedRange.value
  ? isYearBetweenInclusive(props.year, rootContext.highlightedRange.value.start, rootContext.highlightedRange.value.end)
  : false)
const allowNonContiguousRanges = computed(() => rootContext.allowNonContiguousRanges.value)

function changeYear(e: MouseEvent | KeyboardEvent, date: DateValue) {
  if (rootContext.readonly.value)
    return
  if (rootContext.isYearDisabled(date) || rootContext.isYearUnavailable?.(date))
    return

  if (rootContext.startValue.value && rootContext.highlightedRange.value === null) {
    if (isSameYear(date, rootContext.startValue.value) && !rootContext.preventDeselect.value && !rootContext.endValue.value) {
      rootContext.startValue.value = undefined
      rootContext.onPlaceholderChange(date)
      rootContext.lastPressedDateValue.value = date.copy()
      return
    }
    else if (!rootContext.endValue.value) {
      e.preventDefault()
      if (rootContext.lastPressedDateValue.value && isSameYear(rootContext.lastPressedDateValue.value, date))
        rootContext.startValue.value = date.copy()
      rootContext.lastPressedDateValue.value = date.copy()
      return
    }
  }

  rootContext.lastPressedDateValue.value = date.copy()

  if (
    rootContext.startValue.value
    && rootContext.endValue.value
    && isSameYear(rootContext.startValue.value, rootContext.endValue.value)
    && isSameYear(rootContext.startValue.value, date)
    && !rootContext.preventDeselect.value
  ) {
    rootContext.startValue.value = undefined
    rootContext.endValue.value = undefined
    rootContext.onPlaceholderChange(date)
    return
  }

  if (!rootContext.startValue.value) {
    rootContext.startValue.value = date.copy()
  }
  else if (!rootContext.endValue.value) {
    rootContext.endValue.value = date.copy()
  }
  else if (rootContext.endValue.value && rootContext.startValue.value) {
    if (!rootContext.fixedDate.value) {
      rootContext.endValue.value = undefined
      rootContext.startValue.value = date.copy()
    }
    else if (rootContext.fixedDate.value === 'start') {
      if (date.compare(rootContext.startValue.value) < 0) {
        rootContext.startValue.value = date.copy()
      }
      else {
        rootContext.endValue.value = date.copy()
      }
    }
    else if (rootContext.fixedDate.value === 'end') {
      if (date.compare(rootContext.endValue.value) > 0) {
        rootContext.endValue.value = date.copy()
      }
      else {
        rootContext.startValue.value = date.copy()
      }
    }
  }
}

function handleClick(e: MouseEvent) {
  if (isDisabled.value)
    return
  changeYear(e, props.year)
}

function handleFocus() {
  if (isDisabled.value || rootContext.isYearUnavailable?.(props.year))
    return
  rootContext.focusedValue.value = props.year.copy()
}

function handleArrowKey(e: KeyboardEvent) {
  if (isDisabled.value)
    return
  e.preventDefault()
  e.stopPropagation()
  const parentElement = rootContext.parentElement.value!
  const sign = rootContext.dir.value === 'rtl' ? -1 : 1

  switch (e.code) {
    case kbd.ARROW_RIGHT:
      shiftFocus(props.year, sign)
      break
    case kbd.ARROW_LEFT:
      shiftFocus(props.year, -sign)
      break
    case kbd.ARROW_UP:
      shiftFocus(props.year, -4)
      break
    case kbd.ARROW_DOWN:
      shiftFocus(props.year, 4)
      break
    case kbd.PAGE_UP:
      shiftFocusPage(-1)
      break
    case kbd.PAGE_DOWN:
      shiftFocusPage(1)
      break
    case kbd.ENTER:
    case kbd.SPACE_CODE:
      changeYear(e, props.year)
  }

  function shiftFocus(currentYear: DateValue, add: number, depth = 0) {
    if (depth > 48)
      return
    const candidateYearValue = currentYear.add({ years: add })

    if ((rootContext.minValue.value && endOfYear(candidateYearValue).compare(rootContext.minValue.value) < 0)
      || (rootContext.maxValue.value && startOfYear(candidateYearValue).compare(rootContext.maxValue.value) > 0)) {
      return
    }

    const candidateYear = parentElement.querySelector<HTMLElement>(`[data-value='${candidateYearValue.toString()}']`)

    if (!candidateYear) {
      if (add > 0) {
        if (rootContext.isNextButtonDisabled())
          return
        rootContext.nextPage()
      }
      else {
        if (rootContext.isPrevButtonDisabled())
          return
        rootContext.prevPage()
      }
      nextTick(() => {
        shiftFocus(currentYear, add, depth + 1)
      })
      return
    }

    if (candidateYear && candidateYear.hasAttribute('data-disabled'))
      return shiftFocus(candidateYearValue, add, depth + 1)

    rootContext.onPlaceholderChange(candidateYearValue)
    candidateYear?.focus()
  }

  function shiftFocusPage(direction: number) {
    const yearsPerPage = rootContext.yearsPerPage.value
    const candidateYearValue = props.year.add({ years: direction * yearsPerPage })

    if ((rootContext.minValue.value && endOfYear(candidateYearValue).compare(rootContext.minValue.value) < 0)
      || (rootContext.maxValue.value && startOfYear(candidateYearValue).compare(rootContext.maxValue.value) > 0)) {
      return
    }

    if (direction > 0) {
      if (rootContext.isNextButtonDisabled())
        return
      rootContext.nextPage()
    }
    else {
      if (rootContext.isPrevButtonDisabled())
        return
      rootContext.prevPage()
    }

    nextTick(() => {
      const candidateYear = parentElement.querySelector<HTMLElement>(`[data-value='${candidateYearValue.toString()}']`)
      if (candidateYear && !candidateYear.hasAttribute('data-disabled')) {
        rootContext.onPlaceholderChange(candidateYearValue)
        candidateYear?.focus()
        return
      }

      if (!candidateYear || candidateYear.hasAttribute('data-disabled'))
        shiftFocus(candidateYearValue, direction > 0 ? 1 : -1, 1)
    })
  }
}
</script>

<template>
  <Primitive
    ref="primitiveElement"
    :as="props.as"
    :as-child="props.asChild"
    role="button"
    :aria-label="labelText"
    data-reka-year-range-picker-cell-trigger
    :aria-pressed="isSelectedYear && (allowNonContiguousRanges || !isUnavailable) ? true : undefined"
    :aria-disabled="isDisabled || isUnavailable ? true : undefined"
    :data-highlighted="isHighlighted && (allowNonContiguousRanges || !isUnavailable) ? '' : undefined"
    :data-selection-start="isSelectionStart ? true : undefined"
    :data-selection-end="isSelectionEnd ? true : undefined"
    :data-highlighted-start="isHighlightStart ? true : undefined"
    :data-highlighted-end="isHighlightEnd ? true : undefined"
    :data-selected="isSelectedYear && (allowNonContiguousRanges || !isUnavailable) ? true : undefined"
    :data-value="year.toString()"
    :data-disabled="isDisabled ? '' : undefined"
    :data-unavailable="isUnavailable ? '' : undefined"
    :data-today="isCurrentYear ? '' : undefined"
    :data-focused="isFocusedYear ? '' : undefined"
    :tabindex="isFocusedYear ? 0 : isDisabled ? undefined : -1"
    @click="handleClick"
    @focusin="handleFocus"
    @mouseenter="handleFocus"
    @keydown.up.down.left.right.space.enter.page-up.page-down="handleArrowKey"
    @keydown.enter.prevent
  >
    <slot
      :year-value="yearValue"
      :disabled="isDisabled"
      :today="isCurrentYear"
      :selected="isSelectedYear"
      :unavailable="isUnavailable"
      :highlighted="isHighlighted && (allowNonContiguousRanges || !isUnavailable)"
      :highlighted-start="isHighlightStart"
      :highlighted-end="isHighlightEnd"
      :selection-start="isSelectionStart"
      :selection-end="isSelectionEnd"
    >
      {{ yearValue }}
    </slot>
  </Primitive>
</template>
