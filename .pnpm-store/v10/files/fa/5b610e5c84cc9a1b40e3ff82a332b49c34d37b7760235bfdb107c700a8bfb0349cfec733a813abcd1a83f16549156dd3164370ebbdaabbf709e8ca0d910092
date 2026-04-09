<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Direction, GenericComponentInstance } from '@/shared/types'
import { provideComboboxRootContext } from '@/Combobox/ComboboxRoot.vue'
import { usePrimitiveElement } from '@/Primitive'
import { createContext, useDirection, useFilter } from '@/shared'

export interface AutocompleteRootProps extends PrimitiveProps {
  /** The controlled value of the Autocomplete (the input text). Can be bound with `v-model`. */
  modelValue?: string
  /** The value of the autocomplete when initially rendered. Use when you do not need to control the state. */
  defaultValue?: string
  /** The controlled open state of the Autocomplete. Can be bound with `v-model:open`. */
  open?: boolean
  /** The open state of the autocomplete when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
  /** When `true`, prevents the user from interacting with autocomplete */
  disabled?: boolean
  /** The reading direction of the autocomplete when applicable. */
  dir?: Direction
  /** The name of the field. Submitted with its owning form as part of a name/value pair. */
  name?: string
  /** When `true`, indicates that the user must set the value before the owning form can be submitted. */
  required?: boolean
  /**
   * Whether to reset the searchTerm when the Autocomplete input blurred
   * @defaultValue `false`
   */
  resetSearchTermOnBlur?: boolean
  /**
   * Whether to open the autocomplete when the input is focused
   * @defaultValue `false`
   */
  openOnFocus?: boolean
  /**
   * Whether to open the autocomplete when the input is clicked
   * @defaultValue `false`
   */
  openOnClick?: boolean
  /**
   * When `true`, disable the default filters
   */
  ignoreFilter?: boolean
  /** When `true`, hover over item will trigger highlight */
  highlightOnHover?: boolean
}

export type AutocompleteRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: string]
  /** Event handler when highlighted element changes. */
  'highlight': [payload: { ref: HTMLElement, value: string } | undefined]
  /** Event handler called when the open state of the autocomplete changes. */
  'update:open': [value: boolean]
}

export type AutocompleteRootContext = {
  modelValue: Ref<string>
}

export const [injectAutocompleteRootContext, provideAutocompleteRootContext]
  = createContext<AutocompleteRootContext>('AutocompleteRoot')
</script>

<script setup lang="ts">
import { createEventHook, useVModel } from '@vueuse/core'
import { computed, getCurrentInstance, nextTick, onMounted, ref, toRefs } from 'vue'
import { ListboxRoot } from '@/Listbox'
import { PopperRoot } from '@/Popper'

const props = withDefaults(defineProps<AutocompleteRootProps>(), {
  open: undefined,
  resetSearchTermOnBlur: false,
  openOnFocus: false,
  openOnClick: false,
  highlightOnHover: true,
})
const emits = defineEmits<AutocompleteRootEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
    /** Current active value */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { primitiveElement, currentElement: parentElement } = usePrimitiveElement<GenericComponentInstance<typeof ListboxRoot>>()
const { disabled, ignoreFilter, openOnFocus, openOnClick, dir: propDir, highlightOnHover } = toRefs(props)

const dir = useDirection(propDir)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue ?? '',
  passive: (props.modelValue === undefined) as false,
}) as Ref<string>

const open = useVModel(props, 'open', emits, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

// Writable computed that converts any value to string for the ComboboxRootContext.
// This handles the case when ComboboxItem sets modelValue to a non-string value,
// or when ComboboxCancel resets modelValue to null.
const contextModelValue = computed({
  get: () => modelValue.value,
  set: (val: any) => {
    if (val === null || val === undefined) {
      modelValue.value = ''
    }
    else {
      modelValue.value = String(val)
    }
  },
})

async function onOpenChange(val: boolean) {
  open.value = val

  if (val) {
    // When opening, set filter to current text so items are filtered by what's in the input
    filterSearch.value = modelValue.value || ''

    await nextTick()
    primitiveElement.value?.highlightSelected()
    isUserInputted.value = true
    inputElement.value?.focus()
  }
  else {
    isUserInputted.value = false
    filterSearch.value = ''
    setTimeout(() => {
      if (!val && props.resetSearchTermOnBlur)
        resetSearchTerm.trigger()
    }, 1)
  }
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
    return {
      count: allItems.value.size,
      items: oldValue?.items ?? new Map(),
      groups: oldValue?.groups ?? new Set(allGroups.value.keys()),
    }
  }

  let itemCount = 0
  const filteredItems = new Map<string, number>()
  const filteredGroups = new Set<string>()

  for (const [id, value] of allItems.value) {
    const score = contains(value, filterSearch.value)
    filteredItems.set(id, score ? 1 : 0)
    if (score)
      itemCount++
  }

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

// Provide the Combobox context so all Combobox sub-components work inside Autocomplete
provideComboboxRootContext({
  modelValue: contextModelValue as any,
  multiple: ref(false),
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
  resetSearchTermOnSelect: ref(false),
  onResetSearchTerm: resetSearchTerm.on,
  allItems,
  allGroups,
  filterSearch,
  filterState,
  ignoreFilter,
  openOnFocus,
  openOnClick,
  resetModelValueOnClear: ref(true),
})

// Provide autocomplete-specific context
provideAutocompleteRootContext({
  modelValue,
})
</script>

<template>
  <PopperRoot>
    <ListboxRoot
      ref="primitiveElement"
      v-bind="$attrs"
      v-model="(contextModelValue as any)"
      :style="{
        pointerEvents: open ? 'auto' : undefined,
      }"
      :as="as"
      :as-child="asChild"
      :dir="dir"
      :name="name"
      :required="required"
      :disabled="disabled"
      :highlight-on-hover="highlightOnHover"
      @highlight="emits('highlight', $event as any)"
    >
      <slot
        :open="open"
        :model-value="modelValue"
      />
    </ListboxRoot>
  </PopperRoot>
</template>
