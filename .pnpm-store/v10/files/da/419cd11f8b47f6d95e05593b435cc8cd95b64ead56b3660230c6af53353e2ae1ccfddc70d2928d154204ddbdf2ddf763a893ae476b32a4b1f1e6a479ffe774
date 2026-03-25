<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface AccordionTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { CollapsibleTrigger } from '@/Collapsible'
import { useId } from '@/shared'
import { injectAccordionItemContext } from './AccordionItem.vue'

import { injectAccordionRootContext } from './AccordionRoot.vue'

const props = defineProps<AccordionTriggerProps>()

const rootContext = injectAccordionRootContext()
const itemContext = injectAccordionItemContext()

itemContext.triggerId ||= useId(undefined, 'reka-accordion-trigger')
function changeItem() {
  const triggerDisabled = rootContext.isSingle.value && itemContext.open.value && !rootContext.collapsible
  if (itemContext.disabled.value || triggerDisabled)
    return

  rootContext.changeModelValue(itemContext.value.value)
}
</script>

<template>
  <CollapsibleTrigger
    :id="itemContext.triggerId"
    :ref="itemContext.currentRef"
    data-reka-collection-item
    :as="props.as"
    :as-child="props.asChild"
    :aria-disabled="itemContext.disabled.value || undefined"
    :aria-expanded="itemContext.open.value || false"
    :data-disabled="itemContext.dataDisabled.value"
    :data-orientation="rootContext.orientation"
    :data-state="itemContext.dataState.value"
    :disabled="itemContext.disabled.value"
    @click="changeItem"
  >
    <slot />
  </CollapsibleTrigger>
</template>
