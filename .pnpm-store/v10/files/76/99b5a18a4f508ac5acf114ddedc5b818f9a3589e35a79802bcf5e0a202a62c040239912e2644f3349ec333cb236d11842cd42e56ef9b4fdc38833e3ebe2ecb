<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import { useResizeObserver } from '@vueuse/core'
import { useCollection } from '@/Collection'
import { clamp, createContext, useForwardExpose } from '@/shared'

interface SelectItemAlignedPositionContext {
  contentWrapper?: Ref<HTMLElement | undefined>
  shouldExpandOnScrollRef?: Ref<boolean>
  onScrollButtonChange: (node: HTMLElement | undefined) => void
}

export interface SelectItemAlignedPositionProps extends PrimitiveProps {}

export const [injectSelectItemAlignedPositionContext, provideSelectItemAlignedPositionContext]
  = createContext<SelectItemAlignedPositionContext>('SelectItemAlignedPosition')
</script>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { injectSelectContentContext } from './SelectContentImpl.vue'
import { injectSelectRootContext } from './SelectRoot.vue'
import { CONTENT_MARGIN } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<SelectItemAlignedPositionProps>()
const emits = defineEmits<{
  placed: []
}>()

const { getItems } = useCollection()
const rootContext = injectSelectRootContext()
const contentContext = injectSelectContentContext()

const shouldExpandOnScrollRef = ref(false)
const shouldRepositionRef = ref(true)

const contentWrapperElement = ref<HTMLElement>()
const { forwardRef, currentElement: contentElement } = useForwardExpose()

const { viewport, selectedItem, selectedItemText, focusSelectedItem }
  = contentContext!

