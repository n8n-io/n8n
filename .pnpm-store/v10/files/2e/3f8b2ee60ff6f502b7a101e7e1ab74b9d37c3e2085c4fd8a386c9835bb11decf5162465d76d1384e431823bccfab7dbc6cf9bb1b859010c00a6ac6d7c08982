<script lang="ts">
import type { CollapsibleContentProps } from '../Collapsible'

export interface AccordionContentProps extends CollapsibleContentProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@/shared'
import { CollapsibleContent } from '../Collapsible'
import { injectAccordionItemContext } from './AccordionItem.vue'
import { injectAccordionRootContext } from './AccordionRoot.vue'

const props = defineProps<AccordionContentProps>()

const rootContext = injectAccordionRootContext()
const itemContext = injectAccordionItemContext()

useForwardExpose()
</script>

<template>
  <CollapsibleContent
    role="region"
    :as-child="props.asChild"
    :as="as"
    :force-mount="props.forceMount"
    :aria-labelledby="itemContext.triggerId"
    :data-state="itemContext.dataState.value"
    :data-disabled="itemContext.dataDisabled.value"
    :data-orientation="rootContext.orientation"
    style="
      --reka-accordion-content-width: var(--reka-collapsible-content-width);
      --reka-accordion-content-height: var(--reka-collapsible-content-height);
    "
    @content-found="rootContext.changeModelValue(itemContext.value.value)"
  >
    <slot />
  </CollapsibleContent>
</template>
