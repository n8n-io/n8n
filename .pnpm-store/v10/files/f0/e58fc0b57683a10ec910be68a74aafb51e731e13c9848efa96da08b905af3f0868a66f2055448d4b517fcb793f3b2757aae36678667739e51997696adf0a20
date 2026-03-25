<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import type { AcceptableValue, DataOrientation, Direction, FormFieldProps } from '@/shared/types'
import { usePrimitiveElement } from '@/Primitive'
import { getFocusIntent } from '@/RovingFocus/utils'
import { createContext, findValuesBetween, useDirection, useFormControl, useKbd, useTypeahead } from '@/shared'
import { Primitive } from '..'

type ListboxRootContext<T> = {
  modelValue: Ref<T | Array<T> | undefined>
  onValueChange: (val: T) => void
  multiple: Ref<boolean>
  orientation: Ref<DataOrientation>
  dir: Ref<Direction>
  disabled: Ref<boolean>
  highlightOnHover: Ref<boolean>
  highlightedElement: Ref<HTMLElement | null>
  isVirtual: Ref<boolean>
  virtualFocusHook: EventHook<Event | null | undefined>
  virtualKeydownHook: EventHook<KeyboardEvent>
  virtualHighlightHook: EventHook<any>
  by?: string | ((a: T, b: T) => boolean)
  firstValue?: Ref<T | undefined>
  selectionBehavior?: Ref<'toggle' | 'replace'>

  focusable: Ref<boolean>

  onLeave: (event: Event) => void
  onEnter: (event: Event) => void
  changeHighlight: (el: HTMLElement, scrollIntoView?: boolean) => void
  onKeydownNavigation: (event: KeyboardEvent) => void
  onKeydownEnter: (event: KeyboardEvent) => void
  onKeydownTypeAhead: (event: KeyboardEvent) => void
  onCompositionStart: () => void
  onCompositionEnd: () => void
  highlightFirstItem: () => void
}

export const [injectListboxRootContext, provideListboxRootContext]
  = createContext<ListboxRootContext<AcceptableValue>>('ListboxRoot')

export interface ListboxRootProps<T = AcceptableValue> extends PrimitiveProps, FormFieldProps {
  /** The controlled value of the listbox. Can be binded with with `v-model`. */
  modelValue?: T | Array<T>
  /** The value of the listbox when initially rendered. Use when you do not need to control the state of the Listbox */
  defaultValue?: T | Array<T>
  /** Whether multiple options can be selected or not. */
  multiple?: boolean
  /** The orientation of the listbox. <br>Mainly so arrow navigation is done accordingly (left & right vs. up & down) */
  orientation?: DataOrientation
  /** The reading direction of the listbox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** When `true`, prevents the user from interacting with listbox */
  disabled?: boolean
  /**
   * How multiple selection should behave in the collection.
   * @defaultValue 'toggle'
   */
  selectionBehavior?: 'toggle' | 'replace'
  /** When `true`, hover over item will trigger highlight */
  highlightOnHover?: boolean
  /** Use this to compare objects by a particular field, or pass your own comparison function for complete control over how objects are compared. */
  by?: string | ((a: T, b: T) => boolean)
}

export type ListboxRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: T]
  /** Event handler when highlighted element changes. */
  'highlight': [payload: { ref: HTMLElement, value: T } | undefined]
  /** Event handler called when container is being focused. Can be prevented. */
  'entryFocus': [event: CustomEvent]
  /** Event handler called when the mouse leave the container */
  'leave': [event: Event]
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { EventHook } from '@vueuse/core'
import type { Ref } from 'vue'
import { createEventHook, useVModel } from '@vueuse/core'
import { nextTick, ref, toRefs, watch } from 'vue'
import { useCollection } from '@/Collection'
import { VisuallyHiddenInput } from '@/VisuallyHidden'
import { compare } from './utils'

const props = withDefaults(defineProps<ListboxRootProps>(), {
  selectionBehavior: 'toggle',
  orientation: 'vertical',
})
const emits = defineEmits<ListboxRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current active value */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { multiple, highlightOnHover, orientation, disabled, selectionBehavior, dir: propDir } = toRefs(props)
const { getItems } = useCollection<{ value: T }>({ isProvider: true })
const { handleTypeaheadSearch } = useTypeahead()
const { primitiveElement, currentElement } = usePrimitiveElement()
const kbd = useKbd()
const dir = useDirection(propDir)

