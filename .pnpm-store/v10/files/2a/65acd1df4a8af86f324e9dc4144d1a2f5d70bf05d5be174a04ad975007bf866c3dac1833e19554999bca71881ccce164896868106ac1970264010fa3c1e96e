<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { toRefs } from 'vue'
import { useForwardExpose } from '@/shared'
import { useNonce } from '@/shared/useNonce'

export interface ViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<ViewportProps>()
const { forwardRef } = useForwardExpose()

const { nonce: propNonce } = toRefs(props)
const nonce = useNonce(propNonce)
</script>

<template>
  <Primitive
    v-bind="{ ...$attrs, ...props }"
    :ref="forwardRef"
    data-reka-viewport
    role="presentation"
    :style="{
      // we use position: 'relative' here on the `viewport` so that when we call
      // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
      // (independent of the scrollUpButton).
      position: 'relative',
      flex: 1,
      overflow: 'auto',
    }"
  >
    <slot />
  </Primitive>
  <Primitive
    as="style"
    :nonce="nonce"
  >
    /* Hide scrollbars cross-browser and enable momentum scroll for touch
    devices */ [data-reka-viewport] { scrollbar-width:none; -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch; }
    [data-reka-viewport]::-webkit-scrollbar { display: none; }
  </Primitive>
</template>
