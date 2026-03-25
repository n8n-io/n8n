import { TimeInput } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { ToolCallDetails, AgentDetails, TenantDetails, SourceMetadata } from '../contracts';
import { ParentContext } from '../context/trace-context-propagation';
/**
 * Provides OpenTelemetry tracing scope for AI tool execution operations.
 */
export declare class ExecuteToolScope extends OpenTelemetryScope {
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
    static start(details: ToolCallDetails, agentDetails: AgentDetails, tenantDetails: TenantDetails, conversationId?: string, sourceMetadata?: Pick<SourceMetadata, "name" | "description">, parentContext?: ParentContext, startTime?: TimeInput, endTime?: TimeInput): ExecuteToolScope;
    private constructor();
    /**
     * Records response information for telemetry tracking.
     * @param response The tool execution response
     */
    recordResponse(response: string): void;
}
//# sourceMappingURL=ExecuteToolScope.d.ts.map