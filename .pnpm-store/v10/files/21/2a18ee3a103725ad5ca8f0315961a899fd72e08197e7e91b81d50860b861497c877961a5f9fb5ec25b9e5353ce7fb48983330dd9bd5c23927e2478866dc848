import type { MaybeElementRef } from '@vueuse/core'
import { toValue, unrefElement } from '@vueuse/core'
import { computed } from 'vue'

export function useFormControl(el: MaybeElementRef) {
  // We set this to true by default so that events bubble to forms without JS (SSR)
  return computed(() => toValue(el) ? Boolean(unrefElement(el)?.closest('form')) : true)
}
