<script lang="ts">
import type { CalendarCellTriggerProps } from '..'
import type { CalendarCellTriggerSlot } from '@/Calendar/CalendarCellTrigger.vue'
import { CalendarCellTrigger } from '..'

export interface DatePickerCellTriggerProps extends CalendarCellTriggerProps {}
</script>

<script setup lang="ts">
const props = defineProps<DatePickerCellTriggerProps>()
defineSlots<CalendarCellTriggerSlot>()
</script>

<template>
  <CalendarCellTrigger
    v-slot="slotProps"
    v-bind="props"
  >
    <slot v-bind="slotProps" />
  </CalendarCellTrigger>
</template>
