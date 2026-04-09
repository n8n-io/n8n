<script lang="ts">
import type { ComputedRef } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { createContext } from '@/shared'
import { injectRatingRootContext } from './RatingRoot.vue'

interface RatingItemContext {
  steps: ComputedRef<number[]>
}

export interface RatingItemProps extends PrimitiveProps {
  item: number
}

export const [injectRatingItemContext, provideRatingItemContext]
  = createContext<RatingItemContext>('RatingItem')
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<RatingItemProps>(), { as: 'label' })
defineSlots<{
  default?: (props: {
    steps: number[]
  }) => any
}>()

const rootContext = injectRatingRootContext()

const steps = computed(() => {
  const groupStartValue = (props.item - 1)
  const groupEndValue = props.item
  const stepSize = rootContext.step.value

  const numberOfSteps = Math.ceil((groupEndValue - groupStartValue) / stepSize)

  return Array.from({ length: numberOfSteps }, (_, index) =>
    Number((groupStartValue + (index + 1) * stepSize).toFixed(2)))
})

provideRatingItemContext({ steps })
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
  >
    <slot :steps="steps" />
  </Primitive>
</template>
