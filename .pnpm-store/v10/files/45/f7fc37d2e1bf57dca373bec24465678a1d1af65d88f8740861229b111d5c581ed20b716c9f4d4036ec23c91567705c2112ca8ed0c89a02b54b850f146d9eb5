<script lang="ts">
import type { DateRangeType } from '@/DateRangeField/DateRangeFieldRoot.vue'
import type { PrimitiveProps } from '@/Primitive'
import type { SegmentPart } from '@/shared/date'
import { computed, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { useDateField } from '@/shared/date/useDateField'
import { injectTimeRangeFieldRootContext } from './TimeRangeFieldRoot.vue'

export interface TimeRangeFieldInputProps extends PrimitiveProps {
  /** The part of the date to render */
  part: SegmentPart
  /** The type of field to render (start or end) */
  type: DateRangeType
}
</script>

<script setup lang="ts">
const props = defineProps<TimeRangeFieldInputProps>()

const rootContext = injectTimeRangeFieldRootContext()

const hasLeftFocus = ref(true)
const lastKeyZero = ref(false)

const {
  handleSegmentClick,
  handleSegmentKeydown,
  attributes,
} = useDateField({
  hasLeftFocus,
  lastKeyZero,
  placeholder: rootContext.placeholder,
  hourCycle: rootContext.hourCycle,
  step: rootContext.step,
  segmentValues: rootContext.segmentValues[props.type],
  formatter: rootContext.formatter,
  part: props.part,
  disabled: rootContext.disabled,
  readonly: rootContext.readonly,
  focusNext: rootContext.focusNext,
  modelValue: props.type === 'start' ? rootContext.startValue : rootContext.endValue,
})

const disabled = computed(() => rootContext.disabled.value)
const readonly = computed(() => rootContext.readonly.value)
const isInvalid = computed(() => rootContext.isInvalid.value)
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    v-bind="attributes"
    :contenteditable="disabled || readonly ? false : part !== 'literal'"
    :data-reka-time-field-segment="part"
    :data-reka-time-range-field-segment-type="type"
    :aria-disabled="disabled ? true : undefined"
    :aria-readonly="readonly ? true : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    :aria-invalid="isInvalid ? true : undefined"
    v-on="part !== 'literal' ? {
      mousedown: handleSegmentClick,
      keydown: handleSegmentKeydown,
      focusout: () => { hasLeftFocus = true },
      focusin: (e: FocusEvent) => {
        rootContext.setFocusedElement(e.target as HTMLElement)
      },
    } : {}"
  >
    <slot />
  </Primitive>
</template>
