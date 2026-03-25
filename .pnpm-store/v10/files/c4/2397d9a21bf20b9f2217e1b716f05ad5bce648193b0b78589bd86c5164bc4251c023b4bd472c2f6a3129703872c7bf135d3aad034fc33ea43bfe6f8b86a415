<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'
import {

  getLocalTimeZone,
  isSameDay,
  isSameMonth,
  isToday,
} from '@internationalized/date'
import { computed, nextTick } from 'vue'
import { getSelectableCells } from '@/Calendar/utils'
import { getDaysInMonth, isBetweenInclusive, toDate } from '@/date'
import { useKbd } from '@/shared'

export interface RangeCalendarCellTriggerProps extends PrimitiveProps {
  day: DateValue
  month: DateValue
}

export interface RangeCalendarCellTriggerSlot {
  default?: (props: {
    /** Current day */
    dayValue: string
    /** Current disable state */
    disabled: boolean
    /** Current selected state */
    selected: boolean
    /** Current today state */
    today: boolean
    /** Current outside view state */
    outsideView: boolean
    /** Current outside visible view state */
    outsideVisibleView: boolean
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
import { injectRangeCalendarRootContext } from './RangeCalendarRoot.vue'

const props = withDefaults(defineProps<RangeCalendarCellTriggerProps>(), { as: 'div' })
defineSlots<RangeCalendarCellTriggerSlot>()

const rootContext = injectRangeCalendarRootContext()

const kbd = useKbd()

const { primitiveElement, currentElement } = usePrimitiveElement()

const labelText = computed(() => rootContext.formatter.custom(toDate(props.day), {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}))

const isUnavailable = computed(() => rootContext.isDateUnavailable?.(props.day) ?? false)
const isSelectedDate = computed(() => rootContext.isSelected(props.day))
const isSelectionStart = computed(() => rootContext.isSelectionStart(props.day))
const isSelectionEnd = computed(() => rootContext.isSelectionEnd(props.day))
const isHighlightStart = computed(() => rootContext.isHighlightedStart(props.day))
const isHighlightEnd = computed(() => rootContext.isHighlightedEnd(props.day))
const isHighlighted = computed(() => rootContext.highlightedRange.value
  ? isBetweenInclusive(props.day, rootContext.highlightedRange.value.start, rootContext.highlightedRange.value.end)
  : false)
const allowNonContiguousRanges = computed(() => rootContext.allowNonContiguousRanges.value)

const isDateToday = computed(() => {
  return isToday(props.day, getLocalTimeZone())
})
const isOutsideView = computed(() => {
  return !isSameMonth(props.day, props.month)
})
const isOutsideVisibleView = computed(() =>
  rootContext.isOutsideVisibleView(props.day),
)

const isDisabled = computed(() => rootContext.isDateDisabled(props.day) || (rootContext.disableDaysOutsideCurrentView.value && isOutsideView.value))

const dayValue = computed(() => props.day.day.toLocaleString(rootContext.locale.value))

const isFocusedDate = computed(() => {
  return !rootContext.disabled.value && isSameDay(props.day, rootContext.placeholder.value)
})

function changeDate(e: MouseEvent | KeyboardEvent, date: DateValue) {
  if (rootContext.readonly.value)
    return
  if (rootContext.isDateDisabled(date) || rootContext.isDateUnavailable?.(date))
    return

  rootContext.lastPressedDateValue.value = date.copy()

  if (rootContext.startValue.value && rootContext.highlightedRange.value === null) {
    if (isSameDay(date, rootContext.startValue.value) && !rootContext.preventDeselect.value && !rootContext.endValue.value) {
      rootContext.startValue.value = undefined
      rootContext.onPlaceholderChange(date)
      return
    }
    else if (!rootContext.endValue.value) {
      e.preventDefault()
      if (rootContext.lastPressedDateValue.value && isSameDay(rootContext.lastPressedDateValue.value, date))
        rootContext.startValue.value = date.copy()
      return
    }
  }

  if (rootContext.startValue.value && rootContext.endValue.value && isSameDay(rootContext.endValue.value, date) && !rootContext.preventDeselect.value) {
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
  changeDate(e, props.day)
}

function handleFocus() {
  if (isDisabled.value || rootContext.isDateUnavailable?.(props.day))
    return
  rootContext.focusedValue.value = props.day.copy()
}

function handleArrowKey(e: KeyboardEvent) {
  if (isDisabled.value)
    return
  e.preventDefault()
  e.stopPropagation()
  const parentElement = rootContext.parentElement.value!
  const indexIncrementation = 7
  const sign = rootContext.dir.value === 'rtl' ? -1 : 1
  switch (e.code) {
    case kbd.ARROW_RIGHT:
      shiftFocus(currentElement.value, sign)
      break
    case kbd.ARROW_LEFT:
      shiftFocus(currentElement.value, -sign)
      break
    case kbd.ARROW_UP:
      shiftFocus(currentElement.value, -indexIncrementation)
      break
    case kbd.ARROW_DOWN:
      shiftFocus(currentElement.value, indexIncrementation)
      break
    case kbd.ENTER:
    case kbd.SPACE_CODE:
      changeDate(e, props.day)
  }

  function shiftFocus(node: HTMLElement, add: number) {
    const allCollectionItems: HTMLElement[] = getSelectableCells(parentElement)
    if (!allCollectionItems.length)
      return

    const index = allCollectionItems.indexOf(node)
    const newIndex = index + add

    if (newIndex >= 0 && newIndex < allCollectionItems.length) {
      if (allCollectionItems[newIndex].hasAttribute('data-disabled')) {
        shiftFocus(allCollectionItems[newIndex], add)
      }
      allCollectionItems[newIndex].focus()
      return
    }

    if (newIndex < 0) {
      if (rootContext.isPrevButtonDisabled())
        return
      rootContext.prevPage()
      nextTick(() => {
        const newCollectionItems: HTMLElement[] = getSelectableCells(parentElement)
        if (!newCollectionItems.length)
          return
        if (!rootContext.pagedNavigation.value && rootContext.numberOfMonths.value > 1) {
        // Placeholder is set to first month of the new page
          const numberOfDays = getDaysInMonth(rootContext.placeholder.value)
          const computedIndex = numberOfDays - Math.abs(newIndex)
          if (newCollectionItems[computedIndex].hasAttribute('data-disabled')) {
            shiftFocus(newCollectionItems[computedIndex], add)
          }
          newCollectionItems[
            computedIndex
          ].focus()
          return
        }
        const computedIndex = newCollectionItems.length - Math.abs(newIndex)
        if (newCollectionItems[computedIndex].hasAttribute('data-disabled')) {
          shiftFocus(newCollectionItems[computedIndex], add)
        }
        newCollectionItems[
          computedIndex
        ].focus()
      })
      return
    }

    if (newIndex >= allCollectionItems.length) {
      if (rootContext.isNextButtonDisabled())
        return
      rootContext.nextPage()
      nextTick(() => {
        const newCollectionItems: HTMLElement[] = getSelectableCells(parentElement)
        if (!newCollectionItems.length)
          return

        if (!rootContext.pagedNavigation.value && rootContext.numberOfMonths.value > 1) {
        // Placeholder is set to first month of the new page
          const numberOfDays = getDaysInMonth(
            rootContext.placeholder.value.add({ months: rootContext.numberOfMonths.value - 1 }),
          )

          const computedIndex = newIndex - allCollectionItems.length + (newCollectionItems.length - numberOfDays)

          if (newCollectionItems[computedIndex].hasAttribute('data-disabled')) {
            shiftFocus(newCollectionItems[computedIndex], add)
          }
          newCollectionItems[computedIndex].focus()
          return
        }

        const computedIndex = newIndex - allCollectionItems.length
        if (newCollectionItems[computedIndex].hasAttribute('data-disabled')) {
          shiftFocus(newCollectionItems[computedIndex], add)
        }

        newCollectionItems[computedIndex].focus()
      })
    }
  }
}
</script>

<template>
  <Primitive
    ref="primitiveElement"
    v-bind="props"
    role="button"
    :aria-label="labelText"
    data-reka-calendar-cell-trigger
    :aria-selected="isSelectedDate && (allowNonContiguousRanges || !isUnavailable) ? true : undefined"
    :aria-disabled="isDisabled || isUnavailable ? true : undefined"
    :data-highlighted="isHighlighted && (allowNonContiguousRanges || !isUnavailable) ? '' : undefined"
    :data-selection-start="isSelectionStart ? true : undefined"
    :data-selection-end="isSelectionEnd ? true : undefined"
    :data-highlighted-start="isHighlightStart ? true : undefined"
    :data-highlighted-end="isHighlightEnd ? true : undefined"
    :data-selected="isSelectedDate && (allowNonContiguousRanges || !isUnavailable) ? true : undefined"
    :data-outside-visible-view="isOutsideVisibleView ? '' : undefined"
    :data-value="day.toString()"
    :data-disabled="isDisabled ? '' : undefined"
    :data-unavailable="isUnavailable ? '' : undefined"
    :data-today="isDateToday ? '' : undefined"
    :data-outside-view="isOutsideView ? '' : undefined"
    :data-focused="isFocusedDate ? '' : undefined"
    :tabindex="isFocusedDate ? 0 : isOutsideView || isDisabled ? undefined : -1"
    @click="handleClick"
    @focusin="handleFocus"
    @mouseenter="handleFocus"
    @keydown.up.down.left.right.enter.space="handleArrowKey"
  >
    <slot
      :day-value="dayValue"
      :disabled="isDisabled"
      :today="isDateToday"
      :selected="isSelectedDate"
      :outside-view="isOutsideView"
      :outside-visible-view="isOutsideVisibleView"
      :unavailable="isUnavailable"
      :highlighted="isHighlighted && (allowNonContiguousRanges || !isUnavailable)"
      :highlighted-start="isHighlightStart"
      :highlighted-end="isHighlightEnd"
      :selection-start="isSelectionStart"
      :selection-end="isSelectionEnd"
    >
      {{ dayValue }}
    </slot>
  </Primitive>
</template>
