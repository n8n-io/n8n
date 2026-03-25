<script lang="ts">
import type { DateValue } from '@internationalized/date'
import { isEqualDay } from '@internationalized/date'
import { CalendarRoot } from '..'
import { injectDatePickerRootContext } from './DatePickerRoot.vue'
</script>

<script setup lang="ts">
const rootContext = injectDatePickerRootContext()
</script>

<template>
  <CalendarRoot
    v-slot="{ weekDays, grid, date, weekStartsOn, locale, fixedWeeks }"
    v-bind="{
      isDateDisabled: rootContext.isDateDisabled,
      isDateUnavailable: rootContext.isDateUnavailable,
      minValue: rootContext.minValue.value,
      maxValue: rootContext.maxValue.value,
      locale: rootContext.locale.value,
      disabled: rootContext.disabled.value,
      pagedNavigation: rootContext.pagedNavigation.value,
      weekStartsOn: rootContext.weekStartsOn.value,
      weekdayFormat: rootContext.weekdayFormat.value,
      fixedWeeks: rootContext.fixedWeeks.value,
      numberOfMonths: rootContext.numberOfMonths.value,
      readonly: rootContext.readonly.value,
      preventDeselect: rootContext.preventDeselect.value,
      dir: rootContext.dir.value,
    }"
    :model-value="rootContext.modelValue.value"
    :placeholder="rootContext.placeholder.value"
    :multiple="false"
    @update:model-value="(date: DateValue | undefined) => {
      if (date && rootContext.modelValue.value && isEqualDay(date, rootContext.modelValue.value)) return
      rootContext.onDateChange(date)
    }"
    @update:placeholder="(date: DateValue) => {
      if (isEqualDay(date, rootContext.placeholder.value)) return
      rootContext.onPlaceholderChange(date)
    }"
  >
    <slot
      :date="date"
      :grid="grid"
      :week-days="weekDays"
      :week-starts-on="weekStartsOn"
      :locale="locale"
      :fixed-weeks="fixedWeeks"
    />
  </CalendarRoot>
</template>
