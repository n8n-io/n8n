<script lang="ts">
import type { PopoverContentEmits, PopoverContentProps, PopoverPortalProps } from '..'
import { computed } from 'vue'
import { handleCalendarInitialFocus } from '@/shared/date'
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from '..'

export interface DateRangePickerContentProps extends PopoverContentProps {
  /**
   * Props to control the portal wrapped around the content.
   */
  portal?: PopoverPortalProps
}
export interface DateRangePickerContentEmits extends PopoverContentEmits {}
</script>

<script setup lang="ts">
const props = defineProps<DateRangePickerContentProps>()
const emits = defineEmits<DateRangePickerContentEmits>()

const propsToForward = computed(() => ({
  ...props,
  portal: undefined,
}))
const forwarded = useForwardPropsEmits(propsToForward, emits)
</script>

<template>
  <PopoverPortal v-bind="portal">
    <PopoverContent
      v-bind="{ ...forwarded, ...$attrs }"
      @open-auto-focus="event => {
        emits('openAutoFocus', event)

        if (!event.defaultPrevented && event.target) {
          handleCalendarInitialFocus(event.target as HTMLElement)
          event.preventDefault()
        }
      }"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
