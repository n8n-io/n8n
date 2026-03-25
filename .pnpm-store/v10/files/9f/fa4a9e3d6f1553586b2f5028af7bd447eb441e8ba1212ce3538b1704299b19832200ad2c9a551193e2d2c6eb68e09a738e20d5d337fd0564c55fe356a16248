<script lang="ts">
import type {
  FocusOutsideEvent,
  PointerDownOutsideEvent,
} from './utils'

import type { PrimitiveProps } from '@/Primitive'
import {
  computed,
  nextTick,
  reactive,
  watchEffect,
} from 'vue'
import { useForwardExpose } from '@/shared'

export interface DismissableLayerProps extends PrimitiveProps {
  /**
   * When `true`, hover/focus/click interactions will be disabled on elements outside
   * the `DismissableLayer`. Users will need to click twice on outside elements to
   * interact with them: once to close the `DismissableLayer`, and again to trigger the element.
   */
  disableOutsidePointerEvents?: boolean
}

export type DismissableLayerEmits = {
  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  escapeKeyDown: [event: KeyboardEvent]
  /**
   * Event handler called when a `pointerdown` event happens outside of the `DismissableLayer`.
   * Can be prevented.
   */
  pointerDownOutside: [event: PointerDownOutsideEvent]
  /**
   * Event handler called when the focus moves outside of the `DismissableLayer`.
   * Can be prevented.
   */
  focusOutside: [ event: FocusOutsideEvent]
  /**
   * Event handler called when an interaction happens outside the `DismissableLayer`.
   * Specifically, when a `pointerdown` event happens outside or focus moves outside of it.
   * Can be prevented.
   */
  interactOutside: [ event: PointerDownOutsideEvent | FocusOutsideEvent]
}

export type DismissableLayerPrivateEmits = DismissableLayerEmits & {
  /**
   * Handler called when the `DismissableLayer` should be dismissed
   */
  dismiss: []
}

export const context = reactive({
  layersRoot: new Set<HTMLElement>(),
  layersWithOutsidePointerEventsDisabled: new Set<HTMLElement>(),
  branches: new Set<HTMLElement>(),
})
</script>

<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import {
  Primitive,
} from '@/Primitive'
import {
  useFocusOutside,
  usePointerDownOutside,
} from './utils'

const props = withDefaults(defineProps<DismissableLayerProps>(), {
  disableOutsidePointerEvents: false,
})

const emits = defineEmits<DismissableLayerPrivateEmits>()

const { forwardRef, currentElement: layerElement } = useForwardExpose()
const ownerDocument = computed(
  () => layerElement.value?.ownerDocument ?? globalThis.document,
)

const layers = computed(() => context.layersRoot)

const index = computed(() => {
  return layerElement.value
    ? Array.from(layers.value).indexOf(layerElement.value)
    : -1
})

const isBodyPointerEventsDisabled = computed(() => {
  return context.layersWithOutsidePointerEventsDisabled.size > 0
})

const isPointerEventsEnabled = computed(() => {
  const localLayers = Array.from(layers.value)
  const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1)
  const highestLayerWithOutsidePointerEventsDisabledIndex = localLayers.indexOf(highestLayerWithOutsidePointerEventsDisabled)

  return index.value >= highestLayerWithOutsidePointerEventsDisabledIndex
})

const pointerDownOutside = usePointerDownOutside(async (event) => {
  const isPointerDownOnBranch = [...context.branches].some(branch =>
    branch?.contains(event.target as HTMLElement),
  )

  if (!isPointerEventsEnabled.value || isPointerDownOnBranch)
    return
  emits('pointerDownOutside', event)
  emits('interactOutside', event)
  await nextTick()
  if (!event.defaultPrevented)
    emits('dismiss')
}, layerElement)

const focusOutside = useFocusOutside((event) => {
  const isFocusInBranch = [...context.branches].some(branch =>
    branch?.contains(event.target as HTMLElement),
  )

  if (isFocusInBranch)
    return
  emits('focusOutside', event)
  emits('interactOutside', event)
  if (!event.defaultPrevented)
    emits('dismiss')
}, layerElement)

onKeyStroke('Escape', (event) => {
  const isHighestLayer = index.value === layers.value.size - 1
  if (!isHighestLayer)
    return
  emits('escapeKeyDown', event)
  if (!event.defaultPrevented)
    emits('dismiss')
})

let originalBodyPointerEvents: string
watchEffect((cleanupFn) => {
  if (!layerElement.value)
    return
  if (props.disableOutsidePointerEvents) {
    if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
      originalBodyPointerEvents = ownerDocument.value.body.style.pointerEvents
      ownerDocument.value.body.style.pointerEvents = 'none'
    }
    context.layersWithOutsidePointerEventsDisabled.add(layerElement.value)
  }
  layers.value.add(layerElement.value)

  cleanupFn(() => {
    if (
      props.disableOutsidePointerEvents
      && context.layersWithOutsidePointerEventsDisabled.size === 1
    ) {
      ownerDocument.value.body.style.pointerEvents = originalBodyPointerEvents
    }
  })
})

watchEffect((cleanupFn) => {
  cleanupFn(() => {
    if (!layerElement.value)
      return
    layers.value.delete(layerElement.value)
    context.layersWithOutsidePointerEventsDisabled.delete(layerElement.value)
  })
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as-child="asChild"
    :as="as"
    data-dismissable-layer
    :style="{
      pointerEvents: isBodyPointerEventsDisabled
        ? isPointerEventsEnabled
          ? 'auto'
          : 'none'
        : undefined,
    }"
    @focus.capture="focusOutside.onFocusCapture"
    @blur.capture="focusOutside.onBlurCapture"
    @pointerdown.capture="pointerDownOutside.onPointerDownCapture"
  >
    <slot />
  </Primitive>
</template>
