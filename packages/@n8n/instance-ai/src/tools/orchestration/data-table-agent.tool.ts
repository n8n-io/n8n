/**
 * Preconfigured Data Table Agent Tool
 *
 * Creates a focused sub-agent for data table management (CRUD on tables,
 * columns, and rows). Uses consumeStreamWithHitl for HITL on destructive
 * operations (delete-data-table, delete-data-table-rows).
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { DATA_TABLE_AGENT_PROMPT } from './data-table-agent.prompt';
import { truncateLabel } from './display-utils';
import {
	createDetachedSubAgentTracing,
	traceSubAgentTools,
	withTraceContextActor,
} from './tracing-utils';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { MAX_STEPS } from '../../constants/max-steps';
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import {
	buildAgentTraceInputs,
	getTraceParentRun,
	mergeTraceRunInputs,
	withTraceParentContext,
} from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';

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
	const dataTableTools: ToolsInput = {};
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

	context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'data-table-manager',
		traceContext,
		plannedTaskId: input.plannedTaskId,
		run: async (signal, _drainCorrections, _waitForCorrection) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = new Agent({
					id: subAgentId,
					name: 'Data Table Agent',
					instructions: {
						role: 'system' as const,
						content: DATA_TABLE_AGENT_PROMPT,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					model: context.modelId,
					tools: tracedDataTableTools,
				});
				mergeTraceRunInputs(
					traceContext?.actorRun,
					buildAgentTraceInputs({
						systemPrompt: DATA_TABLE_AGENT_PROMPT,
						tools: tracedDataTableTools,
						modelId: context.modelId,
					}),
				);

				registerWithMastra(subAgentId, subAgent, context.storage);

				const briefing = await buildSubAgentBriefing({
					task: input.task,
					conversationContext: input.conversationContext,
					runningTasks: context.getRunningTaskSummaries?.(),
				});

				const traceParent = getTraceParentRun();
				return await withTraceParentContext(traceParent, async () => {
					const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
					const stream = await subAgent.stream(briefing, {
						maxSteps: MAX_STEPS.DATA_TABLE,
						abortSignal: signal,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
						...(llmStepTraceHooks?.executionOptions ?? {}),
					});

					const hitlResult = await consumeStreamWithHitl({
						agent: subAgent,
						stream: stream as {
							runId?: string;
							fullStream: AsyncIterable<unknown>;
							text: Promise<string>;
						},
						runId: context.runId,
						agentId: subAgentId,
						eventBus: context.eventBus,
						logger: context.logger,
						threadId: context.threadId,
						abortSignal: signal,
						waitForConfirmation: context.waitForConfirmation,
						llmStepTraceHooks,
					});

					return await hitlResult.text;
				});
			});
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
	return createTool({
		id: 'manage-data-tables-with-agent',
		description:
			'Manage data tables using a specialized agent. ' +
			'The agent handles listing, creating, deleting tables, modifying schemas, ' +
			'and querying/inserting/updating/deleting rows.',
		inputSchema: dataTableAgentInputSchema,
		outputSchema: z.object({
			result: z.string(),
			taskId: z.string(),
		}),
		execute: async (input: z.infer<typeof dataTableAgentInputSchema>) => {
			const result = await startDataTableAgentTask(context, input);
			return await Promise.resolve({ result: result.result, taskId: result.taskId });
		},
	});
}
