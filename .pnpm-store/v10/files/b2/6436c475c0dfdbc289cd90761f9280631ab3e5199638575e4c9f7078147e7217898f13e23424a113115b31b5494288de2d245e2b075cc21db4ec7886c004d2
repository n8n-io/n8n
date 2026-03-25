<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { toRefs } from 'vue'
import { useForwardExpose } from '@/shared'
import { useNonce } from '@/shared/useNonce'
import { injectComboboxRootContext } from './ComboboxRoot.vue'

export interface ComboboxViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<ComboboxViewportProps>()
const { forwardRef } = useForwardExpose()

const { nonce: propNonce } = toRefs(props)
const nonce = useNonce(propNonce)

const rootContext = injectComboboxRootContext()
</script>

<template>
  <Primitive
    v-bind="{ ...$attrs, ...props }"
    :ref="forwardRef"
    data-reka-combobox-viewport
    role="presentation"
    :style="{
      // we use position: 'relative' here on the `viewport` so that when we call
      // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
      // (independent of the scrollUpButton).
      position: 'relative',
      flex: rootContext.isVirtual.value ? undefined : 1,
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
    devices */ [data-reka-combobox-viewport] { scrollbar-width:none; -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch; }
    [data-reka-combobox-viewport]::-webkit-scrollbar { display: none; }
  </Primitive>
</template>