const isFormControl = useFormControl(currentElement)

const firstValue = ref<T>()
const isUserAction = ref(false)
const focusable = ref(true)
const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? (multiple.value ? [] : undefined),
  passive: (props.modelValue === undefined) as false,
  deep: true,
}) as Ref<T | T[] | undefined>

function onValueChange(val: T) {
  isUserAction.value = true
  if (props.multiple) {
    const modelArray = Array.isArray(modelValue.value) ? [...modelValue.value] : []
    const index = modelArray.findIndex(i => compare(i, val, props.by))
    if (props.selectionBehavior === 'toggle') {
      index === -1 ? modelArray.push(val) : modelArray.splice(index, 1)
      modelValue.value = modelArray
    }
    else {
      modelValue.value = [val]
      firstValue.value = val
    }
  }
  else {
    if (props.selectionBehavior === 'toggle') {
      if (compare(modelValue.value, val, props.by))
        modelValue.value = undefined
      else
        modelValue.value = val
    }
    else {
      modelValue.value = val
    }
  }
  setTimeout(() => {
    isUserAction.value = false
  }, 1)
}

const highlightedElement = ref<HTMLElement | null>(null)
const previousElement = ref<HTMLElement | null>(null)
const isVirtual = ref(false)
const isComposing = ref(false)
const virtualFocusHook = createEventHook<Event | null | undefined>()
const virtualKeydownHook = createEventHook<KeyboardEvent>()
const virtualHighlightHook = createEventHook<T>()

function getCollectionItem() {
  return getItems().map(i => i.ref).filter(i => i.dataset.disabled !== '')
}

function changeHighlight(el: HTMLElement, scrollIntoView = true) {
  if (!el)
    return

  highlightedElement.value = el
  if (focusable.value)
    highlightedElement.value.focus()
  if (scrollIntoView)
    highlightedElement.value.scrollIntoView({ block: 'nearest' })

  const highlightedItem = getItems().find(i => i.ref === el)
  emits('highlight', highlightedItem)
}

function highlightItem(value: T) {
  if (isVirtual.value) {
    virtualHighlightHook.trigger(value)
  }
  else {
    const item = getItems().find(i => compare(i.value, value, props.by))
    if (item) {
      highlightedElement.value = item.ref
      changeHighlight(item.ref)
    }
  }
}

function onKeydownEnter(event: KeyboardEvent) {
  if (highlightedElement.value && highlightedElement.value.isConnected) {
    event.preventDefault()
    event.stopPropagation()

    if (!isComposing.value) {
      highlightedElement.value.click()
    }
  }
}

function onKeydownTypeAhead(event: KeyboardEvent) {
  if (!focusable.value)
    return
  isUserAction.value = true
  if (isVirtual.value) {
    virtualKeydownHook.trigger(event)
  }
  else {
    const isMetaKey = event.altKey || event.ctrlKey || event.metaKey

    if (isMetaKey && event.key === 'a' && multiple.value) {
      const collection = getItems()
      const values = collection.map(i => i.value)
      modelValue.value = [...values]
      event.preventDefault()
      changeHighlight(collection[collection.length - 1].ref)
    }
    else if (!isMetaKey) {
      const el = handleTypeaheadSearch(event.key, getItems())
      if (el)
        changeHighlight(el)
    }
  }
  setTimeout(() => {
    isUserAction.value = false
  }, 1)
}

function onCompositionStart() {
  isComposing.value = true
}
function onCompositionEnd() {
  nextTick(() => {
    isComposing.value = false
  })
}

function highlightFirstItem() {
  nextTick(() => {
    const event = new KeyboardEvent('keydown', { key: 'PageUp' })
    onKeydownNavigation(event)
  })
}

function onLeave(event: Event) {
  const el = highlightedElement.value

  if ((el as Node)?.isConnected) {
    previousElement.value = el
  }

  highlightedElement.value = null
  emits('leave', event)
}

