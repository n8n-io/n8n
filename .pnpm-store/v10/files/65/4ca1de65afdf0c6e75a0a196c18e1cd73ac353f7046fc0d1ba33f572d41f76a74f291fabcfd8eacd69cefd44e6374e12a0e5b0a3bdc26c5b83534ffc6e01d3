import type { MaybeElementRef } from '@vueuse/core'
import { unrefElement } from '@vueuse/core'
import { onMounted, onUnmounted } from 'vue'

export function onFocusOutside(
  element: MaybeElementRef,
  handler: (event: FocusEvent) => void,
) {
  const handleFocusOut = (ev: FocusEvent) => {
    const el = unrefElement(element)
    if (!ev.relatedTarget)
      return
    const isFocusInsideElement = el?.contains(ev.relatedTarget as Node)

    if (!isFocusInsideElement)
      handler(ev)
  }

  onMounted(() => {
    const el = unrefElement(element)
    // @ts-expect-error focusout should received FocusEvent
    el?.addEventListener('focusout', handleFocusOut)
  })
  onUnmounted(() => {
    const el = unrefElement(element)
    // @ts-expect-error focusout should received FocusEvent
    el?.removeEventListener('focusout', handleFocusOut)
  })
}
