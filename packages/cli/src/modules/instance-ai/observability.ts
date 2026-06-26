import type { InstanceAiTraceContext } from '@n8n/instance-ai';

export type InstanceAiObservabilityContext = {
	threadId: string;
	runId: string;
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
		runId: context.runId,
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
