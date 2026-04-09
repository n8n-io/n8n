<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface YearPickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectYearPickerRootContext } from './YearPickerRoot.vue'

withDefaults(defineProps<YearPickerCellProps>(), { as: 'td' })
const rootContext = injectYearPickerRootContext()
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    role="gridcell"
    :aria-selected="rootContext.isYearSelected(date) ? true : undefined"
    :aria-disabled="rootContext.isYearDisabled(date) || rootContext.isYearUnavailable?.(date)"
    :data-disabled="rootContext.isYearDisabled(date) ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
