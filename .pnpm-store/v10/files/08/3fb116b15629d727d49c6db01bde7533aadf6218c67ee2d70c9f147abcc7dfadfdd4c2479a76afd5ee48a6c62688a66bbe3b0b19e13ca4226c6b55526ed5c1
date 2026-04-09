<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useVModel } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref, watch, watchSyncEffect } from 'vue'
import { injectMenuContentContext } from '@/Menu/MenuContentImpl.vue'
import { injectMenuRootContext } from '@/Menu/MenuRoot.vue'
import { injectMenuSubContext } from '@/Menu/MenuSub.vue'
import { Primitive, usePrimitiveElement } from '@/Primitive'

export interface DropdownMenuFilterProps extends PrimitiveProps {
  /** The controlled value of the filter. Can be binded with v-model. */
  modelValue?: string
  /** Focus on element when mounted. */
  autoFocus?: boolean
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean
}

export type DropdownMenuFilterEmits = {
  'update:modelValue': [string]
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<DropdownMenuFilterProps>(), {
  as: 'input',
})
const emits = defineEmits<DropdownMenuFilterEmits>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: '',
  passive: (props.modelValue === undefined) as false,
})

const rootContext = injectMenuRootContext()
const contentContext = injectMenuContentContext()
const subContext = injectMenuSubContext(null)

// Keep searchRef in sync with modelValue changes
watch(modelValue, (v) => { contentContext.searchRef.value = v ?? '' }, { immediate: true })

const { primitiveElement, currentElement } = usePrimitiveElement()
const disabled = computed(() => props.disabled || false)

const activedescendant = ref<string | undefined>()
watchSyncEffect(() => activedescendant.value = contentContext.highlightedElement.value?.id)

onMounted(() => {
  contentContext.onFilterElementChange(currentElement.value)
  setTimeout(() => {
    // make sure all DOM was flush then only capture the focus
    if (props.autoFocus) {
      const isSubmenu = !!subContext
      if (!isSubmenu || rootContext.isUsingKeyboardRef.value)
        currentElement.value?.focus()
    }
  }, 1)
})

onUnmounted(() => {
  contentContext.onFilterElementChange(undefined)
  // Clean up search when unmounting
  contentContext.searchRef.value = ''
})

function handleInput(event: InputEvent) {
  if (disabled.value)
    return
  const target = event.target as HTMLInputElement
  modelValue.value = target.value
  // Update the menu's search ref to help with filtering
  contentContext.searchRef.value = target.value
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled.value)
    return
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    contentContext.onKeydownNavigation(event)
  }
  else if (event.key === 'Enter') {
    event.preventDefault()
    contentContext.onKeydownEnter(event)
  }
  // Prevent Escape from bubbling to avoid closing the menu when clearing the filter
  else if (event.key === 'Escape' && modelValue.value) {
    event.stopPropagation()
    modelValue.value = ''
    contentContext.searchRef.value = ''
  }
}
</script>

<template>
  <Primitive
    ref="primitiveElement"
    :as="as"
    :as-child="asChild"
    :value="modelValue"
    :disabled="disabled ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :aria-disabled="disabled ? true : undefined"
    :aria-activedescendant="activedescendant"
    type="text"
    role="searchbox"
    @input="handleInput"
    @keydown="handleKeyDown"
  >
    <slot :model-value="modelValue" />
  </Primitive>
</template>
