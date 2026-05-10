/**
 * Research-with-Agent Orchestration Tool
 *
 * Spawns a background research sub-agent with web-search + fetch-url tools.
 * Same pattern as build-workflow-agent.tool.ts — returns immediately with a taskId.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { truncateLabel } from './display-utils';
import { RESEARCH_AGENT_PROMPT } from './research-agent-prompt';
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

export interface StartResearchAgentInput {
	goal: string;
	constraints?: string;
	conversationContext?: string;
	taskId?: string;
	agentId?: string;
	plannedTaskId?: string;
}

export interface StartedResearchAgentTask {
	result: string;
	taskId: string;
	agentId: string;
}

export async function startResearchAgentTask(
	context: OrchestrationContext,
	input: StartResearchAgentInput,
): Promise<StartedResearchAgentTask> {
	const researchTools: ToolsInput = {};
	if ('research' in context.domainTools) {
		researchTools.research = context.domainTools.research;
	}

	if (Object.keys(researchTools).length === 0) {
		return { result: 'Error: research tool not available.', taskId: '', agentId: '' };
	}

	if (!context.spawnBackgroundTask) {
		return { result: 'Error: background task support not available.', taskId: '', agentId: '' };
	}

	const subAgentId = input.agentId ?? `agent-researcher-${nanoid(6)}`;
	const taskId = input.taskId ?? `research-${nanoid(8)}`;

	const briefing = await buildSubAgentBriefing({
		task: input.goal,
		conversationContext: input.conversationContext,
		additionalContext: input.constraints ? `Constraints: ${input.constraints}` : undefined,
		runningTasks: context.getRunningTaskSummaries?.(),
	});
	const traceContext = await createDetachedSubAgentTracing(context, {
		agentId: subAgentId,
		role: 'web-researcher',
		kind: 'research',
		taskId,
		plannedTaskId: input.plannedTaskId,
		inputs: {
			goal: input.goal,
			constraints: input.constraints,
			conversationContext: input.conversationContext,
		},
	});
	const tracedResearchTools = traceSubAgentTools(context, researchTools, 'web-researcher');

	const spawnOutcome = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'web-researcher',
		traceContext,
		plannedTaskId: input.plannedTaskId,
		dedupeKey: { role: 'web-researcher', plannedTaskId: input.plannedTaskId },
		parentCheckpointId:
			context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
		run: async (signal, drainCorrections, waitForCorrection) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = new Agent({
					id: subAgentId,
					name: 'Web Research Agent',
					instructions: {
						role: 'system' as const,
						content: RESEARCH_AGENT_PROMPT,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					model: context.modelId,
					tools: tracedResearchTools,
				});
				mergeTraceRunInputs(
					traceContext?.actorRun,
					buildAgentTraceInputs({
						systemPrompt: RESEARCH_AGENT_PROMPT,
						tools: tracedResearchTools,
						modelId: context.modelId,
					}),
				);

				registerWithMastra(subAgentId, subAgent, context.storage);

				const traceParent = getTraceParentRun();
				return await withTraceParentContext(traceParent, async () => {
					const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
					const stream = await subAgent.stream(briefing, {
						maxSteps: MAX_STEPS.RESEARCH,
						abortSignal: signal,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
						...(llmStepTraceHooks?.executionOptions ?? {}),
					});

					const { text } = await consumeStreamWithHitl({
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
						llmStepTraceHooks,
					});

					return await text;
				});
			});
		},
	});

	if (spawnOutcome.status === 'duplicate') {
		return {
			result: `Research already in progress (task: ${spawnOutcome.existing.taskId}). Wait for the planned-task-follow-up — do not dispatch again.`,
			taskId: spawnOutcome.existing.taskId,
			agentId: spawnOutcome.existing.agentId,
		};
	}
	if (spawnOutcome.status === 'limit-reached') {
		return {
			result:
				'Could not start research: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
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
			role: 'web-researcher',
			tools: Object.keys(researchTools),
			taskId,
			kind: 'researcher',
			title: 'Researching',
			subtitle: truncateLabel(input.goal),
			goal: input.goal,
		},
	});

	return {
		result: `Research started (task: ${taskId}). Do NOT summarize the plan or list details.`,
		taskId,
		agentId: subAgentId,
	};
}

export const researchWithAgentInputSchema = z.object({
	goal: z
		.string()
		.describe(
			'What to research, e.g. "How does Shopify webhook authentication work ' +
				'and what scopes are needed for inventory updates?"',
		),
	constraints: z
		.string()
		.optional()
		.describe('Optional constraints, e.g. "Focus on REST API, not GraphQL"'),
	conversationContext: z
		.string()
		.optional()
		.describe(
			'Brief summary of the conversation so far — what was discussed, decisions made, and information gathered. The agent uses this to avoid repeating information the user already knows.',
		),
});

export function createResearchWithAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'research-with-agent',
		description:
			'Spawn a background research agent that searches the web and reads pages ' +
			'to answer a complex question. Returns immediately with a task ID — results ' +
			'arrive when the research completes. Use when the question requires multiple ' +
			'searches and page reads, or needs synthesis from several sources.',
		inputSchema: researchWithAgentInputSchema,
		outputSchema: z.object({
			result: z.string(),
			taskId: z.string(),
		}),
		execute: async (input: z.infer<typeof researchWithAgentInputSchema>) => {
			const result = await startResearchAgentTask(context, input);
			return await Promise.resolve({ result: result.result, taskId: result.taskId });
		},
	});
}
