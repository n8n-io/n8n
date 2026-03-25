import { TimeInput } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { InvokeAgentDetails, TenantDetails, CallerDetails, AgentDetails } from '../contracts';
import { ParentContext } from '../context/trace-context-propagation';
/**
 * Provides OpenTelemetry tracing scope for AI agent invocation operations.
 */
export declare class InvokeAgentScope extends OpenTelemetryScope {
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
    static start(invokeAgentDetails: InvokeAgentDetails, tenantDetails: TenantDetails, callerAgentDetails?: AgentDetails, callerDetails?: CallerDetails, parentContext?: ParentContext, startTime?: TimeInput, endTime?: TimeInput): InvokeAgentScope;
    private constructor();
    /**
     * Records response information for telemetry tracking.
     * @param response The invocation response
     */
    recordResponse(response: string): void;
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
}
//# sourceMappingURL=InvokeAgentScope.d.ts.map