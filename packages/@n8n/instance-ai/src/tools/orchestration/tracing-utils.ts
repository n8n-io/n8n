import type {
	InstanceAiTraceRun,
	InstanceAiTraceRunFinishOptions,
	OrchestrationContext,
} from '../../types';

interface StartSubAgentTraceOptions {
	agentId: string;
	role: string;
	kind: string;
	taskId?: string;
	plannedTaskId?: string;
	workItemId?: string;
	inputs?: unknown;
	metadata?: Record<string, unknown>;
}

export async function startSubAgentTrace(
	context: OrchestrationContext,
	options: StartSubAgentTraceOptions,
): Promise<InstanceAiTraceRun | undefined> {
	if (!context.tracing) return undefined;

	return await context.tracing.startChildRun(context.tracing.actorRun, {
		name: `agent: ${options.role}`,
		canonicalName: `instance-ai.subagent.${options.role}.stream`,
		tags: ['sub-agent'],
		metadata: {
			agent_role: options.role,
			agent_id: options.agentId,
			task_kind: options.kind,
			...(options.taskId ? { task_id: options.taskId } : {}),
			...(options.plannedTaskId ? { planned_task_id: options.plannedTaskId } : {}),
			...(options.workItemId ? { work_item_id: options.workItemId } : {}),
			...options.metadata,
		},
		inputs: options.inputs,
	});
}

export async function withTraceRun<T>(
	context: OrchestrationContext,
	traceRun: InstanceAiTraceRun | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	if (!traceRun || !context.tracing) {
		return await fn();
	}

	return await context.tracing.withActiveSpan(traceRun, fn);
}

export async function finishTraceRun(
	context: OrchestrationContext,
	traceRun: InstanceAiTraceRun | undefined,
	options?: InstanceAiTraceRunFinishOptions,
): Promise<void> {
	if (!traceRun || !context.tracing) return;
	await context.tracing.finishRun(traceRun, options);
}

export async function failTraceRun(
	context: OrchestrationContext,
	traceRun: InstanceAiTraceRun | undefined,
	error: unknown,
	metadata?: Record<string, unknown>,
): Promise<void> {
	if (!traceRun || !context.tracing) return;
	await context.tracing.failRun(traceRun, error, metadata);
}
