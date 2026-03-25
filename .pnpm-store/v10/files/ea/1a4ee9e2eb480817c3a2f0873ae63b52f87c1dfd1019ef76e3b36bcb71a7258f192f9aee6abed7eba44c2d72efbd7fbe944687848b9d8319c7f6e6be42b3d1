// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
import { propagation } from '@opentelemetry/api';
import { OpenTelemetryConstants, OperationSource } from '../constants';
import { GENERIC_ATTRIBUTES, INVOKE_AGENT_ATTRIBUTES } from './util';
/**
 * Span processor that propagates baggage key/value pairs to span attributes.
 *
 * This processor copies baggage entries onto spans based on the operation type.
 * For invoke_agent operations, it applies both generic and invoke-agent-specific attributes.
 * For other operations, it applies only generic attributes.
 */
export class SpanProcessor {
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
        const baggage = propagation.getBaggage(ctx);
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
        const operationName = baggageMap.get(OpenTelemetryConstants.GEN_AI_OPERATION_NAME_KEY) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            span.attributes?.[OpenTelemetryConstants.GEN_AI_OPERATION_NAME_KEY];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spanName = span.name || '';
        const isInvokeAgent = operationName === OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME ||
            spanName.startsWith(OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME);
        // Build target key set
        const targetKeys = new Set(GENERIC_ATTRIBUTES);
        if (isInvokeAgent) {
            INVOKE_AGENT_ATTRIBUTES.forEach(key => targetKeys.add(key));
        }
        // Set operation source - coalesce baggage value with SDK default
        if (!existingAttrs.has(OpenTelemetryConstants.OPERATION_SOURCE_KEY)) {
            const operationSource = baggageMap.get(OpenTelemetryConstants.OPERATION_SOURCE_KEY) ||
                OperationSource.SDK;
            span.setAttribute(OpenTelemetryConstants.OPERATION_SOURCE_KEY, operationSource);
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
//# sourceMappingURL=SpanProcessor.js.map