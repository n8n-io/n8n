import type { EventHook } from '@vueuse/core'

/**
 * Source code taken from https://github.com/vueuse/vueuse/blob/main/packages/shared/createEventHook/index.ts
 *
 * Modified to be able to check if there are any event listeners
 */
export interface EventHookExtended<T> extends EventHook<T> {
  hasListeners: () => boolean
  fns: Set<(param: T) => void>
}
export declare function createExtendedEventHook<T = any>(defaultHandler?: (param: T) => void): EventHookExtended<T>
