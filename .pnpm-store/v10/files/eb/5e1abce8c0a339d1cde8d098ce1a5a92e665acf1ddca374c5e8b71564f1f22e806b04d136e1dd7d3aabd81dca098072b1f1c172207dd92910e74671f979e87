import { createSharedComposable, useEventListener } from '@vueuse/core'
import { onMounted, ref } from 'vue'

function useIsUsingKeyboardImpl() {
  const isUsingKeyboard = ref(false)

  onMounted(() => {
    // Capture phase ensures we set the boolean before any side effects execute
    // in response to the key or pointer event as they might depend on this value.
    useEventListener('keydown', () => {
      isUsingKeyboard.value = true
    }, { capture: true, passive: true })

    useEventListener(['pointerdown', 'pointermove'], () => {
      isUsingKeyboard.value = false
    }, { capture: true, passive: true })
  })

  return isUsingKeyboard
}

export const useIsUsingKeyboard = createSharedComposable(useIsUsingKeyboardImpl)
