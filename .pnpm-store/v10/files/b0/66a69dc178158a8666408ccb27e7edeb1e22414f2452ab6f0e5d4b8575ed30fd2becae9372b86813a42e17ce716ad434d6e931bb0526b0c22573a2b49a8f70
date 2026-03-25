<script lang="ts">
import type { RangeCalendarHeadingProps } from '..'
import { RangeCalendarHeading } from '..'

export interface DateRangePickerHeadingProps extends RangeCalendarHeadingProps {}
</script>

<script setup lang="ts">
const props = defineProps<DateRangePickerHeadingProps>()
defineSlots<{
  default?: (props: {
    /** Current month and year */
    headingValue: string
  }) => any
}>()
</script>

<template>
  <RangeCalendarHeading
    v-slot="{ headingValue }"
    v-bind="props"
  >
    <slot :heading-value="headingValue">
      {{ headingValue }}
    </slot>
  </RangeCalendarHeading>
</template>
