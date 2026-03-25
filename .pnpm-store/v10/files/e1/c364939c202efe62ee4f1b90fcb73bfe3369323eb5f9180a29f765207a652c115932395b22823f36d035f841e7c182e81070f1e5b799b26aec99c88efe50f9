<script lang="ts">
import { isEqualDay } from '@internationalized/date'
import { DateRangeFieldRoot } from '..'
import { injectDateRangePickerRootContext } from './DateRangePickerRoot.vue'
</script>

<script setup lang="ts">
const rootContext = injectDateRangePickerRootContext()
</script>

<template>
  <DateRangeFieldRoot
    v-slot="{ segments, modelValue }"
    :ref="rootContext.dateFieldRef"
    :model-value="rootContext.modelValue.value"
    :placeholder="rootContext.placeholder.value"
    v-bind="{
      id: rootContext.id.value,
      name: rootContext.name.value,
      disabled: rootContext.disabled.value,
      minValue: rootContext.minValue.value,
      maxValue: rootContext.maxValue.value,
      readonly: rootContext.readonly.value,
      hourCycle: rootContext.hourCycle.value,
      granularity: rootContext.granularity.value,
      hideTimeZone: rootContext.hideTimeZone.value,
      locale: rootContext.locale.value,
      isDateUnavailable: rootContext.isDateUnavailable,
      required: rootContext.required.value,
      dir: rootContext.dir.value,
      step: rootContext.step.value,
    }"
    @update:model-value="(date) => {
      if (date.start && rootContext.modelValue.value.start && date.end && rootContext.modelValue.value.end && date.start.compare(rootContext.modelValue.value.start) === 0 && date.end.compare(rootContext.modelValue.value.end) === 0) return
      rootContext.onDateChange(date)
    }"
    @update:placeholder="(date) => {
      if (isEqualDay(date, rootContext.placeholder.value) && date.compare(rootContext.placeholder.value) === 0) return
      rootContext.onPlaceholderChange(date)
    }"
  >
    <slot
      :segments="segments"
      :model-value="modelValue"
    />
  </DateRangeFieldRoot>
</template>
