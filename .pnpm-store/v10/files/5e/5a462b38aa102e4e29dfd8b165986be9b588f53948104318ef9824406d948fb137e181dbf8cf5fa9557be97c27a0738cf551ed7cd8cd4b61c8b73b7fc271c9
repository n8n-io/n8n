// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { SpanKind } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { OpenTelemetryConstants } from '../constants';
/**
 * Provides OpenTelemetry tracing scope for generative AI inference operations.
 */
export class InferenceScope extends OpenTelemetryScope {
    /**
     * Creates and starts a new scope for inference tracing.
     * @param details The inference call details
     * @param agentDetails The agent details
     * @param tenantDetails The tenant details
     * @param conversationId Optional conversation id to tag on the span (`gen_ai.conversation.id`).
     * @param sourceMetadata Optional source metadata; only `name` (channel name) and `description` (channel link/URL) are used for tagging.
     * @param parentContext Optional parent context for cross-async-boundary tracing.
     *   Accepts a ParentSpanRef (manual traceId/spanId) or an OTel Context (e.g. from extractTraceContext).
     * @param startTime Optional explicit start time (ms epoch, Date, or HrTime).
     * @param endTime Optional explicit end time (ms epoch, Date, or HrTime).
     * @returns A new InferenceScope instance
     */
    static start(details, agentDetails, tenantDetails, conversationId, sourceMetadata, parentContext, startTime, endTime) {
        return new InferenceScope(details, agentDetails, tenantDetails, conversationId, sourceMetadata, parentContext, startTime, endTime);
    }
    constructor(details, agentDetails, tenantDetails, conversationId, sourceMetadata, parentContext, startTime, endTime) {
        super(SpanKind.CLIENT, details.operationName.toString(), `${details.operationName} ${details.model}`, agentDetails, tenantDetails, parentContext, startTime, endTime);
        // Set core inference information matching C# implementation
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_OPERATION_NAME_KEY, details.operationName.toString());
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_REQUEST_MODEL_KEY, details.model);
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_PROVIDER_NAME_KEY, details.providerName);
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_USAGE_INPUT_TOKENS_KEY, details.inputTokens?.toString());
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_USAGE_OUTPUT_TOKENS_KEY, details.outputTokens?.toString());
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_RESPONSE_FINISH_REASONS_KEY, details.finishReasons?.join(','));
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_RESPONSE_ID_KEY, details.responseId);
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_CONVERSATION_ID_KEY, conversationId);
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_NAME_KEY, sourceMetadata?.name);
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_DESCRIPTION_KEY, sourceMetadata?.description);
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
    /**
     * Records the number of input tokens for telemetry tracking.
     * @param inputTokens Number of input tokens
     */
    recordInputTokens(inputTokens) {
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_USAGE_INPUT_TOKENS_KEY, inputTokens.toString());
    }
    /**
     * Records the number of output tokens for telemetry tracking.
     * @param outputTokens Number of output tokens
     */
    recordOutputTokens(outputTokens) {
        this.setTagMaybe(OpenTelemetryConstants.GEN_AI_USAGE_OUTPUT_TOKENS_KEY, outputTokens.toString());
    }
    /**
     * Records the response id for telemetry tracking.
     * @param responseId The response ID
     */
    recordResponseId(responseId) {
        if (responseId && responseId.trim()) {
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_RESPONSE_ID_KEY, responseId);
        }
    }
    /**
     * Records the finish reasons for telemetry tracking.
     * @param finishReasons Array of finish reasons
     */
    recordFinishReasons(finishReasons) {
        if (finishReasons && finishReasons.length > 0) {
            this.setTagMaybe(OpenTelemetryConstants.GEN_AI_RESPONSE_FINISH_REASONS_KEY, finishReasons.join(','));
        }
    }
}
//# sourceMappingURL=InferenceScope.js.map