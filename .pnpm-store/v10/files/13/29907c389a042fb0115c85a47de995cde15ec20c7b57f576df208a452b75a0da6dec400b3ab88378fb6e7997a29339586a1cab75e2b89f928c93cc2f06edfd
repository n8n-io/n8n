<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectStepperItemContext } from './StepperItem.vue'
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

export interface StepperDescriptionProps extends PrimitiveProps { }

const props = withDefaults(defineProps<StepperDescriptionProps>(), { as: 'p' })

useForwardExpose()
const itemContext = injectStepperItemContext()
</script>

<template>
  <Primitive
    v-bind="props"
    :id="itemContext.descriptionId"
  >
    <slot />
  </Primitive>
</template>
