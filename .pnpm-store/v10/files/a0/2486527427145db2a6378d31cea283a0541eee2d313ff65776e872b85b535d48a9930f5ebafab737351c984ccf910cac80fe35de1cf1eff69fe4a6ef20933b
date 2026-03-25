<script lang="ts">
export interface TreeItemProps<T> extends PrimitiveProps {
  /** Value given to this item */
  value: T
  /** Level of depth */
  level: number
}

export type SelectEvent<T> = CustomEvent<{ originalEvent: PointerEvent | KeyboardEvent, value?: T, isExpanded: boolean, isSelected: boolean }>
export type ToggleEvent<T> = CustomEvent<{ originalEvent: PointerEvent | KeyboardEvent, value?: T, isExpanded: boolean, isSelected: boolean }>

export type TreeItemEmits<T> = {
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  select: [event: SelectEvent<T>]
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  toggle: [event: ToggleEvent<T>]
}

const TREE_SELECT = 'tree.select'
const TREE_TOGGLE = 'tree.toggle'
</script>

<script setup lang="ts" generic="T extends Record<string, any>">
import type { PrimitiveProps } from '@/Primitive'
import { computed } from 'vue'
import { useCollection } from '@/Collection'
import { Primitive } from '@/Primitive'
import { RovingFocusItem } from '@/RovingFocus'
import { getActiveElement, handleAndDispatchCustomEvent } from '@/shared'
import { injectTreeRootContext } from './TreeRoot.vue'
import { flatten } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<TreeItemProps<T>>(), {
  as: 'li',
})

const emits = defineEmits<TreeItemEmits<T>>()

defineSlots<{
  default?: (props: {
    isExpanded: boolean
    isSelected: boolean
    isIndeterminate: boolean | undefined
    handleToggle: () => void
    handleSelect: () => void
  }) => any
}>()
const rootContext = injectTreeRootContext()
const { getItems } = useCollection()

const hasChildren = computed(() => !!rootContext.getChildren(props.value))

const isExpanded = computed(() => {
  const key = rootContext.getKey(props.value)
  return rootContext.expanded.value.includes(key)
})

const isSelected = computed(() => {
  const key = rootContext.getKey(props.value)
  return rootContext.selectedKeys.value.includes(key)
})

const isIndeterminate = computed(() => {
  if (rootContext.bubbleSelect.value && hasChildren.value && Array.isArray(rootContext.modelValue.value)) {
    const children = flatten<T, any>(rootContext.getChildren(props.value) || [])

    return children.some(child => rootContext.modelValue.value.find((v: any) => rootContext.getKey(v) === rootContext.getKey(child)))
      && !children.every(child => rootContext.modelValue.value.find((v: any) => rootContext.getKey(v) === rootContext.getKey(child)))
  }
  else if (rootContext.propagateSelect.value && isSelected.value && hasChildren.value && Array.isArray(rootContext.modelValue.value)) {
    const children = flatten<T, any>(rootContext.getChildren(props.value) || [])

    return !children.every(child => rootContext.modelValue.value.find((v: any) => rootContext.getKey(v) === rootContext.getKey(child)))
  }
  else {
    return undefined
  }
})

function handleKeydownRight(ev: KeyboardEvent) {
  if (!hasChildren.value)
    return

  if (isExpanded.value) {
    // go to first child
    const collection = getItems().map(i => i.ref)
    const currentElement = getActiveElement() as HTMLElement
    const currentIndex = collection.indexOf(currentElement)
    const list = [...collection].slice(currentIndex)
    const nextElement = list.find(el => Number(el.getAttribute('data-indent')) === (props.level + 1))

    if (nextElement)
      nextElement.focus()
  }
  else {
    //  open expanded
    handleToggleCustomEvent(ev)
  }
}

function handleKeydownLeft(ev: KeyboardEvent) {
  if (isExpanded.value) {
    //  close expanded
    handleToggleCustomEvent(ev)
  }
  else {
    // go back to parent
    const collection = getItems().map(i => i.ref)
    const currentElement = getActiveElement() as HTMLElement
    const currentIndex = collection.indexOf(currentElement)
    const list = [...collection].slice(0, currentIndex).reverse()
    const parentElement = list.find(el => Number(el.getAttribute('data-indent')) === (props.level - 1))

    if (parentElement)
      parentElement.focus()
  }
}

async function handleSelect(ev: SelectEvent<T>) {
  emits('select', ev)
  if (ev?.defaultPrevented)
    return

  rootContext.onSelect(props.value)
}
async function handleToggle(ev: ToggleEvent<T>) {
  emits('toggle', ev)
  if (ev?.defaultPrevented)
    return

  rootContext.onToggle(props.value)
}

async function handleSelectCustomEvent(ev?: PointerEvent | KeyboardEvent) {
  if (!ev)
    return

  const eventDetail = { originalEvent: ev, value: props.value, isExpanded: isExpanded.value, isSelected: isSelected.value }
  handleAndDispatchCustomEvent(TREE_SELECT, handleSelect, eventDetail)
}

async function handleToggleCustomEvent(ev?: PointerEvent | KeyboardEvent) {
  if (!ev)
    return

  const eventDetail = { originalEvent: ev, value: props.value, isExpanded: isExpanded.value, isSelected: isSelected.value }
  handleAndDispatchCustomEvent(TREE_TOGGLE, handleToggle, eventDetail)
}

defineExpose({
  isExpanded,
  isSelected,
  isIndeterminate,
  handleToggle: () => rootContext.onToggle(props.value),
  handleSelect: () => rootContext.onSelect(props.value),
})
</script>

<template>
  <RovingFocusItem
    as-child
    :value="value"
    allow-shift-key
  >
    <Primitive
      v-bind="$attrs"
      role="treeitem"
      :as="as"
      :as-child="asChild"
      :aria-selected="isSelected"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-level="level"
      :data-indent="level"
      :data-selected="isSelected ? '' : undefined"
      :data-expanded="isExpanded ? '' : undefined"
      @keydown.enter.space.self.prevent="handleSelectCustomEvent"
      @keydown.right.prevent="(ev) => rootContext.dir.value === 'ltr' ? handleKeydownRight(ev) : handleKeydownLeft(ev)"
      @keydown.left.prevent="(ev) => rootContext.dir.value === 'ltr' ? handleKeydownLeft(ev) : handleKeydownRight(ev)"
      @click.stop="(ev) => {
        handleSelectCustomEvent(ev)
        handleToggleCustomEvent(ev)
      }"
    >
      <slot
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        :is-indeterminate="isIndeterminate"
        :handle-select="() => rootContext.onSelect(value)"
        :handle-toggle="() => rootContext.onToggle(value)"
      />
    </Primitive>
  </RovingFocusItem>
</template>
