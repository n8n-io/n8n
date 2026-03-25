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
     * @deprecated This no longer does anything.
     */
    spans?: boolean;
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
 * This custom HTTP instrumentation is used to isolate incoming requests and annotate them with additional information.
 * It does not emit any spans.
 *
 * The reason this is isolated from the OpenTelemetry instrumentation is that users may overwrite this,
 * which would lead to Sentry not working as expected.
 *
 * Important note: Contrary to other OTEL instrumentation, this one cannot be unwrapped.
 * It only does minimal things though and does not emit any spans.
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
     * This is triggered when an outgoing request finishes.
     * It has access to the final request and response objects.
     */
    private _onOutgoingRequestFinish;
    /**
     * This is triggered when an outgoing request is created.
     * It has access to the request object, and can mutate it before the request is sent.
     */
    private _onOutgoingRequestCreated;
    /**
     * Check if the given outgoing request should be ignored.
     */
    private _shouldIgnoreOutgoingRequest;
}
//# sourceMappingURL=SentryHttpInstrumentation.d.ts.map