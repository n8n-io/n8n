<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { ListboxRootProps } from '@/Listbox'
import type { AcceptableValue, GenericComponentInstance } from '@/shared/types'
import { usePrimitiveElement } from '@/Primitive'
import { createContext, useDirection, useFilter } from '@/shared'

type ComboboxRootContext<T> = {
  modelValue: Ref<T | Array<T>>
  multiple: Ref<boolean>
  disabled: Ref<boolean>
  open: Ref<boolean>
  onOpenChange: (value: boolean) => void
  isUserInputted: Ref<boolean>
  isVirtual: Ref<boolean>
  contentId: string
  inputElement: Ref<HTMLInputElement | undefined>
  onInputElementChange: (el: HTMLInputElement) => void
  triggerElement: Ref<HTMLElement | undefined>
  onTriggerElementChange: (el: HTMLElement) => void
  highlightedElement: Ref<HTMLElement | undefined>
  parentElement: Ref<HTMLElement | undefined>
  resetSearchTermOnSelect: Ref<boolean>
  onResetSearchTerm: EventHookOn
  allItems: Ref<Map<string, string>>
  allGroups: Ref<Map<string, Set<string>>>
  filterSearch: Ref<string>
  filterState: ComputedRef<{ count: number, items: Map<string, number>, groups: Set<string> }>
  ignoreFilter: Ref<boolean>
  openOnFocus: Ref<boolean>
  openOnClick: Ref<boolean>
}

export const [injectComboboxRootContext, provideComboboxRootContext]
  = createContext<ComboboxRootContext<AcceptableValue>>('ComboboxRoot')

export type ComboboxRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: T]
  /** Event handler when highlighted element changes. */
  'highlight': [payload: { ref: HTMLElement, value: T } | undefined]
  /** Event handler called when the open state of the combobox changes. */
  'update:open': [value: boolean]
}

export interface ComboboxRootProps<T = AcceptableValue> extends Omit<ListboxRootProps<T>, 'orientation' | 'selectionBehavior'> {
  /** The controlled open state of the Combobox. Can be binded with with `v-model:open`. */
  open?: boolean
  /** The open state of the combobox when it is initially rendered. <br> Use when you do not need to control its open state. */
  defaultOpen?: boolean
  /**
   * Whether to reset the searchTerm when the Combobox input blurred
   * @defaultValue `true`
   */
  resetSearchTermOnBlur?: boolean
  /**
   * Whether to reset the searchTerm when the Combobox value is selected
   * @defaultValue `true`
   */
  resetSearchTermOnSelect?: boolean
  /**
   * Whether to open the combobox when the input is focused
   * @defaultValue `false`
   */
  openOnFocus?: boolean
  /**
   * Whether to open the combobox when the input is clicked
   * @defaultValue `false`
   */
  openOnClick?: boolean
  /**
   * When `true`, disable the default filters
   */
  ignoreFilter?: boolean
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { EventHookOn } from '@vueuse/core'
import { createEventHook, useVModel } from '@vueuse/core'
import { computed, getCurrentInstance, nextTick, onMounted, ref, toRefs } from 'vue'
import { ListboxRoot } from '@/Listbox'
import { PopperRoot } from '@/Popper'

const props = withDefaults(defineProps<ComboboxRootProps<T>>(), {
  open: undefined,
  resetSearchTermOnBlur: true,
  resetSearchTermOnSelect: true,
  openOnFocus: false,
  openOnClick: false,
})
const emits = defineEmits<ComboboxRootEmits<T>>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
    /** Current active value */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { primitiveElement, currentElement: parentElement } = usePrimitiveElement<GenericComponentInstance<typeof ListboxRoot>>()
const { multiple, disabled, ignoreFilter, resetSearchTermOnSelect, openOnFocus, openOnClick, dir: propDir } = toRefs(props)

const dir = useDirection(propDir)

const modelValue = useVModel(props as ComboboxRootProps<T>, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? (multiple.value ? [] : undefined),
  passive: (props.modelValue === undefined) as false,
  deep: true,
}) as Ref<T | T[]>

