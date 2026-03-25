import { TimeInput } from '@opentelemetry/api';
import { OpenTelemetryScope } from './OpenTelemetryScope';
import { AgentDetails, TenantDetails, OutputResponse } from '../contracts';
import { ParentContext } from '../context/trace-context-propagation';
/**
 * Provides OpenTelemetry tracing scope for output message tracing with parent span linking.
 */
export declare class OutputScope extends OpenTelemetryScope {
    private _outputMessages;
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
    static start(response: OutputResponse, agentDetails: AgentDetails, tenantDetails: TenantDetails, parentContext?: ParentContext, startTime?: TimeInput, endTime?: TimeInput): OutputScope;
    private constructor();
    /**
     * Records the output messages for telemetry tracking.
     * Appends the provided messages to the accumulated output messages list.
     * @param messages Array of output messages to append.
     */
    recordOutputMessages(messages: string[]): void;
}
//# sourceMappingURL=OutputScope.d.ts.map