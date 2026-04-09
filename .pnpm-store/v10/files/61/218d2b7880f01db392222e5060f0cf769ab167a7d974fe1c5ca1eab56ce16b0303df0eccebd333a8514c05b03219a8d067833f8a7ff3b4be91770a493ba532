<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface MonthRangePickerHeadingProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectMonthRangePickerRootContext } from './MonthRangePickerRoot.vue'

const props = withDefaults(defineProps<MonthRangePickerHeadingProps>(), { as: 'div' })

defineSlots<{
  default?: (props: {
    /** Current year heading */
    headingValue: string
  }) => any
}>()

const rootContext = injectMonthRangePickerRootContext()
</script>

<template>
  <Primitive
    v-bind="props"
    :id="rootContext.headingId"
    role="heading"
    aria-level="2"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <slot :heading-value="rootContext.headingValue.value">
      {{ rootContext.headingValue.value }}
    </slot>
  </Primitive>
</template>
