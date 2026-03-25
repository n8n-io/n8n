<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose, useId } from '@/shared'
import { injectTagsInputItemContext } from './TagsInputItem.vue'

export interface TagsInputItemTextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<TagsInputItemTextProps>(), {
  as: 'span',
})

const itemContext = injectTagsInputItemContext()
useForwardExpose()

itemContext.textId ||= useId(undefined, 'reka-tags-input-item-text')
</script>

<template>
  <Primitive
    v-bind="props"
    :id="itemContext.textId"
  >
    <slot>{{ itemContext.displayValue.value }}</slot>
  </Primitive>
</template>
