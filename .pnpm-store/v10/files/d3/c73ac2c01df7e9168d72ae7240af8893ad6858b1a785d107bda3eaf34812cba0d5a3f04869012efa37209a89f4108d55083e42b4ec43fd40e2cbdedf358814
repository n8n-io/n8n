import type { ComponentPublicInstance } from 'vue'
import { unrefElement } from '@vueuse/core'
import { computed, ref } from 'vue'

export function usePrimitiveElement<T extends ComponentPublicInstance>() {
  const primitiveElement = ref<T>()
  const currentElement = computed<HTMLElement>(() => ['#text', '#comment'].includes(primitiveElement.value?.$el.nodeName) ? primitiveElement.value?.$el.nextElementSibling : unrefElement(primitiveElement))

  return {
    primitiveElement,
    currentElement,
  }
}
