<script setup lang="ts">
import { ref, watch } from 'vue'
import { VisuallyHidden } from '@/VisuallyHidden'

interface BubbleSelectProps {
  autocomplete?: string
  autofocus?: boolean
  disabled?: boolean
  form?: string
  multiple?: boolean
  name?: string
  required?: boolean
  size?: number
  value?: any
}

const props = defineProps<BubbleSelectProps>()
const selectElement = ref<HTMLElement>()

// This would bubble "change" event to form, with the target as Select element.
watch(() => props.value, (cur, prev) => {
  const selectProto = window.HTMLSelectElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(
    selectProto,
    'value',
  ) as PropertyDescriptor
  const setValue = descriptor.set
  if (cur !== prev && setValue && selectElement.value) {
    const event = new Event('change', { bubbles: true })
    setValue.call(selectElement.value, cur)
    selectElement.value.dispatchEvent(event)
  }
})

/**
 * We purposefully use a `select` here to support form autofill as much
 * as possible.
 *
 * We purposefully do not add the `value` attribute here to allow the value
 * to be set programmatically and bubble to any parent form `onChange` event.
 *
 * We use `VisuallyHidden` rather than `display: "none"` because Safari autofill
 * won't work otherwise.
 */
</script>

<template>
  <VisuallyHidden as-child>
    <select
      ref="selectElement"
      v-bind="props"
    >
      <slot />
    </select>
  </VisuallyHidden>
</template>
