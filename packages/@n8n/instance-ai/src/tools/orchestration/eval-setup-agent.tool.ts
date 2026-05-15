/**
 * Preconfigured Eval Setup Agent Tool
 *
 * Creates a specialized sub-agent that reads an n8n workflow and patches it
 * with EvaluationTrigger + Evaluation nodes + a checkIfEvaluating gate to
 * isolate side-effect nodes during eval runs. DataTable creation is always
 * handled upstream by `propose` and passed in via the task spec.
 *
 * Pattern mirrors data-table-agent.tool.ts. No HITL - the eval card already
 * captured the user's approval; this sub-agent operates post-approval.
 */

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
import type { OrchestrationContext } from '../../types';
import { createWorkflowsTool } from '../workflows.tool';

const EVAL_SETUP_TOOL_NAMES = ['workflows', 'nodes'] as const;

/**
 * Build the eval-setup sub-agent's tool set.
 *
 * The `workflows` tool is overridden so its `update` action never prompts —
 * the eval offer card already captured the user's approval for adding eval
 * nodes, so a second confirmation here is redundant. If admin has blocked
 * workflow updates outright (`updateWorkflow: 'blocked'`), the original tool
 * is left in place so the sub-agent receives the standard `denied` result.
 */
export function buildEvalSetupTools(context: OrchestrationContext): ToolsInput {
	const tools: ToolsInput = {};
	for (const name of EVAL_SETUP_TOOL_NAMES) {
		if (name in context.domainTools) {
			tools[name] = context.domainTools[name];
		}
	}

	const domainContext = context.domainContext;
	const parentPermissions = domainContext?.permissions;
	if (
		domainContext &&
		parentPermissions &&
		parentPermissions.updateWorkflow !== 'blocked' &&
		'workflows' in tools
	) {
		tools.workflows = createWorkflowsTool({
			...domainContext,
			permissions: { ...parentPermissions, updateWorkflow: 'always_allow' },
		});
	}
	return tools;
}

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

export async function startEvalSetupAgentTask(
	context: OrchestrationContext,
	input: StartEvalSetupAgentInput,
): Promise<StartedEvalSetupAgentTask> {
	const evalSetupTools = buildEvalSetupTools(context);
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
			'Adds EvaluationTrigger + Evaluation nodes with a checkIfEvaluating gate that isolates ' +
			'side-effect nodes during eval runs. The DataTable is always created upstream by `propose` ' +
			'and passed in via the task spec. ' +
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
