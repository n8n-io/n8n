import type { AttributeValue, BuiltTelemetry } from '@n8n/agents';
import { Telemetry } from '@n8n/agents';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { trace } from '@opentelemetry/api';

const AGENTS_TRACER_NAME = '@n8n/agents';

interface AgentRunTracingMetadataBase {
	agentId: string;
	projectId: string;
	threadId: string;
	userId?: string;
	modelId?: string;
}

interface WorkflowAgentRunTracingMetadata extends AgentRunTracingMetadataBase {
	source: 'workflow';
	executionId?: string;
	workflowId?: string;
	nodeId?: string;
}

interface NonWorkflowAgentRunTracingMetadata extends AgentRunTracingMetadataBase {
	// Chat integrations are dynamically registered (ChatIntegrationRegistry),
	// so this stays an open string rather than a fixed literal set.
	source: string;
}

export type AgentRunTracingMetadata =
	| WorkflowAgentRunTracingMetadata
	| NonWorkflowAgentRunTracingMetadata;

// A plain `metadata.source === 'workflow'` check wouldn't narrow the union here
// — NonWorkflowAgentRunTracingMetadata's `source: string` isn't excluded by
// TS's control-flow analysis just because the compared value is a wider type.
// A type predicate sidesteps that.
function isWorkflowTracingMetadata(
	metadata: AgentRunTracingMetadata,
): metadata is WorkflowAgentRunTracingMetadata {
	return metadata.source === 'workflow';
}

/**
 * Builds the per-run OTel telemetry handed to an agent run, riding along with
 * the workflow OTel module's already-registered global tracer provider — this
 * service never creates, registers, or shuts down a provider itself.
 */
@Service()
export class AgentRunTracingService {
	constructor(private readonly agentsConfig: AgentsConfig) {}

	/** Whether agent tracing is enabled — lets callers skip tracing-only work (e.g. a DB lookup) upfront. */
	get enabled(): boolean {
		return this.agentsConfig.tracingEnabled;
	}

	/**
	 * Returns undefined when agent tracing is disabled — callers omit
	 * `ExecutionOptions.telemetry` entirely in that case, indistinguishable
	 * from "OTel module off" to the SDK (both are no-ops).
	 *
	 * Fetches the tracer fresh on every call rather than caching it: a tracer
	 * obtained before any provider is registered would otherwise go stale
	 * across an OTel module restart. Fetching fresh sidesteps that entirely.
	 */
	async build(metadata: AgentRunTracingMetadata): Promise<BuiltTelemetry | undefined> {
		if (!this.agentsConfig.tracingEnabled) return undefined;

		const attributes: Record<string, AttributeValue> = {
			agent_id: metadata.agentId,
			project_id: metadata.projectId,
			thread_id: metadata.threadId,
			source: metadata.source,
			...(metadata.userId ? { user_id: metadata.userId } : {}),
			...(metadata.modelId ? { model_id: metadata.modelId } : {}),
			...(isWorkflowTracingMetadata(metadata)
				? {
						...(metadata.executionId ? { execution_id: metadata.executionId } : {}),
						...(metadata.workflowId ? { workflow_id: metadata.workflowId } : {}),
						...(metadata.nodeId ? { node_id: metadata.nodeId } : {}),
					}
				: {}),
		};

		return await new Telemetry()
			.tracer(trace.getTracer(AGENTS_TRACER_NAME))
			.metadata(attributes)
			.recordInputs(this.agentsConfig.tracingRecordInputs)
			.recordOutputs(this.agentsConfig.tracingRecordOutputs)
			.build();
	}
}

/** Format an agent snapshot's model as `provider/name`, or undefined if either is missing. */
export function modelIdFromSnapshot(model: {
	provider: string | null;
	name: string | null;
}): string | undefined {
	return model.provider && model.name ? `${model.provider}/${model.name}` : undefined;
}