function onEnter(event: Event) {
  const entryFocusEvent = new CustomEvent('listbox.entryFocus', { bubbles: false, cancelable: true })
  event.currentTarget?.dispatchEvent(entryFocusEvent)
  emits('entryFocus', entryFocusEvent)

  if (entryFocusEvent.defaultPrevented)
    return

  if (previousElement.value) {
    changeHighlight(previousElement.value)
  }
  else {
    const el = getCollectionItem()?.[0]
    changeHighlight(el)
  }
}

function onKeydownNavigation(event: KeyboardEvent) {
  const intent = getFocusIntent(event, orientation.value, dir.value)
  if (!intent)
    return

  let collection = getCollectionItem()
  if (highlightedElement.value) {
    if (intent === 'last') {
      collection.reverse()
    }
    else if (intent === 'prev' || intent === 'next') {
      if (intent === 'prev')
        collection.reverse()

      const currentIndex = collection.indexOf(highlightedElement.value)
      collection = collection.slice(currentIndex + 1)
    }
    handleMultipleReplace(event, collection[0])
  }

  if (collection.length) {
    const index = !highlightedElement.value && intent === 'prev' ? collection.length - 1 : 0
    changeHighlight(collection[index])
  }

  if (isVirtual.value)
    return virtualKeydownHook.trigger(event)
}

function handleMultipleReplace(event: KeyboardEvent, targetEl: HTMLElement) {
  if (isVirtual.value || props.selectionBehavior !== 'replace' || !multiple.value || !Array.isArray(modelValue.value))
    return
  const isMetaKey = event.altKey || event.ctrlKey || event.metaKey
  if (isMetaKey && !event.shiftKey)
    return

  if (event.shiftKey) {
    const collection = getItems().filter(i => i.ref.dataset.disabled !== '')
    let lastValue = collection.find(i => i.ref === targetEl)?.value

    if (event.key === kbd.END)
      lastValue = collection[collection.length - 1].value
    else if (event.key === kbd.HOME)
      lastValue = collection[0].value

    if (!lastValue || !firstValue.value)
      return

    const values = findValuesBetween(collection.map(i => i.value), firstValue.value, lastValue)
    modelValue.value = values
  }
}

async function highlightSelected(event?: Event) {
  await nextTick()
  if (isVirtual.value) {
    // Trigger on nextTick for Virtualizer to be mounted
    virtualFocusHook.trigger(event)
  }
  else {
    const collection = getCollectionItem()
    const item = collection.find(i => i.dataset.state === 'checked')
    if (item)
      changeHighlight(item)
    else if (collection.length)
      changeHighlight(collection[0])
  }
}

// watch for only programmatic changes
watch(modelValue, () => {
  if (!isUserAction.value) {
    nextTick(() => {
      highlightSelected()
    })
  }
}, { immediate: true, deep: true })

defineExpose({
  highlightedElement,
  highlightItem,
  highlightFirstItem,
  highlightSelected,
  getItems,
})

provideListboxRootContext({
  modelValue,
  // @ts-expect-error ignoring
  onValueChange,
  multiple,
  orientation,
  dir,
  disabled,
  highlightOnHover,
  highlightedElement,
  isVirtual,
  virtualFocusHook,
  virtualKeydownHook,
  virtualHighlightHook,
  by: props.by,
  firstValue,
  selectionBehavior,

  focusable,
  onLeave,
  onEnter,
  changeHighlight,
  onKeydownEnter,
  onKeydownNavigation,
  onKeydownTypeAhead,
  onCompositionStart,
  onCompositionEnd,
  highlightFirstItem,
})
</script>

<template>
  <Primitive
    ref="primitiveElement"
    :as="as"
    :as-child="asChild"
    :dir="dir"
    :data-disabled="disabled ? '' : undefined"
    @pointerleave="onLeave"
    @focusout="async (event: FocusEvent) => {
      const target = (event.relatedTarget || event.target) as HTMLElement | null
      await nextTick()
      if (highlightedElement && currentElement && !currentElement.contains(target)) {
        onLeave(event)
      }
    }"
  >
    <slot :model-value="modelValue" />

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      :name="name"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
    />
  </Primitive>
</template>
