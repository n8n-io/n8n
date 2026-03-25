import { UndiciInstrumentationConfig } from '@opentelemetry/instrumentation-undici';
interface NodeFetchOptions extends Pick<UndiciInstrumentationConfig, 'requestHook' | 'responseHook'> {
    /**
     * Whether breadcrumbs should be recorded for requests.
     * Defaults to true
     */
    breadcrumbs?: boolean;
    /**
     * If set to false, do not emit any spans.
     * This will ensure that the default UndiciInstrumentation from OpenTelemetry is not setup,
     * only the Sentry-specific instrumentation for breadcrumbs & trace propagation is applied.
     *
     * If `skipOpenTelemetrySetup: true` is configured, this defaults to `false`, otherwise it defaults to `true`.
     */
    spans?: boolean;
    /**
     * Do not capture spans or breadcrumbs for outgoing fetch requests to URLs where the given callback returns `true`.
     * This controls both span & breadcrumb creation - spans will be non recording if tracing is disabled.
     */
    ignoreOutgoingRequests?: (url: string) => boolean;
}
export declare const nativeNodeFetchIntegration: (options?: NodeFetchOptions | undefined) => import("@sentry/core").Integration;
export {};
//# sourceMappingURL=node-fetch.d.ts.map
