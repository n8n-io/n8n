import { isEndpointModelConfig, modelConfigId } from '@n8n/instance-ai';
import type { InstanceAiTraceContext, ModelConfig } from '@n8n/instance-ai';

export type InstanceAiObservabilityContext = {
	threadId: string;
	runId?: string;
	projectId?: string;
	tracing?: InstanceAiTraceContext;
	agentId?: string;
	userId?: string;
	messageGroupId?: string;
	messageId?: string;
	taskId?: string;
	role?: string;
};

export function buildInstanceAiObservabilityContext(
	context: InstanceAiObservabilityContext,
): Record<string, string> {
	return {
		source: 'instance-ai',
		threadId: context.threadId,
		...(context.runId ? { runId: context.runId } : {}),
		...(context.projectId ? { projectId: context.projectId } : {}),
		...(context.tracing?.rootRun?.otelTraceId
			? { traceId: context.tracing.rootRun.otelTraceId }
			: {}),
		...(context.tracing?.rootRun?.traceId
			? { langsmithTraceId: context.tracing.rootRun.traceId }
			: {}),
		...(context.agentId ? { agentId: context.agentId } : {}),
		...(context.userId ? { userId: context.userId } : {}),
		...(context.messageGroupId ? { messageGroupId: context.messageGroupId } : {}),
		...(context.messageId ? { messageId: context.messageId } : {}),
		...(context.taskId ? { taskId: context.taskId } : {}),
		...(context.role ? { role: context.role } : {}),
	};
}

/**
 * `model` is a Prometheus label on the Instance AI run metrics, so it has to stay
 * low-cardinality. Managed models (built-in ids and the pre-built AI SDK
 * instances the proxy hands over) come from a fixed set and are reported as-is;
 * a user-configured endpoint's model id is free-form, so it collapses to 'custom'.
 */
export function runMetricsModelLabel(modelId: ModelConfig | undefined): string {
	if (modelId === undefined || isEndpointModelConfig(modelId)) return 'custom';
	return modelConfigId(modelId) ?? 'custom';
}
