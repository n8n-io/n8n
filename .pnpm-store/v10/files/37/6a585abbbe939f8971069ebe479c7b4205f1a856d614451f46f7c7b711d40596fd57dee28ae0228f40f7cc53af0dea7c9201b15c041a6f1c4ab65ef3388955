<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface YearRangePickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectYearRangePickerRootContext } from './YearRangePickerRoot.vue'

withDefaults(defineProps<YearRangePickerCellProps>(), { as: 'td' })
const rootContext = injectYearRangePickerRootContext()
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    role="gridcell"
    :aria-selected="rootContext.isSelected(date) ? true : undefined"
    :aria-disabled="rootContext.isYearDisabled(date) || rootContext.isYearUnavailable?.(date)"
    :data-disabled="rootContext.isYearDisabled(date) ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
