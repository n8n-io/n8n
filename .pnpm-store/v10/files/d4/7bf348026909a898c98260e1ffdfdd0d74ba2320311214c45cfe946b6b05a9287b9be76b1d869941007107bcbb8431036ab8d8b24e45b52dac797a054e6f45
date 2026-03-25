<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface RangeCalendarHeadingProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectRangeCalendarRootContext } from './RangeCalendarRoot.vue'

const props = withDefaults(defineProps<RangeCalendarHeadingProps>(), { as: 'div' })
defineSlots<{
  default?: (props: {
    /** Current month and year */
    headingValue: string
  }) => any
}>()
const rootContext = injectRangeCalendarRootContext()
</script>

<template>
  <Primitive
    v-bind="props"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <slot :heading-value="rootContext.headingValue.value">
      {{ rootContext.headingValue.value }}
    </slot>
  </Primitive>
</template>
