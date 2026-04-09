import type { MaybeElementRef } from '@vueuse/core'
import { unrefElement } from '@vueuse/core'
import { hideOthers } from 'aria-hidden'
import { onUnmounted, watch } from 'vue'

/**
 * The `useHideOthers` function is a TypeScript function that takes a target element reference and
 * hides all other elements in ARIA when the target element is present, and restores the visibility of the
 * hidden elements when the target element is removed.
 * @param {MaybeElementRef} target - The `target` parameter is a reference to the element that you want
 * to hide other elements when it is clicked or focused.
 */
export function useHideOthers(target: MaybeElementRef) {
  let undo: ReturnType<typeof hideOthers>
  watch(() => unrefElement(target), (el) => {
    // disable hideOthers on test mode
    if (import.meta.env.MODE === 'test')
      return
    // Skip if inside a closed native popover
    // Use try/catch as `:popover-open` pseudo-class is not supported in all browsers (e.g. Safari 18)
    let isInsideClosedPopover = false
    try {
      isInsideClosedPopover = !!el?.closest('[popover]:not(:popover-open)')
    }
    catch {}
    if (el && !isInsideClosedPopover)
      undo = hideOthers(el)
    else if (undo)
      undo()
  })

  onUnmounted(() => {
    if (undo)
      undo()
  })
}
