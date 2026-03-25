export function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
}
export function getTarget() {
    // @ts-expect-error navigator and windows are not available in all environments
    return (typeof navigator !== 'undefined' && typeof window !== 'undefined')
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : {};
}
export const isProxyAvailable = typeof Proxy === 'function';