function position() {
  if (
    rootContext.triggerElement.value
    && rootContext.valueElement.value
    && contentWrapperElement.value
    && contentElement.value
    && viewport?.value
    && selectedItem?.value
    && selectedItemText?.value
  ) {
    const triggerRect = rootContext.triggerElement.value.getBoundingClientRect()

    // -----------------------------------------------------------------------------------------
    //  Horizontal positioning
    // -----------------------------------------------------------------------------------------
    const contentRect = contentElement.value.getBoundingClientRect()
    const valueNodeRect = rootContext.valueElement.value.getBoundingClientRect()
    const itemTextRect = selectedItemText.value.getBoundingClientRect()

    if (rootContext.dir.value !== 'rtl') {
      const itemTextOffset = itemTextRect.left - contentRect.left
      const left = valueNodeRect.left - itemTextOffset
      const leftDelta = triggerRect.left - left
      const minContentWidth = triggerRect.width + leftDelta
      const contentWidth = Math.max(minContentWidth, contentRect.width)
      const rightEdge = window.innerWidth - CONTENT_MARGIN
      const clampedLeft = clamp(left, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, rightEdge - contentWidth))

      contentWrapperElement.value.style.minWidth = `${minContentWidth}px`
      contentWrapperElement.value.style.left = `${clampedLeft}px`
    }
    else {
      const itemTextOffset = contentRect.right - itemTextRect.right
      const right = window.innerWidth - valueNodeRect.right - itemTextOffset
      const rightDelta = window.innerWidth - triggerRect.right - right
      const minContentWidth = triggerRect.width + rightDelta
      const contentWidth = Math.max(minContentWidth, contentRect.width)
      const leftEdge = window.innerWidth - CONTENT_MARGIN
      const clampedRight = clamp(
        right,
        CONTENT_MARGIN,
        Math.max(CONTENT_MARGIN, leftEdge - contentWidth),
      )

      contentWrapperElement.value.style.minWidth = `${minContentWidth}px`
      contentWrapperElement.value.style.right = `${clampedRight}px`
    }

    // -----------------------------------------------------------------------------------------
    // Vertical positioning
    // -----------------------------------------------------------------------------------------
    const items = getItems().map(i => i.ref)
    const availableHeight = window.innerHeight - CONTENT_MARGIN * 2
    const itemsHeight = viewport.value.scrollHeight

    const contentStyles = window.getComputedStyle(contentElement.value)
    const contentBorderTopWidth = Number.parseInt(
      contentStyles.borderTopWidth,
      10,
    )
    const contentPaddingTop = Number.parseInt(contentStyles.paddingTop, 10)
    const contentBorderBottomWidth = Number.parseInt(
      contentStyles.borderBottomWidth,
      10,
    )
    const contentPaddingBottom = Number.parseInt(
      contentStyles.paddingBottom,
      10,
    )

    const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth
    const minContentHeight = Math.min(
      selectedItem.value.offsetHeight * 5,
      fullContentHeight,
    )

    const viewportStyles = window.getComputedStyle(viewport.value)
    const viewportPaddingTop = Number.parseInt(viewportStyles.paddingTop, 10)
    const viewportPaddingBottom = Number.parseInt(
      viewportStyles.paddingBottom,
      10,
    )

    const topEdgeToTriggerMiddle
      = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN
    const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle

    const selectedItemHalfHeight = selectedItem.value.offsetHeight / 2
    const itemOffsetMiddle
      = selectedItem.value.offsetTop + selectedItemHalfHeight
    const contentTopToItemMiddle
      = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle
    const itemMiddleToContentBottom
      = fullContentHeight - contentTopToItemMiddle

    const willAlignWithoutTopOverflow
      = contentTopToItemMiddle <= topEdgeToTriggerMiddle

    if (willAlignWithoutTopOverflow) {
      const isLastItem = selectedItem.value === items[items.length - 1]
      contentWrapperElement.value.style.bottom = `${0}px`
      const viewportOffsetBottom
        = contentElement.value.clientHeight
          - viewport.value.offsetTop
          - viewport.value.offsetHeight
      const clampedTriggerMiddleToBottomEdge = Math.max(
        triggerMiddleToBottomEdge,
        selectedItemHalfHeight
        // viewport might have padding bottom, include it to avoid a scrollable viewport
        + (isLastItem ? viewportPaddingBottom : 0)
        + viewportOffsetBottom
        + contentBorderBottomWidth,
      )
      const height = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge
      contentWrapperElement.value.style.height = `${height}px`
    }
    else {
      const isFirstItem = selectedItem.value === items[0]
      contentWrapperElement.value.style.top = `${0}px`
      const clampedTopEdgeToTriggerMiddle = Math.max(
        topEdgeToTriggerMiddle,
        contentBorderTopWidth
        + viewport.value.offsetTop
        // viewport might have padding top, include it to avoid a scrollable viewport
        + (isFirstItem ? viewportPaddingTop : 0)
        + selectedItemHalfHeight,
      )
      const height = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom
      contentWrapperElement.value.style.height = `${height}px`
      viewport.value.scrollTop
        = contentTopToItemMiddle
          - topEdgeToTriggerMiddle
          + viewport.value.offsetTop
    }

    contentWrapperElement.value.style.margin = `${CONTENT_MARGIN}px 0`
    contentWrapperElement.value.style.minHeight = `${minContentHeight}px`
    contentWrapperElement.value.style.maxHeight = `${availableHeight}px`
    // -----------------------------------------------------------------------------------------

    emits('placed')

    // we don't want the initial scroll position adjustment to trigger "expand on scroll"
    // so we explicitly turn it on only after they've registered.
    requestAnimationFrame(() => (shouldExpandOnScrollRef.value = true))
  }
}

// copy z-index from content to wrapper
const contentZIndex = ref('')

onMounted(async () => {
  await nextTick()
  position()
  if (contentElement.value)
    contentZIndex.value = window.getComputedStyle(contentElement.value).zIndex
})

// When the viewport becomes scrollable at the top, the scroll up button will mount.
// Because it is part of the normal flow, it will push down the viewport, thus throwing our
// trigger => selectedItem alignment off by the amount the viewport was pushed down.
// We wait for this to happen and then re-run the positining logic one more time to account for it.
function handleScrollButtonChange(node: HTMLElement | undefined) {
  if (node && shouldRepositionRef.value === true) {
    position()
    focusSelectedItem?.()
    shouldRepositionRef.value = false
  }
}

// Resize and position when trigger element changes
useResizeObserver(rootContext.triggerElement, () => {
  position()
})

provideSelectItemAlignedPositionContext({
  contentWrapper: contentWrapperElement,
  shouldExpandOnScrollRef,
  onScrollButtonChange: handleScrollButtonChange,
})
</script>

<template>
  <div
    ref="contentWrapperElement"
    :style="{
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      zIndex: contentZIndex,
    }"
  >
    <Primitive
      :ref="forwardRef"
      :style="{
        // When we get the height of the content, it includes borders. If we were to set
        // the height without having `boxSizing: 'border-box'` it would be too big.
        boxSizing: 'border-box',
        // We need to ensure the content doesn't get taller than the wrapper
        maxHeight: '100%',
      }"
      v-bind="{ ...$attrs, ...props }"
    >
      <slot />
    </Primitive>
  </div>
</template>
