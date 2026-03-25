import { TimeInput } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { InferenceDetails, AgentDetails, TenantDetails, SourceMetadata } from '../contracts';
import { ParentContext } from '../context/trace-context-propagation';
/**
 * Provides OpenTelemetry tracing scope for generative AI inference operations.
 */
export declare class InferenceScope extends OpenTelemetryScope {
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
    static start(details: InferenceDetails, agentDetails: AgentDetails, tenantDetails: TenantDetails, conversationId?: string, sourceMetadata?: Pick<SourceMetadata, "name" | "description">, parentContext?: ParentContext, startTime?: TimeInput, endTime?: TimeInput): InferenceScope;
    private constructor();
    /**
     * Records the input messages for telemetry tracking.
     * @param messages Array of input messages
     */
    recordInputMessages(messages: string[]): void;
    /**
     * Records the output messages for telemetry tracking.
     * @param messages Array of output messages
     */
    recordOutputMessages(messages: string[]): void;
    /**
     * Records the number of input tokens for telemetry tracking.
     * @param inputTokens Number of input tokens
     */
    recordInputTokens(inputTokens: number): void;
    /**
     * Records the number of output tokens for telemetry tracking.
     * @param outputTokens Number of output tokens
     */
    recordOutputTokens(outputTokens: number): void;
    /**
     * Records the response id for telemetry tracking.
     * @param responseId The response ID
     */
    recordResponseId(responseId: string): void;
    /**
     * Records the finish reasons for telemetry tracking.
     * @param finishReasons Array of finish reasons
     */
    recordFinishReasons(finishReasons: string[]): void;
}
//# sourceMappingURL=InferenceScope.d.ts.map