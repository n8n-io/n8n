"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryScope = void 0;
const api_1 = require("@opentelemetry/api");
const constants_1 = require("../constants");
const parent_span_context_1 = require("../context/parent-span-context");
const trace_context_propagation_1 = require("../context/trace-context-propagation");
const logging_1 = __importDefault(require("../../utils/logging"));
/**
 * Base class for OpenTelemetry tracing scopes
 */
class OpenTelemetryScope {
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
    constructor(kind, operationName, spanName, agentDetails, tenantDetails, parentContext, startTime, endTime) {
        this.hasEnded = false;
        // Determine the context to use for span creation
        let currentContext = api_1.context.active();
        if (parentContext) {
            if ((0, trace_context_propagation_1.isParentSpanRef)(parentContext)) {
                // Existing ParentSpanRef path (backward compatible)
                currentContext = (0, parent_span_context_1.createContextWithParentSpanRef)(currentContext, parentContext);
                logging_1.default.info(`[A365Observability] Using explicit parent span: traceId=${parentContext.traceId}, spanId=${parentContext.spanId}`);
            }
            else {
                // OTel Context path (from extractTraceContext or propagation.extract)
                currentContext = parentContext;
            }
        }
        logging_1.default.info(`[A365Observability] Starting span: ${spanName}, operation: ${operationName} for tenantId: ${tenantDetails?.tenantId || 'unknown'}, agentId: ${agentDetails?.agentId || 'unknown'}`);
        // Start span with current context to establish parent-child relationship
        this.span = OpenTelemetryScope.tracer.startSpan(spanName, {
            kind,
            startTime,
            attributes: {
                [constants_1.OpenTelemetryConstants.GEN_AI_SYSTEM_KEY]: constants_1.OpenTelemetryConstants.GEN_AI_SYSTEM_VALUE,
                [constants_1.OpenTelemetryConstants.GEN_AI_OPERATION_NAME_KEY]: operationName,
            },
        }, currentContext);
        logging_1.default.info(`[A365Observability] Span[${this.span.spanContext().spanId}] ${spanName}, operation: ${operationName} started successfully`);
        this.wallClockStartMs = Date.now();
        if (startTime !== undefined) {
            this.customStartTime = startTime;
        }
        this.customEndTime = endTime;
        // Set agent details if provided
        if (agentDetails) {
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_ID_KEY, agentDetails.agentId);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_NAME_KEY, agentDetails.agentName);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_TYPE_KEY, agentDetails.agentType);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_DESCRIPTION_KEY, agentDetails.agentDescription);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_PLATFORM_ID_KEY, agentDetails.platformId);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_CONVERSATION_ID_KEY, agentDetails.conversationId);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_ICON_URI_KEY, agentDetails.iconUri);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_AUID_KEY, agentDetails.agentAUID);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_UPN_KEY, agentDetails.agentUPN);
            this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_BLUEPRINT_ID_KEY, agentDetails.agentBlueprintId);
        }
        // Set tenant details if provided
        if (tenantDetails) {
            this.setTagMaybe(constants_1.OpenTelemetryConstants.TENANT_ID_KEY, tenantDetails.tenantId);
        }
    }
    /**
     * Makes this span active for the duration of the async callback execution
     */
    withActiveSpanAsync(callback) {
        const newContext = api_1.trace.setSpan(api_1.context.active(), this.span);
        return api_1.context.with(newContext, callback);
    }
    /**
     * Gets the span context for this scope.
     * This can be used to create a ParentSpanRef for explicit parent-child linking across async boundaries.
     * @returns The SpanContext containing traceId and spanId
     */
    getSpanContext() {
        return this.span.spanContext();
    }
    /**
     * Records an error that occurred during the operation
     * @param error The error that occurred
     */
    recordError(error) {
        logging_1.default.error(`[A365Observability] Records an error that occurred during the operation span[${this.span.spanContext().spanId}]: ${error.message}`);
        // Check if it's an HTTP error with status code
        if ('status' in error && typeof error.status === 'number') {
            this.errorType = error.status.toString();
        }
        else {
            this.errorType = error.constructor.name;
        }
        this.exception = error;
        this.span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error.message
        });
        this.span.recordException(error);
    }
    /**
     * Records multiple attribute key/value pairs for telemetry tracking.
     * @param attributes Collection of attribute key/value pairs (array or iterable of [key, value] or object map).
     */
    recordAttributes(attributes) {
        if (!attributes)
            return;
        // Support both array/iterable of pairs and object maps
        if (Array.isArray(attributes)) {
            for (const [key, value] of attributes) {
                if (!key || typeof key !== 'string' || !key.trim())
                    continue;
                this.span.setAttribute(key, value);
            }
        }
        else if (typeof attributes === 'object' &&
            typeof attributes[Symbol.iterator] === 'function' &&
            !Array.isArray(attributes) &&
            typeof attributes !== 'string') {
            for (const [key, value] of attributes) {
                if (!key || typeof key !== 'string' || !key.trim())
                    continue;
                this.span.setAttribute(key, value);
            }
        }
        else if (typeof attributes === 'object') {
            for (const key of Object.keys(attributes)) {
                if (!key || typeof key !== 'string' || !key.trim())
                    continue;
                this.span.setAttribute(key, attributes[key]);
            }
        }
    }
    /**
     * Sets a tag on the span if telemetry is enabled
     * @param name The tag name
     * @param value The tag value
     */
    setTagMaybe(name, value) {
        if (value != null) {
            this.span.setAttributes({ [name]: value });
        }
    }
    /**
     * Add baggage to the current context
     * @param key The baggage key
     * @param value The baggage value
     */
    addBaggage(key, value) {
        // Note: OpenTelemetry JS doesn't have direct baggage API in span
        // This would typically be handled through the baggage API
        this.span.setAttributes({ [`baggage.${key}`]: value });
    }
    /**
     * Converts a `TimeInput` value to milliseconds since epoch.
     * OTel's `TimeInput` can be a `number` (ms epoch), a `Date`, or an `HrTime` tuple `[seconds, nanoseconds]`.
     */
    static timeInputToMs(t) {
        if (typeof t === 'number')
            return t;
        if (t instanceof Date)
            return t.getTime();
        if (Array.isArray(t) && t.length === 2)
            return t[0] * 1000 + t[1] / 1000000;
        logging_1.default.warn(`[A365Observability] timeInputToMs received unexpected TimeInput (type=${typeof t}, isArray=${Array.isArray(t)}); falling back to Date.now()`);
        return Date.now();
    }
    /**
     * Sets a custom end time for the scope.
     * When set, {@link dispose} will pass this value to `span.end()` instead of using the current wall-clock time.
     * This is useful when the actual end time of the operation is known before the scope is disposed.
     * @param endTime The end time as milliseconds since epoch, a Date, or an HrTime tuple.
     */
    setEndTime(endTime) {
        this.customEndTime = endTime;
    }
    /**
     * Finalizes the scope and records metrics
     */
    end() {
        if (this.hasEnded) {
            logging_1.default.info(`[A365Observability] Span already ended for span[${this.span.spanContext().spanId}]`);
            return;
        }
        // Calculate duration: use custom start/end when provided, otherwise fall back to wall-clock.
        const startMs = this.customStartTime !== undefined
            ? OpenTelemetryScope.timeInputToMs(this.customStartTime)
            : this.wallClockStartMs;
        const endMs = this.customEndTime !== undefined
            ? OpenTelemetryScope.timeInputToMs(this.customEndTime)
            : Date.now();
        const durationMs = Math.max(0, endMs - startMs);
        const duration = durationMs / 1000;
        const finalTags = {};
        if (this.errorType) {
            finalTags[constants_1.OpenTelemetryConstants.ERROR_TYPE_KEY] = this.errorType;
            this.span.setAttributes({ [constants_1.OpenTelemetryConstants.ERROR_TYPE_KEY]: this.errorType });
        }
        // Record duration metric (would typically use a meter here)
        // For now, we'll add it as a span attribute
        this.span.setAttributes({ 'operation.duration': duration });
        this.hasEnded = true;
        logging_1.default.info(`[A365Observability] Ending span[${this.span.spanContext().spanId}], duration: ${duration}s`);
    }
    /**
     * Disposes the scope and finalizes telemetry data collection
     */
    [Symbol.dispose]() {
        if (!this.hasEnded) {
            this.end();
            if (this.customEndTime !== undefined) {
                this.span.end(this.customEndTime);
            }
            else {
                this.span.end();
            }
        }
    }
    /**
     * Legacy dispose method for compatibility
     */
    dispose() {
        this[Symbol.dispose]();
    }
}
exports.OpenTelemetryScope = OpenTelemetryScope;
OpenTelemetryScope.tracer = api_1.trace.getTracer(constants_1.OpenTelemetryConstants.SOURCE_NAME);
//# sourceMappingURL=OpenTelemetryScope.js.map