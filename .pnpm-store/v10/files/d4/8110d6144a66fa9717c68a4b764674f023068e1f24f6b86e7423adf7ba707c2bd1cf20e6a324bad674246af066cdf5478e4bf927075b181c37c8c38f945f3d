<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface TagsInputInputProps extends PrimitiveProps {
  /** The placeholder character to use for empty tags input. */
  placeholder?: string
  /** Focus on element when mounted. */
  autoFocus?: boolean
  /** Maximum number of character allowed. */
  maxLength?: number
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { injectTagsInputRootContext } from './TagsInputRoot.vue'

const props = withDefaults(defineProps<TagsInputInputProps>(), {
  as: 'input',
})

const context = injectTagsInputRootContext()
const { forwardRef, currentElement } = useForwardExpose()

function handleBlur(event: Event) {
  context.selectedElement.value = undefined

  if (!context.addOnBlur.value)
    return

  const target = event.target as HTMLInputElement
  if (!target.value)
    return

  const isAdded = context.onAddValue(target.value)
  if (isAdded)
    target.value = ''
}

function handleTab(event: Event) {
  if (!context.addOnTab.value)
    return

  handleCustomKeydown(event)
}

const isComposing = ref(false)
function onCompositionStart() {
  isComposing.value = true
}
function onCompositionEnd() {
  nextTick(() => {
    isComposing.value = false
  })
}
async function handleCustomKeydown(event: Event) {
  if (isComposing.value)
    return
  await nextTick()
  // if keydown 'Enter' or `Tab` was prevented, we let user handle updating the value themselves
  if (event.defaultPrevented)
    return

  const target = event.target as HTMLInputElement
  if (!target.value)
    return

  const isAdded = context.onAddValue(target.value)
  if (isAdded)
    target.value = ''

  // prevent reloading when using inside of form
  event.preventDefault()
}

function handleInput(event: InputEvent) {
  context.isInvalidInput.value = false
  if (event.data === null)
    return

  const delimiter = context.delimiter.value
  const matchesDelimiter = delimiter === event.data || (delimiter instanceof RegExp && delimiter.test(event.data))
  if (matchesDelimiter) {
    const target = event.target as HTMLInputElement
    target.value = target.value.replace(delimiter, '')

    const isAdded = context.onAddValue(target.value)
    if (isAdded)
      target.value = ''
  }
}

function handlePaste(event: ClipboardEvent) {
  if (context.addOnPaste.value) {
    event.preventDefault()
    const clipboardData = event.clipboardData
    if (!clipboardData)
      return

    const value = clipboardData.getData('text')
    if (context.delimiter.value) {
      const splitValue = value.split(context.delimiter.value)
      splitValue.forEach((v) => {
        context.onAddValue(v)
      })
    }
    else {
      context.onAddValue(value)
    }
  }
}

onMounted(() => {
  const inputEl = currentElement.value.nodeName === 'INPUT'
    ? currentElement.value
    : currentElement.value.querySelector('input')

  if (!inputEl)
    return

  setTimeout(() => {
    // make sure all DOM was flush then only capture the focus
    if (props.autoFocus)
      inputEl?.focus()
  }, 1)
})
</script>

<template>
  <Primitive
    :id="context.id?.value"
    :ref="forwardRef"
    type="text"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    :as="as"
    :as-child="asChild"
    :maxlength="maxLength"
    :placeholder="placeholder"
    :disabled="context.disabled.value"
    :data-invalid="context.isInvalidInput.value ? '' : undefined"
    @input="handleInput"
    @keydown.enter="handleCustomKeydown"
    @keydown.tab="handleTab"
    @blur="handleBlur"
    @keydown="context.onInputKeydown"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
    @paste="handlePaste"
  >
    <slot />
  </Primitive>
</template>
