import type { EventHook } from '@vueuse/core'

export interface EventHookExtended<T> extends EventHook<T> {
  /** true if any user listeners are registered (emitter ignored) */
  hasListeners: () => boolean
  /** current user listeners (read-only; do not mutate externally) */
  listeners: ReadonlySet<(param: T) => void>
  /** wire a single external emitter (e.g., for `emit`) */
  setEmitter: (fn: (param: T) => void) => void
  /** remove the external emitter */
  removeEmitter: () => void
  /** wire a function to detect if any emit listeners exist (e.g., for `$listeners` in Vue 2) */
  setHasEmitListeners: (fn: () => boolean) => void
  /** remove the emit listeners detector */
  removeHasEmitListeners: () => void
}
export declare function createExtendedEventHook<T = any>(defaultHandler?: (param: T) => void): EventHookExtended<T>
