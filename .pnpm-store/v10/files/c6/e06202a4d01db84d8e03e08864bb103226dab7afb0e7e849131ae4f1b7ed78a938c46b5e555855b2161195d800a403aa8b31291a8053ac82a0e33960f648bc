interface NodeFetchOptions {
    /**
     * Whether breadcrumbs should be recorded for requests.
     * Defaults to true
     */
    breadcrumbs?: boolean;
    /**
     * Do not capture spans or breadcrumbs for outgoing fetch requests to URLs where the given callback returns `true`.
     * This controls both span & breadcrumb creation - spans will be non recording if tracing is disabled.
     */
    ignoreOutgoingRequests?: (url: string) => boolean;
}
export declare const nativeNodeFetchIntegration: (options?: NodeFetchOptions | undefined) => import("@sentry/core").Integration;
export {};
//# sourceMappingURL=index.d.ts.map
