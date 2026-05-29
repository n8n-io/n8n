/**
 * Preconfigured Eval Setup Agent Tool
 *
 * Creates a specialized sub-agent that reads an n8n workflow and patches it
 * with EvaluationTrigger + Evaluation nodes + a checkIfEvaluating gate to
 * isolate side-effect nodes during eval runs. DataTable creation is always
 * handled upstream by `propose` and passed in via the task spec.
 *
 * No HITL - the eval card already captured the user's approval; this sub-agent
 * operates post-approval.
 */

import { Agent, Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { createSubAgentPersistence } from './agent-persistence';
import { truncateLabel } from './display-utils';
import { EVAL_SETUP_AGENT_PROMPT } from './eval-setup-agent.prompt';
import {
	createDetachedSubAgentTraceFactory,
	traceSubAgentTools,
	withTraceContextActor,
} from './tracing-utils';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { MAX_STEPS } from '../../constants/max-steps';
import { consumeStreamWithHitl, requireCompletedHitlText } from '../../stream/consume-with-hitl';
import { createToolRegistry, toolRegistryKeys, toolRegistryValues } from '../../tool-registry';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../../tracing/langsmith-tracing';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';
import { createWorkflowsTool, type WorkflowAction } from '../workflows.tool';

const EVAL_SETUP_TOOL_NAMES = ['workflows', 'nodes'] as const;
const EVAL_SETUP_WORKFLOW_ACTIONS = [
	'get-json',
	'update-json',
] as const satisfies readonly WorkflowAction[];

/**
 * Build the eval-setup sub-agent's tool set.
 *
 * The `workflows` tool is overridden so update-gated workflow mutations do
 * not prompt again — the eval offer card already captured the user's approval
 * for adding eval nodes. If admin has blocked workflow updates outright
 * (`updateWorkflow: 'blocked'`), the original tool is left in place so the
 * sub-agent receives the standard `denied` result.
 */
export function buildEvalSetupTools(context: OrchestrationContext): InstanceAiToolRegistry {
	const tools = createToolRegistry();
	for (const name of EVAL_SETUP_TOOL_NAMES) {
		const tool = context.domainTools.get(name);
		if (tool) {
			tools.set(name, tool);
		}
	}

	const domainContext = context.domainContext;
	const parentPermissions = domainContext?.permissions;
	if (
		domainContext &&
		parentPermissions &&
		parentPermissions.updateWorkflow !== 'blocked' &&
		tools.has('workflows')
	) {
		tools.set(
			'workflows',
			createWorkflowsTool(
				{
					...domainContext,
					permissions: { ...parentPermissions, updateWorkflow: 'always_allow' },
				},
				{ allowedActions: EVAL_SETUP_WORKFLOW_ACTIONS },
			),
		);
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

export function startEvalSetupAgentTask(
	context: OrchestrationContext,
	input: StartEvalSetupAgentInput,
): StartedEvalSetupAgentTask {
	const evalSetupTools = buildEvalSetupTools(context);
	if (!evalSetupTools.has('workflows')) {
		return { result: 'Error: workflows tool not available.', taskId: '', agentId: '' };
	}
	if (!context.spawnBackgroundTask) {
		return { result: 'Error: background task support not available.', taskId: '', agentId: '' };
	}

	const subAgentId = input.agentId ?? `agent-evalsetup-${nanoid(6)}`;
	const taskId = input.taskId ?? `evalsetup-${nanoid(8)}`;

	const createTraceContext = createDetachedSubAgentTraceFactory(context, {
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

	const spawnOutcome = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'eval-setup',
		createTraceContext,
		plannedTaskId: input.plannedTaskId,
		dedupeKey: {
			role: 'eval-setup',
			workflowId: input.workflowId,
			plannedTaskId: input.plannedTaskId,
		},
		parentCheckpointId:
			context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
		run: async (signal, drainCorrections, waitForCorrection, { traceContext }) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = new Agent('Eval Setup Agent')
					.model(context.modelId)
					.instructions(EVAL_SETUP_AGENT_PROMPT, {
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					})
					.tool(toolRegistryValues(tracedEvalSetupTools))
					.checkpoint(context.checkpointStore ?? 'memory');
				const telemetry = traceContext?.getTelemetry?.({
					agentRole: 'eval-setup',
					functionId: 'instance-ai.subagent.eval-setup',
					executionMode: 'background_subagent',
					metadata: { agent_id: subAgentId, task_id: taskId },
				});
				if (telemetry) {
					subAgent.telemetry(telemetry);
				}
				mergeTraceRunInputs(
					traceContext?.actorRun,
					buildAgentTraceInputs({
						systemPrompt: EVAL_SETUP_AGENT_PROMPT,
						tools: tracedEvalSetupTools,
						modelId: context.modelId,
					}),
				);

				const briefing = await buildSubAgentBriefing({
					task: input.task,
					conversationContext: input.conversationContext,
					runningTasks: context.getRunningTaskSummaries?.(),
				});

				const persistence = await createSubAgentPersistence(context, { agentKind: 'eval-setup' });
				const stream = await subAgent.stream(briefing, {
					maxIterations: MAX_STEPS.EVAL_SETUP,
					abortSignal: signal,
					persistence,
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
					drainCorrections,
					waitForCorrection,
					maxIterations: MAX_STEPS.EVAL_SETUP,
					persistence,
				});

				return await requireCompletedHitlText(hitlResult, 'Eval setup sub-agent');
			});
		},
	});

	if (spawnOutcome.status === 'duplicate') {
		return {
			result: `Eval setup already in progress (task: ${spawnOutcome.existing.taskId}). Wait for the planned-task-follow-up — do not dispatch again.`,
			taskId: spawnOutcome.existing.taskId,
			agentId: spawnOutcome.existing.agentId,
		};
	}
	if (spawnOutcome.status === 'limit-reached') {
		return {
			result:
				'Could not start eval setup: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
			taskId: '',
			agentId: '',
		};
	}

	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'eval-setup',
			tools: toolRegistryKeys(evalSetupTools),
			taskId,
			kind: 'eval-setup',
			title: 'Setting up evaluations',
			subtitle: truncateLabel(input.task),
			goal: input.task,
			targetResource: { type: 'workflow' as const, id: input.workflowId },
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
	return new Tool('eval-setup-with-agent')
		.description(
			'Set up evaluations for a workflow containing AI agents. ' +
				'Adds EvaluationTrigger + Evaluation nodes with a checkIfEvaluating gate that isolates ' +
				'side-effect nodes during eval runs. The DataTable is always created upstream by `propose` ' +
				'and passed in via the task spec. ' +
				'Use only after `evals(action="propose")` returned shouldDelegateToEvalSetupAgent=true.',
		)
		.input(evalSetupAgentInputSchema)
		.output(
			z.object({
				result: z.string(),
				taskId: z.string(),
			}),
		)
		.handler(async (input: z.infer<typeof evalSetupAgentInputSchema>) => {
			const result = startEvalSetupAgentTask(context, input);
			return await Promise.resolve({ result: result.result, taskId: result.taskId });
		})
		.build();
}
