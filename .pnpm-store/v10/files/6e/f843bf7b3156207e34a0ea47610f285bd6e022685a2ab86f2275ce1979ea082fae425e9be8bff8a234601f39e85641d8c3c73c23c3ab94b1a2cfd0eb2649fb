// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { SpanKind } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { OpenTelemetryConstants } from '../constants';
/**
 * Provides OpenTelemetry tracing scope for AI agent invocation operations.
 */
export class InvokeAgentScope extends OpenTelemetryScope {
    /**
     * Creates and starts a new scope for agent invocation tracing.
     * @param invokeAgentDetails The details of the agent invocation including endpoint, agent information, and conversation context.
     * @param tenantDetails The tenant details.
     * @param callerAgentDetails The details of the caller agent.
     * @param callerDetails The details of the non-agentic caller.
     * @param parentContext Optional parent context for cross-async-boundary tracing.
     *   Accepts a ParentSpanRef (manual traceId/spanId) or an OTel Context (e.g. from extractTraceContext).
     * @param startTime Optional explicit start time (ms epoch, Date, or HrTime).
     * @param endTime Optional explicit end time (ms epoch, Date, or HrTime).
     * @returns A new InvokeAgentScope instance.
     */
    static start(invokeAgentDetails, tenantDetails, callerAgentDetails, callerDetails, parentContext, startTime, endTime) {
        return new InvokeAgentScope(invokeAgentDetails, tenantDetails, callerAgentDetails, callerDetails, parentContext, startTime, endTime);
    }
    constructor(invokeAgentDetails, tenantDetails, callerAgentDetails, callerDetails, parentContext, startTime, endTime) {
        super(SpanKind.CLIENT, OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME, invokeAgentDetails.agentName
            ? `${OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME} ${invokeAgentDetails.agentName}`
            : OpenTelemetryConstants.INVOKE_AGENT_OPERATION_NAME, invokeAgentDetails, tenantDetails, parentContext, startTime, endTime);
        // Set session ID and endpoint information
        this.setTagMaybe(OpenTelemetryConstants.SESSION_ID_KEY, invokeAgentDetails.sessionId);
        if (invokeAgentDetails.endpoint) {
            this.setTagMaybe(OpenTelemetryConstants.SERVER_ADDRESS_KEY, invokeAgentDetails.endpoint.host);
            // Only record port if it is different from 443 (default HTTPS port)
            if (invokeAgentDetails.endpoint.port && invokeAgentDetails.endpoint.port !== 443) {
                this.setTagMaybe(OpenTelemetryConstants.SERVER_PORT_KEY, invokeAgentDetails.endpoint.port);
            }
        }
        // Set request-related tags
        const requestToUse = invokeAgentDetails.request;
        if (requestToUse) {
            if (requestToUse.executionType) {
                this.setTagMaybe(OpenTelemetryConstants.GEN_AI_EXECUTION_TYPE_KEY, requestToUse.executionType.toString());
            }
            if (requestToUse.sourceMetadata) {
                this.setTagMaybe(OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_ID_KEY, requestToUse.sourceMetadata.id);
                this.setTagMaybe(OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_NAME_KEY, requestToUse.sourceMetadata.name);
                this.setTagMaybe(OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_DESCRIPTION_KEY, requestToUse.sourceMetadata.description);
            }
        }
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CONVERSATION_ID_KEY, invokeAgentDetails.conversationId);
        // Set caller details tags
        if (callerDetails) {
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_ID_KEY, callerDetails.callerId);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_UPN_KEY, callerDetails.callerUpn);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_NAME_KEY, callerDetails.callerName);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_TENANT_ID_KEY, callerDetails.tenantId);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_CLIENT_IP_KEY, callerDetails.callerClientIp);
        }
        // Set caller agent details tags
        if (callerAgentDetails) {
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_NAME_KEY, callerAgentDetails.agentName);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_ID_KEY, callerAgentDetails.agentId);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_TYPE_KEY, callerAgentDetails.agentType);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_APPLICATION_ID_KEY, callerAgentDetails.agentBlueprintId);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_USER_ID_KEY, callerAgentDetails.agentAUID);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_UPN_KEY, callerAgentDetails.agentUPN);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_TENANT_ID_KEY, callerAgentDetails.tenantId);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_CLIENT_IP_KEY, callerAgentDetails.agentClientIP);
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CALLER_AGENT_PLATFORM_ID_KEY, callerAgentDetails.platformId);
        }
    }
    /**
     * Records response information for telemetry tracking.
     * @param response The invocation response
     */
    recordResponse(response) {
        this.recordOutputMessages([response]);
    }
    /**
     * Records the input messages for telemetry tracking.
     * @param messages Array of input messages
     */
    recordInputMessages(messages) {
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_INPUT_MESSAGES_KEY, messages.join(','));
    }
    /**
     * Records the output messages for telemetry tracking.
     * @param messages Array of output messages
     */
    recordOutputMessages(messages) {
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_OUTPUT_MESSAGES_KEY, messages.join(','));
    }
}
//# sourceMappingURL=InvokeAgentScope.js.map