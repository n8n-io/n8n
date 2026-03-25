"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteToolScope = void 0;
const api_1 = require("@opentelemetry/api");
const OpenTelemetryScope_1 = require("./OpenTelemetryScope");
const constants_1 = require("../constants");
/**
 * Provides OpenTelemetry tracing scope for AI tool execution operations.
 */
class ExecuteToolScope extends OpenTelemetryScope_1.OpenTelemetryScope {
    /**
     * Creates and starts a new scope for tool execution tracing.
     * @param details The tool call details
     * @param agentDetails The agent details
     * @param tenantDetails The tenant details
     * @param conversationId Optional conversation id to tag on the span (`gen_ai.conversation.id`).
     * @param sourceMetadata Optional source metadata; only `name` (channel name) and `description` (channel link/URL) are used for tagging.
     * @param parentContext Optional parent context for cross-async-boundary tracing.
     *   Accepts a ParentSpanRef (manual traceId/spanId) or an OTel Context (e.g. from extractTraceContext).
     * @param startTime Optional explicit start time (ms epoch, Date, or HrTime). Useful when recording a
     *        tool call after execution has already completed.
     * @param endTime Optional explicit end time (ms epoch, Date, or HrTime). When provided, the span will
     *        use this timestamp when disposed instead of the current wall-clock time.
     * @returns A new ExecuteToolScope instance.
     */
    static start(details, agentDetails, tenantDetails, conversationId, sourceMetadata, parentContext, startTime, endTime) {
        return new ExecuteToolScope(details, agentDetails, tenantDetails, conversationId, sourceMetadata, parentContext, startTime, endTime);
    }
    constructor(details, agentDetails, tenantDetails, conversationId, sourceMetadata, parentContext, startTime, endTime) {
        super(api_1.SpanKind.INTERNAL, constants_1.OpenTelemetryConstants.EXECUTE_TOOL_OPERATION_NAME, `${constants_1.OpenTelemetryConstants.EXECUTE_TOOL_OPERATION_NAME} ${details.toolName}`, agentDetails, tenantDetails, parentContext, startTime, endTime);
        // Destructure the details object to match C# pattern
        const { toolName, arguments: args, toolCallId, description, toolType, endpoint } = details;
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_TOOL_NAME_KEY, toolName);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_TOOL_ARGS_KEY, args);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_TOOL_TYPE_KEY, toolType);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_TOOL_CALL_ID_KEY, toolCallId);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_TOOL_DESCRIPTION_KEY, description);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_CONVERSATION_ID_KEY, conversationId);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_NAME_KEY, sourceMetadata?.name);
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_DESCRIPTION_KEY, sourceMetadata?.description);
        // Set endpoint information if provided
        if (endpoint) {
            this.setTagMaybe(constants_1.OpenTelemetryConstants.SERVER_ADDRESS_KEY, endpoint.host);
            // Only record port if it is different from 443 (default HTTPS port)
            if (endpoint.port && endpoint.port !== 443) {
                this.setTagMaybe(constants_1.OpenTelemetryConstants.SERVER_PORT_KEY, endpoint.port);
            }
        }
    }
    /**
     * Records response information for telemetry tracking.
     * @param response The tool execution response
     */
    recordResponse(response) {
        this.setTagMaybe(constants_1.OpenTelemetryConstants.GEN_AI_EVENT_CONTENT, response);
    }
}
exports.ExecuteToolScope = ExecuteToolScope;
//# sourceMappingURL=ExecuteToolScope.js.map