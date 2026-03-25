<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import type { SegmentPart } from '@/shared/date'
import { computed, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { useDateField } from '@/shared/date/useDateField'
import { injectTimeFieldRootContext } from './TimeFieldRoot.vue'

export interface TimeFieldInputProps extends PrimitiveProps {
  /** The part of the date to render */
  part: SegmentPart
}
</script>

<script setup lang="ts">
const props = defineProps<TimeFieldInputProps>()

const rootContext = injectTimeFieldRootContext()

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
  segmentValues: rootContext.segmentValues,
  formatter: rootContext.formatter,
  part: props.part,
  disabled: rootContext.disabled,
  readonly: rootContext.readonly,
  focusNext: rootContext.focusNext,
  modelValue: rootContext.modelValue,
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
