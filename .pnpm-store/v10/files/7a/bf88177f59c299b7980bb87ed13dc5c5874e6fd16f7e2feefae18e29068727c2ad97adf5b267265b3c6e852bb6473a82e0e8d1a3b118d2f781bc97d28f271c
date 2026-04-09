<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface ColorFieldInputProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Primitive } from '@/Primitive'
import { injectColorFieldRootContext } from './ColorFieldRoot.vue'

const props = withDefaults(defineProps<ColorFieldInputProps>(), {
  as: 'input',
})

const rootContext = injectColorFieldRootContext()

const isFocused = ref(false)

const inputType = computed(() => {
  return rootContext.channel.value ? 'text' : 'text'
})

const inputMode = computed(() => {
  return rootContext.channel.value ? 'numeric' : 'text'
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  rootContext.updateValue(target.value)
}

function handleBlur() {
  isFocused.value = false
  rootContext.commit()
}

function handleFocus() {
  isFocused.value = true
}

function handleWheel(event: WheelEvent) {
  if (!isFocused.value)
    return
  rootContext.handleWheel(event)
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      rootContext.increment()
      break
    case 'ArrowDown':
      event.preventDefault()
      rootContext.decrement()
      break
    case 'PageUp':
      event.preventDefault()
      rootContext.incrementPage()
      break
    case 'PageDown':
      event.preventDefault()
      rootContext.decrementPage()
      break
    case 'Home':
      event.preventDefault()
      rootContext.decrementToMin()
      break
    case 'End':
      event.preventDefault()
      rootContext.incrementToMax()
      break
    case 'Enter':
      event.preventDefault()
      rootContext.commit()
      break
  }
}

// Handle numeric key validation for channel mode
function handleBeforeInput(event: InputEvent) {
  if (!rootContext.channel.value)
    return // No validation for hex mode

  const target = event.target as HTMLInputElement
  const data = event.data

  // Allow numbers, decimal point, minus sign
  if (data && !/[\d.-]/.test(data)) {
    event.preventDefault()
    return
  }

  // Check the resulting value would be valid
  const nextValue = target.value.slice(0, target.selectionStart ?? undefined)
    + (data ?? '')
    + target.value.slice(target.selectionEnd ?? undefined)

  // Allow empty or partial values while typing
  if (nextValue === '-' || nextValue === '.' || nextValue === '-.')
    return

  const numValue = parseFloat(nextValue)
  if (isNaN(numValue)) {
    event.preventDefault()
  }
}
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :type="inputType"
    :inputmode="inputMode"
    :value="rootContext.inputValue.value"
    :placeholder="rootContext.placeholder.value"
    :disabled="rootContext.disabled.value"
    :readonly="rootContext.readonly.value"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :data-readonly="rootContext.readonly.value ? '' : undefined"
    :aria-invalid="!rootContext.channel.value ? undefined : undefined"
    @input="handleInput"
    @blur="handleBlur"
    @focus="handleFocus"
    @keydown="handleKeydown"
    @wheel="handleWheel"
    @beforeinput="handleBeforeInput"
  >
    <slot />
  </Primitive>
</template>
