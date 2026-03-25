// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { SpanKind } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { OpenTelemetryConstants } from '../constants';
/**
 * Provides OpenTelemetry tracing scope for output message tracing with parent span linking.
 */
export class OutputScope extends OpenTelemetryScope {
    /**
     * Creates and starts a new scope for output message tracing.
     * @param response The response containing initial output messages.
     * @param agentDetails The details of the agent producing the output.
     * @param tenantDetails The tenant details.
     * @param parentContext Optional parent context for cross-async-boundary tracing.
     *   Accepts a ParentSpanRef (manual traceId/spanId) or an OTel Context (e.g. from extractTraceContext).
     * @param startTime Optional explicit start time (ms epoch, Date, or HrTime).
     * @param endTime Optional explicit end time (ms epoch, Date, or HrTime).
     * @returns A new OutputScope instance.
     */
    static start(response, agentDetails, tenantDetails, parentContext, startTime, endTime) {
        return new OutputScope(response, agentDetails, tenantDetails, parentContext, startTime, endTime);
    }
    constructor(response, agentDetails, tenantDetails, parentContext, startTime, endTime) {
        super(SpanKind.CLIENT, OpenTelemetryConstants.OUTPUT_MESSAGES_OPERATION_NAME, `${OpenTelemetryConstants.OUTPUT_MESSAGES_OPERATION_NAME} ${agentDetails.agentId}`, agentDetails, tenantDetails, parentContext, startTime, endTime);
        // Initialize accumulated messages list from the response
        this._outputMessages = [...response.messages];
        // Set initial output messages attribute
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_OUTPUT_MESSAGES_KEY, JSON.stringify(this._outputMessages));
    }
    /**
     * Records the output messages for telemetry tracking.
     * Appends the provided messages to the accumulated output messages list.
     * @param messages Array of output messages to append.
     */
    recordOutputMessages(messages) {
        this._outputMessages.push(...messages);
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_OUTPUT_MESSAGES_KEY, JSON.stringify(this._outputMessages));
    }
}
//# sourceMappingURL=OutputScope.js.map