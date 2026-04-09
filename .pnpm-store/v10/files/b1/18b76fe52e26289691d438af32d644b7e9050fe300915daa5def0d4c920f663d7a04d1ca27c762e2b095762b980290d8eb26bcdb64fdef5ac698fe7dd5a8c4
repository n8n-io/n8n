<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { PrimitiveProps } from '@/Primitive'

export interface YearRangePickerPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the Root. */
  prevPage?: (placeholder: DateValue) => DateValue
}

export interface YearRangePickerPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean
  }) => any
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectYearRangePickerRootContext } from './YearRangePickerRoot.vue'

const props = withDefaults(defineProps<YearRangePickerPrevProps>(), { as: 'button' })
defineSlots<YearRangePickerPrevSlot>()

const rootContext = injectYearRangePickerRootContext()

const disabled = computed(() => rootContext.disabled.value || rootContext.isPrevButtonDisabled(props.prevPage))

function handleClick() {
  if (disabled.value)
    return
  rootContext.prevPage(props.prevPage)
}
</script>

<template>
  <Primitive
    aria-label="Previous page"
    :as="props.as"
    :as-child="props.asChild"
    :type="props.as === 'button' ? 'button' : undefined"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled || undefined"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot :disabled>
      Prev page
    </slot>
  </Primitive>
</template>
