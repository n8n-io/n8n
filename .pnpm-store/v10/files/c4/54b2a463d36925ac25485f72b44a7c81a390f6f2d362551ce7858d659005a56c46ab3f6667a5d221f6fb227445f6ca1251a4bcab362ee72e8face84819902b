<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { useNonce } from '@/shared/useNonce'

export interface ScrollAreaViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string
}
</script>

<script setup lang="ts">
import { onMounted, ref, toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { injectScrollAreaRootContext } from './ScrollAreaRoot.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ScrollAreaViewportProps>()

const { nonce: propNonce } = toRefs(props)
const nonce = useNonce(propNonce)

const rootContext = injectScrollAreaRootContext()

const viewportElement = ref<HTMLElement>()

onMounted(() => {
  rootContext.onViewportChange(viewportElement.value!)
  rootContext.onContentChange(contentElement.value!)
})

defineExpose({
  viewportElement,
})
const { forwardRef, currentElement: contentElement } = useForwardExpose()
</script>

<template>
  <div
    ref="viewportElement"
    data-reka-scroll-area-viewport=""
    :style="{
      /**
       * We don't support `visible` because the intention is to have at least one scrollbar
       * if this component is used and `visible` will behave like `auto` in that case
       * https://developer.mozilla.org/en-US/docs/Web/CSS/overflowed#description
       *
       * We don't handle `auto` because the intention is for the native implementation
       * to be hidden if using this component. We just want to ensure the node is scrollable
       * so could have used either `scroll` or `auto` here. We picked `scroll` to prevent
       * the browser from having to work out whether to render native scrollbars or not,
       * we tell it to with the intention of hiding them in CSS.
       */
      overflowX: rootContext.scrollbarXEnabled.value ? 'scroll' : 'hidden',
      overflowY: rootContext.scrollbarYEnabled.value ? 'scroll' : 'hidden',
    }"
    v-bind="$attrs"
    :tabindex="0"
  >
    <Primitive
      :ref="forwardRef"
      :style="{
        /**
         * When horizontal scrollbar is visible: this element should be at least
         * as wide as its children for size calculations to work correctly.
         *
         * When horizontal scrollbar is NOT visible: this element's width should
         * be constrained by the parent container to enable `text-overflow: ellipsis`
         */
        minWidth: rootContext.scrollbarXEnabled.value ? 'fit-content' : undefined,
      }"
      :as-child="props.asChild"
      :as="as"
    >
      <slot />
    </Primitive>
  </div>
  <Primitive
    as="style"
    :nonce="nonce"
  >
    /* Hide scrollbars cross-browser and enable momentum scroll for touch
    devices */
    [data-reka-scroll-area-viewport] {
    scrollbar-width:none;
    -ms-overflow-style:none;
    -webkit-overflow-scrolling:touch;
    }

    [data-reka-scroll-area-viewport]::-webkit-scrollbar {
    display:none;
    }
  </Primitive>
</template>
