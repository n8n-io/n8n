<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface MonthPickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectMonthPickerRootContext } from './MonthPickerRoot.vue'

withDefaults(defineProps<MonthPickerCellProps>(), { as: 'td' })
const rootContext = injectMonthPickerRootContext()
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    role="gridcell"
    :aria-selected="rootContext.isMonthSelected(date) ? true : undefined"
    :aria-disabled="rootContext.isMonthDisabled(date) || rootContext.isMonthUnavailable?.(date)"
    :data-disabled="rootContext.isMonthDisabled(date) ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
