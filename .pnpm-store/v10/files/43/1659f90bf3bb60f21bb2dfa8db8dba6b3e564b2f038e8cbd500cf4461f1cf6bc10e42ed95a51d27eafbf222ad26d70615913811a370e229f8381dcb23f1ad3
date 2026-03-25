<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { AcceptableInputValue } from './TagsInputRoot.vue'
import type { PrimitiveProps } from '@/Primitive'
import { computed, toRefs } from 'vue'
import { createContext, useForwardExpose } from '@/shared'
import { injectTagsInputRootContext } from './TagsInputRoot.vue'

export interface TagsInputItemProps extends PrimitiveProps {
  /** Value associated with the tags */
  value: AcceptableInputValue
  /** When `true`, prevents the user from interacting with the tags input. */
  disabled?: boolean
}

export interface TagsInputItemContext {
  value: Ref<AcceptableInputValue>
  displayValue: ComputedRef<string>
  isSelected: Ref<boolean>
  disabled?: Ref<boolean>
  textId: string
}

export const [injectTagsInputItemContext, provideTagsInputItemContext]
  = createContext<TagsInputItemContext>('TagsInputItem')
</script>

<script setup lang="ts">
import { useCollection } from '@/Collection'
import { Primitive } from '@/Primitive'

const props = defineProps<TagsInputItemProps>()
const { value } = toRefs(props)

const context = injectTagsInputRootContext()
const { forwardRef, currentElement } = useForwardExpose()
const { CollectionItem } = useCollection()

const isSelected = computed(() => context.selectedElement.value === currentElement.value)

const disabled = computed(() => props.disabled || context.disabled.value)

const itemContext = provideTagsInputItemContext({
  value,
  isSelected,
  disabled,
  textId: '',
  displayValue: computed(() => context.displayValue(value.value)),
})
</script>

<template>
  <CollectionItem :value="value">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :as-child="asChild"
      :aria-labelledby="itemContext.textId"
      :aria-current="isSelected"
      :data-disabled="disabled ? '' : undefined"
      :data-state="isSelected ? 'active' : 'inactive'"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
