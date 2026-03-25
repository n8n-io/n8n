// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { context, propagation } from '@opentelemetry/api';
/**
 * Type guard to distinguish a {@link ParentSpanRef} from an OTel {@link Context}.
 */
export function isParentSpanRef(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const maybeCtx = value;
    if (typeof maybeCtx.getValue === 'function' &&
        typeof maybeCtx.setValue === 'function' &&
        typeof maybeCtx.deleteValue === 'function') {
        return false;
    }
    const maybeRef = value;
    return ('traceId' in maybeRef &&
        typeof maybeRef.traceId === 'string' &&
        'spanId' in maybeRef &&
        typeof maybeRef.spanId === 'string');
}
/**
 * Injects the current trace context (`traceparent`/`tracestate` headers) into
 * the provided headers object using the globally registered W3C propagator.
 *
 * @param headers Mutable object where trace context headers will be written.
 * @param ctx Optional OTel Context to inject from. Defaults to the active context.
 * @returns The same `headers` object, for chaining convenience.
 *
 * @example
 * ```typescript
 * const headers: Record<string, string> = {};
 * injectTraceContext(headers);
 * await fetch('http://service-b/process', { headers });
 * ```
 */
export function injectTraceContext(headers, ctx) {
    propagation.inject(ctx ?? context.active(), headers);
    return headers;
}
/**
 * Extracts trace context from incoming HTTP headers using the globally
 * registered W3C propagator. Returns an OTel {@link Context} that can be
 * passed to scope classes as a {@link ParentContext}.
 *
 * @param headers The incoming HTTP request headers containing `traceparent`/`tracestate`.
 * @param baseCtx Optional base context to extend. Defaults to the active context.
 * @returns An OTel Context containing the extracted trace information.
 *
 * @example
 * ```typescript
 * const parentCtx = extractTraceContext(req.headers);
 * const scope = InvokeAgentScope.start(details, tenantDetails, undefined, undefined, parentCtx);
 * ```
 */
export function extractTraceContext(headers, baseCtx) {
    return propagation.extract(baseCtx ?? context.active(), headers);
}
/**
 * Extracts trace context from incoming HTTP headers and runs the callback
 * within that context. Any spans created inside the callback will be
 * parented to the extracted trace.
 *
 * @param headers The incoming HTTP request headers containing `traceparent`/`tracestate`.
 * @param callback The function to execute within the extracted context.
 * @returns The result of the callback.
 *
 * @example
 * ```typescript
 * runWithExtractedTraceContext(req.headers, () => {
 *   const scope = InvokeAgentScope.start(details, tenantDetails);
 *   scope.dispose();
 * });
 * ```
 */
export function runWithExtractedTraceContext(headers, callback) {
    return context.with(extractTraceContext(headers), callback);
}
//# sourceMappingURL=trace-context-propagation.js.map