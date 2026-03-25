import { Context, TraceFlags, TraceState } from '@opentelemetry/api';
/**
 * Reference to a parent span for explicit parent-child linking across async boundaries.
 * Used when automatic context propagation fails (e.g., WebSocket callbacks, external event handlers).
 */
export interface ParentSpanRef {
    /**
     * Trace ID (32-character hex string)
     */
    traceId: string;
    /**
     * Span ID (16-character hex string)
     */
    spanId: string;
    /**
     * Optional trace flags
     */
    traceFlags?: TraceFlags;
    /**
     * Optional W3C trace state for vendor-specific trace context data
     */
    traceState?: TraceState;
    /**
     * Whether the span originated from a remote service (default: true)
     */
    isRemote?: boolean;
}
/**
 * Creates a new Context with an explicit parent span reference.
 * This allows child spans to be correctly parented even when async context is broken.
 *
 * @param base The base context to extend (typically context.active())
 * @param parent The parent span reference containing traceId and spanId
 * @returns A new Context with the parent span set
 */
export declare function createContextWithParentSpanRef(base: Context, parent: ParentSpanRef): Context;
/**
 * Runs a callback function within a context that has an explicit parent span reference.
 * This is useful for creating child spans in async callbacks where context propagation is broken.
 *
 * @param parent The parent span reference
 * @param callback The function to execute with the parent context
 * @returns The result of the callback
 */
export declare function runWithParentSpanRef<T>(parent: ParentSpanRef, callback: () => T): T;
//# sourceMappingURL=parent-span-context.d.ts.map