const open = useVModel(props, 'open', emits, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

async function onOpenChange(val: boolean) {
  open.value = val
  filterSearch.value = ''

  if (val) {
    // make sure dom is ready then only highlight the selected
    await nextTick()
    primitiveElement.value?.highlightSelected()
    isUserInputted.value = true
  }
  else {
    isUserInputted.value = false
  }

  inputElement.value?.focus()
  setTimeout(() => {
    if (!val && props.resetSearchTermOnBlur)
      resetSearchTerm.trigger()
  }, 1)
}

const resetSearchTerm = createEventHook()
const isUserInputted = ref(false)
const isVirtual = ref(false)
const inputElement = ref<HTMLInputElement>()
const triggerElement = ref<HTMLElement>()

const highlightedElement = computed(() => primitiveElement.value?.highlightedElement ?? undefined)

const allItems = ref<Map<string, string>>(new Map())
const allGroups = ref<Map<string, Set<string>>>(new Map())

const { contains } = useFilter({ sensitivity: 'base' })

const filterSearch = ref('')

const filterState = computed<{
  count: number
  items: Map<string, number>
  groups: Set<string>
}>((oldValue) => {
  if (!filterSearch.value || props.ignoreFilter || isVirtual.value) {
    // Do nothing, each item will know to show itself because search is empty
    return {
      count: allItems.value.size,
      items: oldValue?.items ?? new Map(),
      groups: oldValue?.groups ?? new Set(allGroups.value.keys()),
    }
  }

  let itemCount = 0
  const filteredItems = new Map<string, number>()
  const filteredGroups = new Set<string>()

  // Check which items should be included
  for (const [id, value] of allItems.value) {
    const score = contains(value, filterSearch.value)
    filteredItems.set(id, score ? 1 : 0)
    if (score)
      itemCount++
  }

  // Check which groups have at least 1 item shown
  for (const [groupId, group] of allGroups.value) {
    for (const itemId of group) {
      if (filteredItems.get(itemId)! > 0) {
        filteredGroups.add(groupId)
        break
      }
    }
  }

  return {
    count: itemCount,
    items: filteredItems,
    groups: filteredGroups,
  }
})

const inst = getCurrentInstance()
onMounted(() => {
  if (inst?.exposed) {
    inst.exposed.highlightItem = primitiveElement.value?.highlightItem
    inst.exposed.highlightFirstItem = primitiveElement.value?.highlightFirstItem
    inst.exposed.highlightSelected = primitiveElement.value?.highlightSelected
  }
})

defineExpose({
  filtered: filterState,
  highlightedElement,
  highlightItem: primitiveElement.value?.highlightItem,
  highlightFirstItem: primitiveElement.value?.highlightFirstItem,
  highlightSelected: primitiveElement.value?.highlightSelected,
})

provideComboboxRootContext({
  modelValue,
  multiple,
  disabled,
  open,
  onOpenChange,
  contentId: '',
  isUserInputted,
  isVirtual,
  inputElement,
  highlightedElement,
  onInputElementChange: val => inputElement.value = val,
  triggerElement,
  onTriggerElementChange: val => triggerElement.value = val,
  parentElement,
  resetSearchTermOnSelect,
  onResetSearchTerm: resetSearchTerm.on,
  allItems,
  allGroups,
  filterSearch,
  filterState,
  ignoreFilter,
  openOnFocus,
  openOnClick,
})
</script>

<template>
  <PopperRoot>
    <ListboxRoot
      ref="primitiveElement"
      v-bind="$attrs"
      v-model="modelValue"
      :style="{
        pointerEvents: open ? 'auto' : undefined,
      }"
      :as="as"
      :as-child="asChild"
      :dir="dir"
      :multiple="multiple"
      :name="name"
      :required="required"
      :disabled="disabled"
      :highlight-on-hover="true"
      :by="props.by as any"
      @highlight="emits('highlight', $event as any)"
    >
      <slot
        :open="open"
        :model-value="modelValue"
      />
    </ListboxRoot>
  </PopperRoot>
</template>
