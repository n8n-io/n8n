/**
 * Preconfigured Data Table Agent Tool
 *
 * Creates a focused sub-agent for data table management (CRUD on tables,
 * columns, and rows). Uses consumeStreamWithHitl for HITL on destructive
 * operations (delete-data-table, delete-data-table-rows).
 */

import { Agent, Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { DATA_TABLE_AGENT_PROMPT } from './data-table-agent.prompt';
import { truncateLabel } from './display-utils';
import {
	createDetachedSubAgentTracing,
	traceSubAgentTools,
	withTraceContextActor,
} from './tracing-utils';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { MAX_STEPS } from '../../constants/max-steps';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../../tracing/langsmith-tracing';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';

const DATA_TABLE_TOOL_NAME = 'data-tables';

export interface StartDataTableAgentInput {
	task: string;
	conversationContext?: string;
	taskId?: string;
	agentId?: string;
	plannedTaskId?: string;
}

export interface StartedBackgroundAgentTask {
	result: string;
	taskId: string;
	agentId: string;
}

export async function startDataTableAgentTask(
	context: OrchestrationContext,
	input: StartDataTableAgentInput,
): Promise<StartedBackgroundAgentTask> {
	// Grab the consolidated data-tables tool (and parse-file if available) from domain tools
	const dataTableTools: InstanceAiToolRegistry = {};
	if (DATA_TABLE_TOOL_NAME in context.domainTools) {
		dataTableTools[DATA_TABLE_TOOL_NAME] = context.domainTools[DATA_TABLE_TOOL_NAME];
	}
	if ('parse-file' in context.domainTools) {
		dataTableTools['parse-file'] = context.domainTools['parse-file'];
	}

	if (!(DATA_TABLE_TOOL_NAME in dataTableTools)) {
		return { result: 'Error: data-tables tool not available.', taskId: '', agentId: '' };
	}

	if (!context.spawnBackgroundTask) {
		return { result: 'Error: background task support not available.', taskId: '', agentId: '' };
	}

	const subAgentId = input.agentId ?? `agent-datatable-${nanoid(6)}`;
	const taskId = input.taskId ?? `datatable-${nanoid(8)}`;

	const traceContext = await createDetachedSubAgentTracing(context, {
		agentId: subAgentId,
		role: 'data-table-manager',
		kind: 'data-table',
		taskId,
		plannedTaskId: input.plannedTaskId,
		inputs: {
			task: input.task,
			conversationContext: input.conversationContext,
		},
	});
	const tracedDataTableTools = traceSubAgentTools(context, dataTableTools, 'data-table-manager');

	const spawnOutcome = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'data-table-manager',
		traceContext,
		plannedTaskId: input.plannedTaskId,
		dedupeKey: { role: 'data-table-manager', plannedTaskId: input.plannedTaskId },
		parentCheckpointId:
			context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
		run: async (signal, _drainCorrections, _waitForCorrection) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = new Agent('Data Table Agent')
					.model(context.modelId)
					.instructions(DATA_TABLE_AGENT_PROMPT, {
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					})
					.tool(Object.values(tracedDataTableTools))
					.checkpoint(context.checkpointStore ?? 'memory');
				const telemetry = traceContext?.getTelemetry?.({
					agentRole: 'data-table-manager',
					functionId: 'instance-ai.subagent.data-table-manager',
					executionMode: 'background_subagent',
					metadata: { agent_id: subAgentId, task_id: taskId },
				});
				if (telemetry) {
					subAgent.telemetry(telemetry);
				}
				mergeTraceRunInputs(
					traceContext?.actorRun,
					buildAgentTraceInputs({
						systemPrompt: DATA_TABLE_AGENT_PROMPT,
						tools: tracedDataTableTools,
						modelId: context.modelId,
					}),
				);

				const briefing = await buildSubAgentBriefing({
					task: input.task,
					conversationContext: input.conversationContext,
					runningTasks: context.getRunningTaskSummaries?.(),
				});

				const stream = await subAgent.stream(briefing, {
					maxIterations: MAX_STEPS.DATA_TABLE,
					abortSignal: signal,
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
				});

				const hitlResult = await consumeStreamWithHitl({
					agent: subAgent,
					stream,
					runId: context.runId,
					agentId: subAgentId,
					eventBus: context.eventBus,
					logger: context.logger,
					threadId: context.threadId,
					abortSignal: signal,
					waitForConfirmation: context.waitForConfirmation,
					maxIterations: MAX_STEPS.DATA_TABLE,
				});

				return await hitlResult.text;
			});
		},
	});

	if (spawnOutcome.status === 'duplicate') {
		return {
			result: `Data table operation already in progress (task: ${spawnOutcome.existing.taskId}). Wait for the planned-task-follow-up — do not dispatch again.`,
			taskId: spawnOutcome.existing.taskId,
			agentId: spawnOutcome.existing.agentId,
		};
	}
	if (spawnOutcome.status === 'limit-reached') {
		return {
			result:
				'Could not start data table operation: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
			taskId: '',
			agentId: '',
		};
	}

	// Spawn confirmed — publish the UI event now so duplicate/limit-reached
	// rejections above don't leave a phantom card on the chat surface.
	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'data-table-manager',
			tools: Object.keys(dataTableTools),
			taskId,
			kind: 'data-table',
			title: 'Managing data table',
			subtitle: truncateLabel(input.task),
			goal: input.task,
			targetResource: { type: 'data-table' as const },
		},
	});

	return {
		result: `Data table operation started (task: ${taskId}). Do NOT summarize the plan or list details.`,
		taskId,
		agentId: subAgentId,
	};
}

export const dataTableAgentInputSchema = z.object({
	task: z
		.string()
		.describe(
			'What to do: describe the data table operation. Include table names, column details, data to insert, or query criteria.',
		),
	conversationContext: z
		.string()
		.optional()
		.describe(
			'Brief summary of the conversation so far — what was discussed, decisions made, and information gathered. The agent uses this to avoid repeating information the user already knows.',
		),
});

export function createDataTableAgentTool(context: OrchestrationContext) {
	return new Tool('manage-data-tables-with-agent')
		.description(
			'Manage data tables using a specialized agent. ' +
				'The agent handles listing, creating, deleting tables, modifying schemas, ' +
				'and querying/inserting/updating/deleting rows.',
		)
		.input(dataTableAgentInputSchema)
		.output(
			z.object({
				result: z.string(),
				taskId: z.string(),
			}),
		)
		.handler(async (input: z.infer<typeof dataTableAgentInputSchema>) => {
			const result = await startDataTableAgentTask(context, input);
			return await Promise.resolve({ result: result.result, taskId: result.taskId });
		})
		.build();
}
