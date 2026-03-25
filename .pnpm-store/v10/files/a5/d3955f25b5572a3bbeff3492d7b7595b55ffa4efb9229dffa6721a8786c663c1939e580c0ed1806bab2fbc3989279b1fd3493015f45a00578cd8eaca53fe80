<script lang="ts">
import type { Side } from './utils'
import type { PrimitiveProps } from '@/Primitive'
import type { ArrowProps } from '@/shared/component/Arrow.vue'

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
}

export interface PopperArrowProps extends ArrowProps, PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useForwardExpose } from '@/shared'
import Arrow from '@/shared/component/Arrow.vue'
import { injectPopperContentContext } from './PopperContent.vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<PopperArrowProps>(),
  { as: 'svg' },
)

const { forwardRef } = useForwardExpose()
const contentContext = injectPopperContentContext()

const baseSide = computed(() => OPPOSITE_SIDE[contentContext.placedSide.value])
</script>

<template>
  <span
    :ref="(el: HTMLElement) => {
      contentContext.onArrowChange(el)
      return undefined
    }"
    :style="{
      position: 'absolute',
      left: contentContext.arrowX?.value ? `${contentContext.arrowX?.value}px` : undefined,
      top: contentContext.arrowY?.value ? `${contentContext.arrowY?.value}px` : undefined,
      [baseSide]: 0,
      transformOrigin: {
        top: '',
        right: '0 0',
        bottom: 'center 0',
        left: '100% 0',
      }[contentContext.placedSide.value],
      transform: {
        top: 'translateY(100%)',
        right: 'translateY(50%) rotate(90deg) translateX(-50%)',
        bottom: `rotate(180deg)`,
        left: 'translateY(50%) rotate(-90deg) translateX(50%)',
      }[contentContext.placedSide.value],
      visibility: contentContext.shouldHideArrow.value ? 'hidden' : undefined,
    }"
  >
    <Arrow
      v-bind="$attrs"
      :ref="forwardRef"
      :style="{
        display: 'block',
      }"
      :as="as"
      :as-child="asChild"
      :rounded="rounded"
      :width="width"
      :height="height"
    >
      <slot />
    </Arrow>
  </span>
</template>
