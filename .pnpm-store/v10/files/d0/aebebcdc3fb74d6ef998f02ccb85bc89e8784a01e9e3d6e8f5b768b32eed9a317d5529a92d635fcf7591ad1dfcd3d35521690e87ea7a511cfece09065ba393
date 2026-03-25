<script lang="ts">
import type { Ref } from 'vue'

import type { Direction, Orientation } from './utils'
import type { PrimitiveProps } from '@/Primitive'
import { useCollection } from '@/Collection'
import { createContext, useDirection, useForwardExpose, useId } from '@/shared'

export interface NavigationMenuRootProps extends PrimitiveProps {
  /** The controlled value of the menu item to activate. Can be used as `v-model`. */
  modelValue?: string
  /**
   * The value of the menu item that should be active when initially rendered.
   *
   * Use when you do not need to control the value state.
   */
  defaultValue?: string
  /**
   * The reading direction of the combobox when applicable.
   *
   *  If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction
  /** The orientation of the menu. */
  orientation?: Orientation
  /**
   * The duration from when the pointer enters the trigger until the tooltip gets opened.
   * @defaultValue 200
   */
  delayDuration?: number
  /**
   * How much time a user has to enter another trigger without incurring a delay again.
   * @defaultValue 300
   */
  skipDelayDuration?: number

  /**
   * If `true`, menu cannot be open by click on trigger
   * @defaultValue false
   */
  disableClickTrigger?: boolean
  /**
   * If `true`, menu cannot be open by hover on trigger
   * @defaultValue false
   */
  disableHoverTrigger?: boolean
  /**
   * If `true`, menu will not close during pointer leave event
   * @defaultValue false
   */
  disablePointerLeaveClose?: boolean

  /**
   * When `true`, the element will be unmounted on closed state.
   *
   * @defaultValue `true`
   */
  unmountOnHide?: boolean
}
export type NavigationMenuRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: string]
}

export interface NavigationMenuContext {
  isRootMenu: boolean
  modelValue: Ref<string>
  previousValue: Ref<string>
  baseId: string
  dir: Ref<Direction>
  orientation: Orientation
  disableClickTrigger: Ref<boolean>
  disableHoverTrigger: Ref<boolean>
  unmountOnHide: Ref<boolean>
  rootNavigationMenu: Ref<HTMLElement | undefined>
  activeTrigger: Ref<HTMLElement | undefined>
  indicatorTrack: Ref<HTMLElement | undefined>
  onIndicatorTrackChange: (indicatorTrack: HTMLElement | undefined) => void
  viewport: Ref<HTMLElement | undefined>
  onViewportChange: (viewport: HTMLElement | undefined) => void
  onTriggerEnter: (itemValue: string) => void
  onTriggerLeave: () => void
  onContentEnter: (itemValue: string) => void
  onContentLeave: () => void
  onItemSelect: (itemValue: string) => void
  onItemDismiss: () => void
}

export const [injectNavigationMenuContext, provideNavigationMenuContext]
  = createContext<NavigationMenuContext>(['NavigationMenuRoot', 'NavigationMenuSub'], 'NavigationMenuContext')
</script>

<script setup lang="ts">
import { refAutoReset, useDebounceFn, useVModel } from '@vueuse/core'
import {
  computed,
  ref,
  toRefs,
  watchEffect,
} from 'vue'
import {
  Primitive,
} from '@/Primitive'

const props = withDefaults(defineProps<NavigationMenuRootProps>(), {
  modelValue: undefined,
  delayDuration: 200,
  skipDelayDuration: 300,
  orientation: 'horizontal',
  disableClickTrigger: false,
  disableHoverTrigger: false,
  unmountOnHide: true,
  as: 'nav',
})
const emits = defineEmits<NavigationMenuRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? '',
  passive: (props.modelValue === undefined) as false,
}) as Ref<string>
const previousValue = ref('')

const { forwardRef, currentElement: rootNavigationMenu } = useForwardExpose()

const indicatorTrack = ref<HTMLElement>()
const viewport = ref<HTMLElement>()
const activeTrigger = ref<HTMLElement>()

const { getItems, CollectionSlot } = useCollection({ key: 'NavigationMenu', isProvider: true })

const { delayDuration, skipDelayDuration, dir: propDir, disableClickTrigger, disableHoverTrigger, unmountOnHide } = toRefs(props)
const dir = useDirection(propDir)

const isDelaySkipped = refAutoReset(false, skipDelayDuration)
const computedDelay = computed(() => {
  const isOpen = modelValue.value !== ''
  if (isOpen || isDelaySkipped.value)
    return 150 // 150ms for user to switch trigger or move into content view
  else return delayDuration.value
})

const debouncedFn = useDebounceFn((val?: string) => {
  // passing `undefined` meant to reset the debounce timer
  if (typeof val === 'string') {
    previousValue.value = modelValue.value
    modelValue.value = val
  }
}, computedDelay)

watchEffect(() => {
  if (!modelValue.value)
    return

  const items = getItems().map(i => i.ref)
  activeTrigger.value = items.find(item =>
    item.id.includes(modelValue.value),
  )
})

provideNavigationMenuContext({
  isRootMenu: true,
  modelValue,
  previousValue,
  baseId: useId(undefined, 'reka-navigation-menu'),
  disableClickTrigger,
  disableHoverTrigger,
  dir,
  unmountOnHide,
  orientation: props.orientation,
  rootNavigationMenu,
  indicatorTrack,
  activeTrigger,
  onIndicatorTrackChange: (val) => {
    indicatorTrack.value = val
  },
  viewport,
  onViewportChange: (val) => {
    viewport.value = val
  },
  onTriggerEnter: (val) => {
    debouncedFn(val)
  },
  onTriggerLeave: () => {
    isDelaySkipped.value = true
    debouncedFn('')
  },
  onContentEnter: () => {
    debouncedFn()
  },
  onContentLeave: () => {
    if (!props.disablePointerLeaveClose)
      debouncedFn('')
  },
  onItemSelect: (val) => {
    // When selecting item we trigger update immediately
    previousValue.value = modelValue.value
    modelValue.value = val
  },
  onItemDismiss: () => {
    previousValue.value = modelValue.value
    modelValue.value = ''
  },
})
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      aria-label="Main"
      :as="as"
      :as-child="asChild"
      :data-orientation="orientation"
      :dir="dir"
      data-reka-navigation-menu
    >
      <slot :model-value="modelValue" />
    </Primitive>
  </CollectionSlot>
</template>
