<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose, useId } from '@/shared'

export interface PopoverTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import { PopperAnchor } from '@/Popper'
import { Primitive } from '@/Primitive'
import { injectPopoverRootContext } from './PopoverRoot.vue'

const props = withDefaults(defineProps<PopoverTriggerProps>(), {
  as: 'button',
})

const rootContext = injectPopoverRootContext()

const { forwardRef, currentElement: triggerElement } = useForwardExpose()

rootContext.triggerId ||= useId(undefined, 'reka-popover-trigger')
onMounted(() => {
  rootContext.triggerElement.value = triggerElement.value
})
</script>

<template>
  <component
    :is="rootContext.hasCustomAnchor.value ? Primitive : PopperAnchor"
    as-child
  >
    <Primitive
      :id="rootContext.triggerId"
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      aria-haspopup="dialog"
      :aria-expanded="rootContext.open.value"
      :aria-controls="rootContext.contentId"
      :data-state="rootContext.open.value ? 'open' : 'closed'"
      :as="as"
      :as-child="props.asChild"
      @click="rootContext.onOpenToggle"
    >
      <slot />
    </Primitive>
  </component>
</template>
