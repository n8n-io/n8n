<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface MonthRangePickerNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the Root. */
  nextPage?: (placeholder: DateValue) => DateValue
}

export interface MonthRangePickerNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean
  }) => any
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectMonthRangePickerRootContext } from './MonthRangePickerRoot.vue'

const props = withDefaults(defineProps<MonthRangePickerNextProps>(), { as: 'button' })
defineSlots<MonthRangePickerNextSlot>()

const rootContext = injectMonthRangePickerRootContext()

const disabled = computed(() => rootContext.disabled.value || rootContext.isNextButtonDisabled(props.nextPage))

function handleClick() {
  if (disabled.value)
    return
  rootContext.nextPage(props.nextPage)
}
</script>

<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    aria-label="Next year"
    :type="props.as === 'button' ? 'button' : undefined"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled || undefined"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot :disabled>
      Next year
    </slot>
  </Primitive>
</template>
