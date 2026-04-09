<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface YearRangePickerHeadingProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectYearRangePickerRootContext } from './YearRangePickerRoot.vue'

const props = withDefaults(defineProps<YearRangePickerHeadingProps>(), { as: 'div' })

defineSlots<{
  default?: (props: {
    /** Current year range heading */
    headingValue: string
  }) => any
}>()

const rootContext = injectYearRangePickerRootContext()
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
