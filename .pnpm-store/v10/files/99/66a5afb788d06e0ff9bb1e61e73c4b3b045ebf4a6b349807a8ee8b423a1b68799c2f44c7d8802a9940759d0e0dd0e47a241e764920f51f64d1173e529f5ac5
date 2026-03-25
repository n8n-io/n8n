<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { injectTagsInputRootContext } from './TagsInputRoot.vue'

export interface TagsInputClearProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<TagsInputClearProps>(), {
  as: 'button',
})

useForwardExpose()
const context = injectTagsInputRootContext()

function handleCancel() {
  if (context.disabled.value)
    return
  context.modelValue.value = []
}
</script>

<template>
  <Primitive
    v-bind="props"
    :type="as === 'button' ? 'button' : undefined"
    :data-disabled="context.disabled.value ? '' : undefined"
    @click="handleCancel"
  >
    <slot />
  </Primitive>
</template>
