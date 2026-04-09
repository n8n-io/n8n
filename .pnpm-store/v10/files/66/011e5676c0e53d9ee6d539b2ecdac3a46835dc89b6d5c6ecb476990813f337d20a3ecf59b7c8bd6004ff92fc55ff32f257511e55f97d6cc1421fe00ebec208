<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface YearPickerHeadingProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectYearPickerRootContext } from './YearPickerRoot.vue'

const props = withDefaults(defineProps<YearPickerHeadingProps>(), { as: 'div' })

defineSlots<{
  default?: (props: {
    /** Current year range heading */
    headingValue: string
  }) => any
}>()

const rootContext = injectYearPickerRootContext()
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
