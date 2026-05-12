import type { ToolsInput } from '@mastra/core/agent';

import {
	createDetachedSubAgentTraceContext,
	mergeCurrentTraceMetadata,
} from '../../tracing/langsmith-tracing';
import type {
	InstanceAiTraceContext,
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

export async function createDetachedSubAgentTracing(
	context: OrchestrationContext,
	options: StartSubAgentTraceOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!context.tracing) return undefined;

	const messageId =
		typeof context.tracing.actorRun.metadata?.message_id === 'string'
			? context.tracing.actorRun.metadata.message_id
			: context.runId;
	const conversationId =
		typeof context.tracing.actorRun.metadata?.conversation_id === 'string'
			? context.tracing.actorRun.metadata.conversation_id
			: context.threadId;
	const spawnedByAgentId =
		typeof context.tracing.actorRun.metadata?.agent_id === 'string'
			? context.tracing.actorRun.metadata.agent_id
			: context.orchestratorAgentId;
	const tracing = await createDetachedSubAgentTraceContext({
		projectName: context.tracing.projectName,
		threadId: context.threadId,
		conversationId,
		messageGroupId: context.messageGroupId,
		messageId,
		runId: context.runId,
		userId: context.userId,
		modelId: context.modelId,
		input: options.inputs,
		metadata: options.metadata,
		agentId: options.agentId,
		role: options.role,
		kind: options.kind,
		taskId: options.taskId,
		plannedTaskId: options.plannedTaskId,
		workItemId: options.workItemId,
		spawnedByTraceId: context.tracing.rootRun.traceId,
		spawnedByRunId: context.tracing.actorRun.id,
		spawnedByAgentId,
		proxyConfig: context.tracingProxyConfig,
	});

	if (tracing) {
		mergeCurrentTraceMetadata({
			detached_trace: true,
			spawned_role: options.role,
			...(options.taskId ? { spawned_task_id: options.taskId } : {}),
			spawned_trace_id: tracing.rootRun.traceId,
			spawned_root_run_id: tracing.rootRun.id,
		});
	}

	return tracing;
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

export async function withTraceContextActor<T>(
	tracing: InstanceAiTraceContext | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	if (!tracing) {
		return await fn();
	}

	return await tracing.withRunTree(tracing.actorRun, fn);
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
