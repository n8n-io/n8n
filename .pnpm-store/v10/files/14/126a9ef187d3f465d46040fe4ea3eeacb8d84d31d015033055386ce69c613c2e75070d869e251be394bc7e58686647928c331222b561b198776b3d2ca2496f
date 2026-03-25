<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface SelectScrollUpButtonProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import { injectSelectContentContext } from './SelectContentImpl.vue'
import { injectSelectItemAlignedPositionContext } from './SelectItemAlignedPosition.vue'
import SelectScrollButtonImpl from './SelectScrollButtonImpl.vue'

defineProps<SelectScrollUpButtonProps>()

const contentContext = injectSelectContentContext()
const alignedPositionContext
  = contentContext.position === 'item-aligned'
    ? injectSelectItemAlignedPositionContext()
    : undefined

const { forwardRef, currentElement } = useForwardExpose()

const canScrollUp = ref(false)

watchEffect((cleanupFn) => {
  if (contentContext.viewport?.value && contentContext.isPositioned?.value) {
    const viewport = contentContext.viewport.value

    function handleScroll() {
      canScrollUp.value = viewport.scrollTop > 0
    }
    handleScroll()
    viewport.addEventListener('scroll', handleScroll)

    cleanupFn(() => viewport.removeEventListener('scroll', handleScroll))
  }
})

watch(currentElement, () => {
  if (currentElement.value)
    alignedPositionContext?.onScrollButtonChange(currentElement.value)
})
</script>

<template>
  <SelectScrollButtonImpl
    v-if="canScrollUp"
    :ref="forwardRef"
    @auto-scroll="() => {
      const { viewport, selectedItem } = contentContext;
      if (viewport?.value && selectedItem?.value) {
        viewport.value.scrollTop = viewport.value.scrollTop - selectedItem.value.offsetHeight;
      }
    }"
  >
    <slot />
  </SelectScrollButtonImpl>
</template>
