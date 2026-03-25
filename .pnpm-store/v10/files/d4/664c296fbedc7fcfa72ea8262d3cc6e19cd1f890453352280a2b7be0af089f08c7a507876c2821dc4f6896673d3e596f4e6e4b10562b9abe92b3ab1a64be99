<script lang="ts">
import type { CalendarHeadingProps } from '..'
import { CalendarHeading } from '..'

export interface DatePickerHeadingProps extends CalendarHeadingProps {}
</script>

<script setup lang="ts">
const props = defineProps<DatePickerHeadingProps>()
defineSlots<{
  default?: (props: {
    /** Current month and year */
    headingValue: string
  }) => any
}>()
</script>

<template>
  <CalendarHeading
    v-slot="{ headingValue }"
    v-bind="props"
  >
    <slot :heading-value="headingValue">
      {{ headingValue }}
    </slot>
  </CalendarHeading>
</template>
