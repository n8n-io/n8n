import { SpanKind, Span, AttributeValue, SpanContext, TimeInput } from '@opentelemetry/api';
import { AgentDetails, TenantDetails } from '../contracts';
import { ParentContext } from '../context/trace-context-propagation';
/**
 * Base class for OpenTelemetry tracing scopes
 */
export declare abstract class OpenTelemetryScope implements Disposable {
    private static readonly tracer;
    protected readonly span: Span;
    private readonly wallClockStartMs;
    private customStartTime?;
    private customEndTime?;
    private errorType?;
    private exception?;
    private hasEnded;
    /**
     * Initializes a new instance of the OpenTelemetryScope class
     * @param kind The kind of span (CLIENT, SERVER, INTERNAL, etc.)
     * @param operationName The name of the operation being traced
     * @param spanName The name of the span for display purposes
     * @param agentDetails Optional agent details
     * @param tenantDetails Optional tenant details
     * @param parentContext Optional parent context for cross-async-boundary tracing.
     *   Accepts a {@link ParentSpanRef} (manual traceId/spanId) or an OTel {@link Context}
     *   (e.g. from {@link extractTraceContext} for W3C header propagation).
     * @param startTime Optional explicit start time (ms epoch, Date, or HrTime). When provided the span
     *        records this timestamp instead of "now", which is useful when recording an operation after it
     *        has already completed (e.g. a tool call whose start time was captured earlier).
     * @param endTime Optional explicit end time (ms epoch, Date, or HrTime). When provided the span will
     *        use this timestamp when {@link dispose} is called instead of the current wall-clock time.
     */
    protected constructor(kind: SpanKind, operationName: string, spanName: string, agentDetails?: AgentDetails, tenantDetails?: TenantDetails, parentContext?: ParentContext, startTime?: TimeInput, endTime?: TimeInput);
    /**
     * Makes this span active for the duration of the async callback execution
     */
    withActiveSpanAsync<T>(callback: () => Promise<T>): Promise<T>;
    /**
     * Gets the span context for this scope.
     * This can be used to create a ParentSpanRef for explicit parent-child linking across async boundaries.
     * @returns The SpanContext containing traceId and spanId
     */
    getSpanContext(): SpanContext;
    /**
     * Records an error that occurred during the operation
     * @param error The error that occurred
     */
    recordError(error: Error): void;
    /**
     * Records multiple attribute key/value pairs for telemetry tracking.
     * @param attributes Collection of attribute key/value pairs (array or iterable of [key, value] or object map).
     */
    recordAttributes(attributes: Iterable<[string, AttributeValue]> | Record<string, AttributeValue> | null | undefined): void;
    /**
     * Sets a tag on the span if telemetry is enabled
     * @param name The tag name
     * @param value The tag value
     */
    protected setTagMaybe<T extends string | number | boolean>(name: string, value: T | null | undefined): void;
    /**
     * Add baggage to the current context
     * @param key The baggage key
     * @param value The baggage value
     */
    protected addBaggage(key: string, value: string): void;
    /**
     * Converts a `TimeInput` value to milliseconds since epoch.
     * OTel's `TimeInput` can be a `number` (ms epoch), a `Date`, or an `HrTime` tuple `[seconds, nanoseconds]`.
     */
    private static timeInputToMs;
    /**
     * Sets a custom end time for the scope.
     * When set, {@link dispose} will pass this value to `span.end()` instead of using the current wall-clock time.
     * This is useful when the actual end time of the operation is known before the scope is disposed.
     * @param endTime The end time as milliseconds since epoch, a Date, or an HrTime tuple.
     */
    setEndTime(endTime: TimeInput): void;
    /**
     * Finalizes the scope and records metrics
     */
    private end;
    /**
     * Disposes the scope and finalizes telemetry data collection
     */
    [Symbol.dispose](): void;
    /**
     * Legacy dispose method for compatibility
     */
    dispose(): void;
}
//# sourceMappingURL=OpenTelemetryScope.d.ts.map