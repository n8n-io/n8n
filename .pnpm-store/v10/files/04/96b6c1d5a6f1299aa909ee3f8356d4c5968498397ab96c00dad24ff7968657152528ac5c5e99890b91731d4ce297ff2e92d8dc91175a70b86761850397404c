<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { Primitive, usePrimitiveElement } from '@/Primitive'

export interface EditableInputProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import { useKbd } from '@/shared'
import { injectEditableRootContext } from './EditableRoot.vue'

const props = withDefaults(defineProps<EditableInputProps>(), {
  as: 'input',
})

const kbd = useKbd()

const context = injectEditableRootContext()

const disabled = computed(() => context.disabled.value)

const placeholder = computed(() => context.placeholder.value?.edit)

const { primitiveElement, currentElement: inputRef } = usePrimitiveElement()

onMounted(() => {
  context.inputRef.value = inputRef.value as HTMLInputElement
  if (context.startWithEditMode.value) {
    context.inputRef.value?.focus({ preventScroll: true })
    if (context.selectOnFocus.value)
      context.inputRef.value?.select()
  }
})

watch(context.isEditing, (value) => {
  if (value) {
    nextTick(() => {
      context.inputRef.value?.focus({ preventScroll: true })
      if (context.selectOnFocus.value)
        context.inputRef.value?.select()
    })
  }
})

function handleSubmitKeyDown(event: KeyboardEvent) {
  if ((context.submitMode.value === 'enter' || context.submitMode.value === 'both') && event.key === kbd.ENTER && !event.shiftKey && !event.metaKey)
    context.submit()
}
</script>

<template>
  <Primitive
    ref="primitiveElement"
    v-bind="props"
    :value="context.inputValue.value"
    :placeholder="placeholder"
    :disabled="disabled"
    :maxlength="context.maxLength.value"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="context.readonly.value ? '' : undefined"
    :readonly="context.readonly.value"
    aria-label="editable input"
    :hidden="context.autoResize.value ? undefined : !context.isEditing.value"
    :style="context.autoResize.value ? { all: 'unset', gridArea: '1 / 1 / auto / auto', visibility: !context.isEditing.value ? 'hidden' : undefined } : undefined"
    @input="context.inputValue.value = $event.target.value"
    @keydown.enter.space="handleSubmitKeyDown"
    @keydown.esc="context.cancel"
  >
    <slot />
  </Primitive>
</template>
