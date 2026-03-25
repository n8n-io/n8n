<script lang="ts">
import type { PopoverTriggerProps } from '..'
import { PopoverTrigger } from '..'
import { injectDatePickerRootContext } from './DatePickerRoot.vue'

export interface DatePickerTriggerProps extends PopoverTriggerProps {}
</script>

<script setup lang="ts">
const props = defineProps<DatePickerTriggerProps>()
const rootContext = injectDatePickerRootContext()
</script>

<template>
  <PopoverTrigger
    data-reka-date-field-segment="trigger"
    v-bind="props"
    :disabled="rootContext.disabled.value"
    @focusin="(e: FocusEvent) => {
      rootContext.dateFieldRef.value?.setFocusedElement(e.target as HTMLElement)
    }"
  >
    <slot />
  </PopoverTrigger>
</template>
