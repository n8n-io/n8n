"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanProcessor = void 0;
const api_1 = require("@opentelemetry/api");
const constants_1 = require("../constants");
const util_1 = require("./util");
/**
 * Span processor that propagates baggage key/value pairs to span attributes.
 *
 * This processor copies baggage entries onto spans based on the operation type.
 * For invoke_agent operations, it applies both generic and invoke-agent-specific attributes.
 * For other operations, it applies only generic attributes.
 */
class SpanProcessor {
    /**
     * Called when a span is started.
     * Copies relevant baggage entries to span attributes.
     */
    onStart(span, parentContext) {
        const ctx = parentContext;
        if (!ctx) {
            return;
        }
        // Get existing span attributes
        const existingAttrs = new Set();
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spanRecord = span;
            if (spanRecord.attributes) {
                Object.keys(spanRecord.attributes).forEach(key => existingAttrs.add(key));
            }
        }
        catch {
            // Ignore errors accessing span attributes
        }
        // Get all baggage entries
        const baggage = api_1.propagation.getBaggage(ctx);
        if (!baggage) {
            return;
        }
        const baggageMap = new Map();
        baggage.getAllEntries().forEach(([key, entry]) => {
            if (entry.value) {
                baggageMap.set(key, entry.value);
            }
        });
        // Determine if this is an invoke_agent operation
        const operationName = baggageMap.get(constants_1.OpenTelemetryConstants.GEN_AI_OPERATION_NAME_KEY) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            span.attributes?.[constants_1.OpenTelemetryConstants.GEN_AI_OPERATION_NAME_KEY];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spanName = span.name || '';
        const isInvokeAgent = operationName === constants_1.OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME ||
            spanName.startsWith(constants_1.OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME);
        // Build target key set
        const targetKeys = new Set(util_1.GENERIC_ATTRIBUTES);
        if (isInvokeAgent) {
            util_1.INVOKE_AGENT_ATTRIBUTES.forEach(key => targetKeys.add(key));
        }
        // Set operation source - coalesce baggage value with SDK default
        if (!existingAttrs.has(constants_1.OpenTelemetryConstants.OPERATION_SOURCE_KEY)) {
            const operationSource = baggageMap.get(constants_1.OpenTelemetryConstants.OPERATION_SOURCE_KEY) ||
                constants_1.OperationSource.SDK;
            span.setAttribute(constants_1.OpenTelemetryConstants.OPERATION_SOURCE_KEY, operationSource);
        }
        // Copy baggage to span attributes
        for (const key of targetKeys) {
            // Skip if attribute already exists
            if (existingAttrs.has(key)) {
                continue;
            }
            const value = baggageMap.get(key);
            if (!value) {
                continue;
            }
            try {
                span.setAttribute(key, value);
            }
            catch {
                // Ignore errors setting attributes
            }
        }
    }
    /**
     * Called when a span is ended.
     */
    onEnd(_span) {
        // No-op for this processor
    }
    /**
     * Shutdown the processor.
     */
    async shutdown() {
        // No-op for this processor
    }
    /**
     * Force flush the processor.
     */
    async forceFlush() {
        // No-op for this processor
    }
}
exports.SpanProcessor = SpanProcessor;
//# sourceMappingURL=SpanProcessor.js.map