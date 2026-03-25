<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface CollapsibleTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectCollapsibleRootContext } from './CollapsibleRoot.vue'

const props = withDefaults(defineProps<CollapsibleTriggerProps>(), {
  as: 'button',
})

useForwardExpose()
const rootContext = injectCollapsibleRootContext()
</script>

<template>
  <Primitive
    :type="as === 'button' ? 'button' : undefined"
    :as="as"
    :as-child="props.asChild"
    :aria-controls="rootContext.contentId"
    :aria-expanded="rootContext.open.value"
    :data-state="rootContext.open.value ? 'open' : 'closed'"
    :data-disabled="rootContext.disabled?.value ? '' : undefined"
    :disabled="rootContext.disabled?.value"
    @click="rootContext.onOpenToggle"
  >
    <slot />
  </Primitive>
</template>
