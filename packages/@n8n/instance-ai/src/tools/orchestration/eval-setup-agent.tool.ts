import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { truncateLabel } from './display-utils';
import { EVAL_SETUP_AGENT_PROMPT } from './eval-setup-agent.prompt';
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
import type { InstanceAiContext, OrchestrationContext } from '../../types';

const EVAL_SETUP_TOOL_NAMES = ['workflows', 'nodes'] as const;

const emptyEvalDataTableInputSchema = z.object({
	name: z.string().min(1).max(128).describe('Name for the empty eval DataTable'),
	projectId: z.string().optional().describe('Project ID where the table should be created'),
	columns: z
		.array(z.string().min(1))
		.min(1)
		.describe('String columns to create. Do not include actual_* output columns.'),
});

export interface StartEvalSetupAgentInput {
	workflowId: string;
	task: string;
	conversationContext?: string;
	taskId?: string;
	agentId?: string;
	plannedTaskId?: string;
}

export interface StartedEvalSetupAgentTask {
	result: string;
	taskId: string;
	agentId: string;
}

function isNameConflictError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /already exists/i.test(message);
}

async function createEmptyEvalDataTable(
	context: InstanceAiContext,
	input: z.infer<typeof emptyEvalDataTableInputSchema>,
) {
	const columns = [...new Set(input.columns)].map((name) => ({ name, type: 'string' as const }));
	const options = input.projectId ? { projectId: input.projectId } : undefined;
	try {
		return await context.dataTableService.create(input.name, columns, options);
	} catch (error) {
		if (!isNameConflictError(error)) throw error;
		const suffixedName = `${input.name} (${nanoid(5)})`;
		return await context.dataTableService.create(suffixedName, columns, options);
	}
}

export function createEmptyEvalDataTableTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-empty-eval-data-table',
		description:
			'Create an empty DataTable for eval setup. This tool creates only schema columns and never inserts, updates, or deletes rows.',
		inputSchema: emptyEvalDataTableInputSchema,
		outputSchema: z.object({
			table: z.object({
				id: z.string(),
				name: z.string(),
				projectId: z.string().optional(),
				columns: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						type: z.string(),
					}),
				),
			}),
		}),
		execute: async (input: z.infer<typeof emptyEvalDataTableInputSchema>) => {
			const table = await createEmptyEvalDataTable(context, input);
			return { table };
		},
	});
}

export async function startEvalSetupAgentTask(
	context: OrchestrationContext,
	input: StartEvalSetupAgentInput,
): Promise<StartedEvalSetupAgentTask> {
	const evalSetupTools: ToolsInput = {};
	for (const name of EVAL_SETUP_TOOL_NAMES) {
		if (name in context.domainTools) {
			evalSetupTools[name] = context.domainTools[name];
		}
	}
	if (context.domainContext) {
		evalSetupTools['create-empty-eval-data-table'] = createEmptyEvalDataTableTool(
			context.domainContext,
		);
	}
	if (!('workflows' in evalSetupTools)) {
		return { result: 'Error: workflows tool not available.', taskId: '', agentId: '' };
	}
	if (!context.spawnBackgroundTask) {
		return { result: 'Error: background task support not available.', taskId: '', agentId: '' };
	}

	const subAgentId = input.agentId ?? `agent-evalsetup-${nanoid(6)}`;
	const taskId = input.taskId ?? `evalsetup-${nanoid(8)}`;

	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'eval-setup',
			tools: Object.keys(evalSetupTools),
			taskId,
			kind: 'eval-setup',
			title: 'Setting up evaluations',
			subtitle: truncateLabel(input.task),
			goal: input.task,
			targetResource: { type: 'workflow' as const, id: input.workflowId },
		},
	});
	const traceContext = await createDetachedSubAgentTracing(context, {
		agentId: subAgentId,
		role: 'eval-setup',
		kind: 'eval-setup',
		taskId,
		plannedTaskId: input.plannedTaskId,
		inputs: {
			workflowId: input.workflowId,
			task: input.task,
			conversationContext: input.conversationContext,
		},
	});
	const tracedEvalSetupTools = traceSubAgentTools(context, evalSetupTools, 'eval-setup');

	context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'eval-setup',
		traceContext,
		plannedTaskId: input.plannedTaskId,
		run: async (signal, _drainCorrections, _waitForCorrection) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = new Agent({
					id: subAgentId,
					name: 'Eval Setup Agent',
					instructions: {
						role: 'system' as const,
						content: EVAL_SETUP_AGENT_PROMPT,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					model: context.modelId,
					tools: tracedEvalSetupTools,
				});
				mergeTraceRunInputs(
					traceContext?.actorRun,
					buildAgentTraceInputs({
						systemPrompt: EVAL_SETUP_AGENT_PROMPT,
						tools: tracedEvalSetupTools,
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
						maxSteps: MAX_STEPS.EVAL_SETUP,
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
		result: `Eval setup started (task: ${taskId}). Reply with one short sentence. Do NOT summarize the plan or list details.`,
		taskId,
		agentId: subAgentId,
	};
}

export const evalSetupAgentInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow to add evaluations to'),
	task: z
		.string()
		.describe(
			'Full task description for the eval setup agent: includes dataset choice, output columns, metrics to configure, and detected AI agent nodes. Pass the exact string returned by `evals(action="propose")` — do not rephrase.',
		),
	conversationContext: z
		.string()
		.optional()
		.describe(
			"Summary of the thread so far, especially the user's original workflow request. The sub-agent uses this to anchor the domain for dataset design.",
		),
});

export function createEvalSetupAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'eval-setup-with-agent',
		description:
			'Set up evaluations for a workflow containing AI agents. ' +
			'Creates an empty eval DataTable (when requested) and adds EvaluationTrigger + Evaluation nodes ' +
			'with a checkIfEvaluating gate that isolates side-effect nodes during eval runs. ' +
			'Use only after `evals(action="propose")` returned shouldDelegateToEvalSetupAgent=true.',
		inputSchema: evalSetupAgentInputSchema,
		outputSchema: z.object({
			result: z.string(),
			taskId: z.string(),
		}),
		execute: async (input: z.infer<typeof evalSetupAgentInputSchema>) => {
			const result = await startEvalSetupAgentTask(context, input);
			return await Promise.resolve({ result: result.result, taskId: result.taskId });
		},
	});
}
