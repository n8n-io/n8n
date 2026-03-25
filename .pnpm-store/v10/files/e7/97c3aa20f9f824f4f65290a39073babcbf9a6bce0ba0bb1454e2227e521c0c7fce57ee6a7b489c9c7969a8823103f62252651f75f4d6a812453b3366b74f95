<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface RangeCalendarNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `RangeCalendarRoot`. */
  nextPage?: (placeholder: DateValue) => DateValue
}

export interface RangeCalendarNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean
  }) => any
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectRangeCalendarRootContext } from './RangeCalendarRoot.vue'

const props = withDefaults(defineProps<RangeCalendarNextProps>(), { as: 'button' })
defineSlots<RangeCalendarNextSlot>()

const disabled = computed(() => rootContext.disabled.value || rootContext.isNextButtonDisabled(props.nextPage))

const rootContext = injectRangeCalendarRootContext()
</script>

<template>
  <Primitive
    v-bind="props"
    aria-label="Next page"
    :type="as === 'button' ? 'button' : undefined"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled || undefined"
    :disabled="disabled"
    @click="rootContext.nextPage(props.nextPage)"
  >
    <slot :disabled>
      Next page
    </slot>
  </Primitive>
</template>
