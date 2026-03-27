import type { ToolsInput } from '@mastra/core/agent';

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

	return await context.tracing.startChildRun(context.tracing.orchestratorRun, {
		name: `subagent:${options.role}`,
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

export function traceSubAgentTools(
	context: OrchestrationContext,
	tools: ToolsInput,
	role: string,
): ToolsInput {
	return (
		context.tracing?.wrapTools(tools, {
			agentRole: role,
			tags: ['sub-agent'],
		}) ?? tools
	);
}

export async function withTraceRun<T>(
	context: OrchestrationContext,
	traceRun: InstanceAiTraceRun | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	if (!traceRun || !context.tracing) {
		return await fn();
	}

	return await context.tracing.withRunTree(traceRun, fn);
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
