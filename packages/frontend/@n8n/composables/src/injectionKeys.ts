import type { InjectionKey, Ref } from 'vue';

/**
 * Injection key for an optional pop-out window. Consumers `provide` it from the
 * host that owns the detached window; `useClipboard` reads it so a copy issued
 * inside the pop-out targets that window's `navigator.clipboard`.
 */
export const PopOutWindowKey: InjectionKey<Ref<Window | undefined>> = Symbol('PopOutWindow');
