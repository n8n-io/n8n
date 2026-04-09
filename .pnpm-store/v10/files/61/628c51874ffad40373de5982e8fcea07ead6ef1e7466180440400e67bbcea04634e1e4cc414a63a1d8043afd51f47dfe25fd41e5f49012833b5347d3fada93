<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'
import { endOfYear, getLocalTimeZone, startOfYear, toCalendar, today } from '@internationalized/date'
import { computed, nextTick } from 'vue'
import { isSameYear, toDate } from '@/date'
import { useKbd } from '@/shared'

export interface YearPickerCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  year: DateValue
}

export interface YearPickerCellTriggerSlot {
  default?: (props: {
    /** Current year value */
    yearValue: string
    /** Current disable state */
    disabled: boolean
    /** Current selected state */
    selected: boolean
    /** Current year is today state */
    today: boolean
    /** Current unavailable state */
    unavailable: boolean
  }) => any
}
</script>

<script setup lang="ts">
import { Primitive, usePrimitiveElement } from '@/Primitive'
import { injectYearPickerRootContext } from './YearPickerRoot.vue'

const props = withDefaults(defineProps<YearPickerCellTriggerProps>(), { as: 'div' })

defineSlots<YearPickerCellTriggerSlot>()

const kbd = useKbd()
const rootContext = injectYearPickerRootContext()

const { primitiveElement } = usePrimitiveElement()

const yearValue = computed(() => {
  rootContext.locale.value
  return rootContext.formatter.fullYear(toDate(props.year))
})

const labelText = computed(() => {
  rootContext.locale.value
  return rootContext.formatter.custom(toDate(props.year), {
    year: 'numeric',
  })
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

const isSelectedYear = computed(() => rootContext.isYearSelected(props.year))

function changeYear(date: DateValue) {
  if (rootContext.readonly.value)
    return
  if (rootContext.isYearDisabled(date) || rootContext.isYearUnavailable?.(date))
    return

  rootContext.onYearChange(date)
}

function handleClick() {
  if (isDisabled.value)
    return
  changeYear(props.year)
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
      changeYear(props.year)
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
    data-reka-year-picker-cell-trigger
    :aria-disabled="isDisabled || isUnavailable ? true : undefined"
    :data-selected="isSelectedYear ? '' : undefined"
    :data-value="year.toString()"
    :data-disabled="isDisabled ? '' : undefined"
    :data-unavailable="isUnavailable ? '' : undefined"
    :data-today="isCurrentYear ? '' : undefined"
    :data-focused="isFocusedYear ? '' : undefined"
    :tabindex="isFocusedYear ? 0 : isDisabled ? undefined : -1"
    @click="handleClick"
    @keydown.up.down.left.right.space.enter.page-up.page-down="handleArrowKey"
    @keydown.enter.prevent
  >
    <slot
      :year-value="yearValue"
      :disabled="isDisabled"
      :today="isCurrentYear"
      :selected="isSelectedYear"
      :unavailable="isUnavailable"
    >
      {{ yearValue }}
    </slot>
  </Primitive>
</template>
