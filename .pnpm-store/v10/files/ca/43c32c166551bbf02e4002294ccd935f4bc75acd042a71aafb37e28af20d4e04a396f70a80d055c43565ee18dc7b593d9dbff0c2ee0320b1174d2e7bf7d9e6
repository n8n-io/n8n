import type * as http from 'node:http';
import type { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import type { Span } from '@sentry/core';
export type SentryHttpInstrumentationOptions = InstrumentationConfig & {
    /**
     * Whether breadcrumbs should be recorded for outgoing requests.
     *
     * @default `true`
     */
    breadcrumbs?: boolean;
    /**
     * Whether to propagate Sentry trace headers in outgoing requests.
     * By default this is done by the HttpInstrumentation, but if that is not added (e.g. because tracing is disabled)
     * then this instrumentation can take over.
     *
     * @default `false`
     */
    propagateTraceInOutgoingRequests?: boolean;
    /**
     * Whether to enable the capability to create spans for outgoing requests via diagnostic channels.
     * If enabled, spans will only be created if the `spans` option is also enabled (default: true).
     *
     * This is a feature flag that should be enabled by SDKs when the runtime supports it (Node 22.12+).
     * Individual users should not need to configure this directly.
     *
     * @default `false`
     */
    createSpansForOutgoingRequests?: boolean;
    /**
     * Whether to create spans for outgoing requests (user preference).
     * This only takes effect if `createSpansForOutgoingRequests` is also enabled.
     * If `createSpansForOutgoingRequests` is not enabled, this option is ignored.
     *
     * @default `true`
     */
    spans?: boolean;
    /**
     * Do not capture breadcrumbs for outgoing HTTP requests to URLs where the given callback returns `true`.
     * For the scope of this instrumentation, this callback only controls breadcrumb creation.
     * The same option can be passed to the top-level httpIntegration where it controls both, breadcrumb and
     * span creation.
     *
     * @param url Contains the entire URL, including query string (if any), protocol, host, etc. of the outgoing request.
     * @param request Contains the {@type RequestOptions} object used to make the outgoing request.
     */
    ignoreOutgoingRequests?: (url: string, request: http.RequestOptions) => boolean;
    /**
     * Hooks for outgoing request spans, called when `createSpansForOutgoingRequests` is enabled.
     * These mirror the OTEL HttpInstrumentation hooks for backwards compatibility.
     */
    outgoingRequestHook?: (span: Span, request: http.ClientRequest) => void;
    outgoingResponseHook?: (span: Span, response: http.IncomingMessage) => void;
    outgoingRequestApplyCustomAttributes?: (span: Span, request: http.ClientRequest, response: http.IncomingMessage) => void;
    /**
     * @depreacted This no longer does anything.
     */
    extractIncomingTraceFromHeader?: boolean;
    /**
     * @deprecated This no longer does anything.
     */
    ignoreStaticAssets?: boolean;
    /**
     * @deprecated This no longer does anything.
     */
    disableIncomingRequestSpans?: boolean;
    /**
     * @deprecated This no longer does anything.
     */
    ignoreSpansForIncomingRequests?: (urlPath: string, request: http.IncomingMessage) => boolean;
    /**
     * @deprecated This no longer does anything.
     */
    ignoreIncomingRequestBody?: (url: string, request: http.RequestOptions) => boolean;
    /**
     * @deprecated This no longer does anything.
     */
    maxIncomingRequestBodySize?: 'none' | 'small' | 'medium' | 'always';
    /**
     * @deprecated This no longer does anything.
     */
    trackIncomingRequestsAsSessions?: boolean;
    /**
     * @deprecated This no longer does anything.
     */
    instrumentation?: {
        requestHook?: (span: Span, req: http.ClientRequest | http.IncomingMessage) => void;
        responseHook?: (span: Span, response: http.IncomingMessage | http.ServerResponse) => void;
        applyCustomAttributesOnSpan?: (span: Span, request: http.ClientRequest | http.IncomingMessage, response: http.IncomingMessage | http.ServerResponse) => void;
    };
    /**
     * @deprecated This no longer does anything.
     */
    sessionFlushingDelayMS?: number;
};
/**
 * This custom HTTP instrumentation handles outgoing HTTP requests.
 *
 * It provides:
 * - Breadcrumbs for all outgoing requests
 * - Trace propagation headers (when enabled)
 * - Span creation for outgoing requests (when createSpansForOutgoingRequests is enabled)
 *
 * Span creation requires Node 22+ and uses diagnostic channels to avoid monkey-patching.
 * By default, this is only enabled in the node SDK, not in node-core or other runtime SDKs.
 *
 * Important note: Contrary to other OTEL instrumentation, this one cannot be unwrapped.
 *
 * This is heavily inspired & adapted from:
 * https://github.com/open-telemetry/opentelemetry-js/blob/f8ab5592ddea5cba0a3b33bf8d74f27872c0367f/experimental/packages/opentelemetry-instrumentation-http/src/http.ts
 */
export declare class SentryHttpInstrumentation extends InstrumentationBase<SentryHttpInstrumentationOptions> {
    private _propagationDecisionMap;
    private _ignoreOutgoingRequestsMap;
    constructor(config?: SentryHttpInstrumentationOptions);
    /** @inheritdoc */
    init(): [InstrumentationNodeModuleDefinition, InstrumentationNodeModuleDefinition];
    /**
     * Start a span for an outgoing request.
     * The span wraps the callback of the request, and ends when the response is finished.
     */
    private _startSpanForOutgoingRequest;
    /**
     * This is triggered when an outgoing request finishes.
     * It has access to the final request and response objects.
     */
    private _onOutgoingRequestFinish;
    /**
     * This is triggered when an outgoing request is created.
     * It creates a span (if enabled) and propagates trace headers within the span's context,
     * so downstream services link to the outgoing HTTP span rather than its parent.
     */
    private _onOutgoingRequestCreated;
    /**
     * Check if the given outgoing request should be ignored.
     */
    private _shouldIgnoreOutgoingRequest;
}
//# sourceMappingURL=SentryHttpInstrumentation.d.ts.map