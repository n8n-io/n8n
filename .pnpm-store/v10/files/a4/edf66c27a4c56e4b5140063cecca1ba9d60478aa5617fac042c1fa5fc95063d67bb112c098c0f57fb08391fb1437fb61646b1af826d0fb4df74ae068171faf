<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { ref, toRefs, watch, watchEffect } from 'vue'
import { useNonce } from '@/shared/useNonce'
import { useWindowSplitterResizeHandlerBehavior } from './utils/composables/useWindowSplitterBehavior'

export interface SplitterResizeHandleProps extends PrimitiveProps {
  /** Resize handle id (unique within group); falls back to `useId` when not provided */
  id?: string
  /** Allow this much margin when determining resizable handle hit detection */
  hitAreaMargins?: PointerHitAreaMargins
  /** Tabindex for the handle */
  tabindex?: number
  /** Disable drag handle */
  disabled?: boolean
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string
}

export type PanelResizeHandleOnDragging = (isDragging: boolean) => void
export type ResizeHandlerState = 'drag' | 'hover' | 'inactive'

export type SplitterResizeHandleEmits = {
  /** Event handler called when dragging the handler. */
  dragging: [isDragging: boolean]
}
</script>

<script setup lang="ts">
import type { PointerHitAreaMargins, ResizeHandlerAction } from './utils/registry'
import type { ResizeEvent, ResizeHandler } from './utils/types'
import { Primitive } from '@/Primitive'
import { isBrowser, useForwardExpose, useId } from '@/shared'
import { injectPanelGroupContext } from './SplitterGroup.vue'
import { assert } from './utils/assert'
import { registerResizeHandle } from './utils/registry'

const props = withDefaults(defineProps<SplitterResizeHandleProps>(), {
  tabindex: 0,
})
const emits = defineEmits<SplitterResizeHandleEmits>()

const { forwardRef, currentElement } = useForwardExpose()
const { disabled } = toRefs(props)

const panelGroupContext = injectPanelGroupContext()
if (panelGroupContext === null) {
  throw new Error(
    'PanelResizeHandle components must be rendered within a PanelGroup container',
  )
}

const {
  direction,
  groupId,
  registerResizeHandle: registerResizeHandleWithParentGroup,
  startDragging,
  stopDragging,
  panelGroupElement,
} = panelGroupContext

const resizeHandleId = useId(props.id, 'reka-splitter-resize-handle')
const state = ref<ResizeHandlerState>('inactive')
const isFocused = ref(false)
const resizeHandler = ref<ResizeHandler | null>(null)
const { nonce: propNonce } = toRefs(props)
const nonce = useNonce(propNonce)

watch(disabled, () => {
  if (!isBrowser)
    return
  if (disabled.value)
    resizeHandler.value = null
  else
    resizeHandler.value = registerResizeHandleWithParentGroup(resizeHandleId)
}, { immediate: true })

watchEffect((onCleanup) => {
  if (disabled.value || resizeHandler.value === null)
    return

  const element = currentElement.value
  if (!element)
    return

  assert(element)

  const setResizeHandlerState = (
    action: ResizeHandlerAction,
    isActive: boolean,
    event: ResizeEvent,
  ) => {
    if (isActive) {
      switch (action) {
        case 'down': {
          state.value = 'drag'

          startDragging(resizeHandleId, event)
          emits('dragging', true)
          break
        }
        case 'move': {
          if (state.value !== 'drag')
            state.value = 'hover'

          resizeHandler.value?.(event)
          break
        }
        case 'up': {
          state.value = 'hover'

          stopDragging()
          emits('dragging', false)
          break
        }
      }
    }
    else {
      state.value = 'inactive'
    }
  }

  onCleanup(registerResizeHandle(
    resizeHandleId,
    element,
    direction,
    {
      // Coarse inputs (e.g. finger/touch)
      coarse: props.hitAreaMargins?.coarse ?? 15,
      // Fine inputs (e.g. mouse)
      fine: props.hitAreaMargins?.fine ?? 5,
    },
    nonce,
    setResizeHandlerState,
  ))
})

useWindowSplitterResizeHandlerBehavior({
  disabled,
  resizeHandler,
  handleId: resizeHandleId,
  panelGroupElement,
})
</script>

<template>
  <Primitive
    :id="resizeHandleId"
    :ref="forwardRef"
    :style="{
      touchAction: 'none',
      userSelect: 'none',
    }"
    :as="as"
    :as-child="asChild"
    role="separator"
    data-resize-handle=""
    :tabindex="tabindex"
    :data-state="state"
    :data-disabled="disabled ? '' : undefined"
    :data-orientation="direction"
    :data-panel-group-id="groupId"
    :data-resize-handle-active="state === 'drag' ? 'pointer' : isFocused ? 'keyboard' : undefined"
    :data-resize-handle-state="state"
    :data-panel-resize-handle-enabled="!disabled"
    :data-panel-resize-handle-id=" resizeHandleId"
    @blur="isFocused = false"
    @focus="isFocused = false"
  >
    <slot />
  </Primitive>
</template>
