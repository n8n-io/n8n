interface BrowserApiErrorsOptions {
    setTimeout: boolean;
    setInterval: boolean;
    requestAnimationFrame: boolean;
    XMLHttpRequest: boolean;
    eventTarget: boolean | string[];
    /**
     * If you experience issues with this integration causing double-invocations of event listeners,
     * try setting this option to `true`. It will unregister the original callbacks from the event targets
     * before adding the instrumented callback.
     *
     * @default false
     */
    unregisterOriginalCallbacks: boolean;
}
/**
 * Wrap timer functions and event targets to catch errors and provide better meta data.
 */
export declare const browserApiErrorsIntegration: (options?: Partial<BrowserApiErrorsOptions> | undefined) => import("@sentry/core").Integration;
export {};
//# sourceMappingURL=browserapierrors.d.ts.map
