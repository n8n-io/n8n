<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { computed } from 'vue'
import { injectEditableRootContext } from './EditableRoot.vue'

export interface EditablePreviewProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<EditablePreviewProps>(), { as: 'span' })

const context = injectEditableRootContext()

const placeholder = computed(() => context.placeholder.value?.preview)

function handleFocus() {
  if (context.activationMode.value === 'focus')
    context.edit()
}
function handleDoubleClick() {
  if (context.activationMode.value === 'dblclick')
    context.edit()
}
</script>

<template>
  <Primitive
    v-bind="props"
    tabindex="0"
    :data-placeholder-shown="context.isEditing.value ? undefined : ''"
    :hidden="context.autoResize.value ? undefined : context.isEditing.value"
    :style="context.autoResize.value ? {
      whiteSpace: 'pre',
      userSelect: 'none',
      gridArea: '1 / 1 / auto / auto',
      visibility: context.isEditing.value ? 'hidden' : undefined,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } : undefined"
    @focusin="handleFocus"
    @dblclick="handleDoubleClick"
  >
    <slot>
      {{ context.modelValue.value || placeholder }}
    </slot>
  </Primitive>
</template>
