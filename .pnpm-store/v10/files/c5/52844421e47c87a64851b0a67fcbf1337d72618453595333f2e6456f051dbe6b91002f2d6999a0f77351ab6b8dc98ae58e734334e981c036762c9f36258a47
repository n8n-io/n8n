<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useActiveElement } from '@vueuse/core'
import { computed } from 'vue'
import { RadioGroupIndicator, RadioGroupItem } from '@/RadioGroup'
import { useForwardExpose } from '@/shared'
import { injectRatingItemContext } from './RatingItem.vue'
import { injectRatingRootContext } from './RatingRoot.vue'

export interface RatingItemProps extends PrimitiveProps {
  step: number
}
</script>

<script setup lang="ts">
const props = defineProps<RatingItemProps>()

const rootContext = injectRatingRootContext()
const { currentElement, forwardRef } = useForwardExpose()
const activeElement = useActiveElement()
const itemContext = injectRatingItemContext()

const isActive = computed(() => {
  return (rootContext.hoveredRating.value > 0 && props.step <= rootContext.hoveredRating.value) || (rootContext.hoveredRating.value === 0 && props.step <= rootContext.modelValue.value)
})

const isVisible = computed(() => {
  return activeElement.value === currentElement.value || rootContext.step.value === 1 || props.step % 1 === 0 || props.step === rootContext.hoveredRating.value || props.step === rootContext.modelValue.value
})

function handleMouseEnter() {
  rootContext.changeHoveredRating(props.step)
}
</script>

<template>
  <RadioGroupItem
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    :style="{
      ['--reka-rating-item-step-width']: `${((step % 1 || 1) * 100)}%`,
      ['--reka-rating-item-step-opacity']: isVisible ? 1 : 0,
      ['--reka-rating-item-step-z-index']: itemContext.steps.value.length - itemContext.steps.value.indexOf(step),

    }"
    :value="step"
    :data-state="isActive ? 'active' : undefined"
    :disabled="rootContext.disabled.value"
    @select="rootContext.changeModelValue(step)"
    @mouseenter="handleMouseEnter"
  >
    <RadioGroupIndicator
      force-mount
      as-child
    >
      <slot />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
