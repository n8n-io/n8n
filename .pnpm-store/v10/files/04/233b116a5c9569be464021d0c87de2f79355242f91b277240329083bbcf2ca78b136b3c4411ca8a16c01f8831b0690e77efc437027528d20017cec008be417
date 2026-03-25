<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { isEqual } from 'ohash'
import { computed } from 'vue'
import { useForwardExpose } from '@/shared'
import { injectTagsInputItemContext } from './TagsInputItem.vue'
import { injectTagsInputRootContext } from './TagsInputRoot.vue'

export interface TagsInputItemDeleteProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<TagsInputItemDeleteProps>(), {
  as: 'button',
})

useForwardExpose()
const context = injectTagsInputRootContext()
const itemContext = injectTagsInputItemContext()

const disabled = computed(() => itemContext.disabled?.value || context.disabled.value)

function handleDelete() {
  if (disabled.value)
    return
  const index = context.modelValue.value.findIndex(i => isEqual(i, itemContext.value.value))
  context.onRemoveValue(index)
}
</script>

<template>
  <Primitive
    tabindex="-1"
    v-bind="props"
    :aria-labelledby="itemContext.textId"
    :aria-current="itemContext.isSelected.value"
    :data-state="itemContext.isSelected.value ? 'active' : 'inactive'"
    :data-disabled="disabled ? '' : undefined"
    :type="as === 'button' ? 'button' : undefined"
    @click="handleDelete"
  >
    <slot />
  </Primitive>
</template>
