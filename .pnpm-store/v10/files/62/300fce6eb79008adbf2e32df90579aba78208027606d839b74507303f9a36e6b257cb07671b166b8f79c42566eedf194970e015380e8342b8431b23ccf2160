import type { MaybeRefOrGetter } from 'vue'
import type { KeyFilter } from '@vueuse/core'

export interface UseKeyPressOptions {
  target?: MaybeRefOrGetter<EventTarget | null | undefined>
  actInsideInputWithModifier?: MaybeRefOrGetter<boolean>
  preventDefault?: MaybeRefOrGetter<boolean>
}
export declare function isInputDOMNode(event: KeyboardEvent): boolean
/**
 * Composable that returns a boolean value if a key is pressed
 *
 * @public
 * @param keyFilter - Can be a boolean, a string, an array of strings or a function that returns a boolean. If it's a boolean, it will act as if the key is always pressed. If it's a string, it will return true if a key matching that string is pressed. If it's an array of strings, it will return true if any of the strings match a key being pressed, or a combination (e.g. ['ctrl+a', 'ctrl+b'])
 * @param options - Options object
 */
export declare function useKeyPress(
  keyFilter: MaybeRefOrGetter<KeyFilter | boolean | null>,
  options?: UseKeyPressOptions,
): import('vue').ShallowRef<boolean>
