<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface CalendarPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `CalendarRoot`. */
  prevPage?: (placeholder: DateValue) => DateValue
}

export interface CalendarPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean
  }) => any
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectCalendarRootContext } from './CalendarRoot.vue'

const props = withDefaults(defineProps<CalendarPrevProps>(), { as: 'button', step: 'month' })
defineSlots<CalendarPrevSlot>()

const disabled = computed(() => rootContext.disabled.value || rootContext.isPrevButtonDisabled(props.prevPage))

const rootContext = injectCalendarRootContext()
</script>

<template>
  <Primitive
    aria-label="Previous page"
    :as="props.as"
    :as-child="props.asChild"
    :type="as === 'button' ? 'button' : undefined"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled || undefined"
    :disabled="disabled"
    @click="rootContext.prevPage(props.prevPage)"
  >
    <slot :disabled>
      Prev page
    </slot>
  </Primitive>
</template>
