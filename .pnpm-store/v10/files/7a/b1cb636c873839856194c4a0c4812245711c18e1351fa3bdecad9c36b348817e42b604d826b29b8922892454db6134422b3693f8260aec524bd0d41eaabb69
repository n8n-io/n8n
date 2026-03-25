<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface AccordionHeaderProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectAccordionItemContext } from './AccordionItem.vue'
import { injectAccordionRootContext } from './AccordionRoot.vue'

const props = withDefaults(defineProps<AccordionHeaderProps>(), {
  as: 'h3',
})

const rootContext = injectAccordionRootContext()
const itemContext = injectAccordionItemContext()

useForwardExpose()
</script>

<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    :data-orientation="rootContext.orientation"
    :data-state="itemContext.dataState.value"
    :data-disabled="itemContext.dataDisabled.value"
  >
    <slot />
  </Primitive>
</template>
