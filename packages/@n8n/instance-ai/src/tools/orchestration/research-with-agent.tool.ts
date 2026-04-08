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
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import {
	buildAgentTraceInputs,
	getTraceParentRun,
	mergeTraceRunInputs,
	withTraceParentContext,
} from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';

const RESEARCH_MAX_STEPS = 25;

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
	const toolNames = ['web-search', 'fetch-url'];
	for (const name of toolNames) {
		if (name in context.domainTools) {
			researchTools[name] = context.domainTools[name];
		}
	}

	if (!researchTools['web-search']) {
		return { result: 'Error: web-search tool not available.', taskId: '', agentId: '' };
	}

	if (!context.spawnBackgroundTask) {
		return { result: 'Error: background task support not available.', taskId: '', agentId: '' };
	}

	const subAgentId = input.agentId ?? `agent-researcher-${nanoid(6)}`;
	const taskId = input.taskId ?? `research-${nanoid(8)}`;

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

	const conversationCtx = input.conversationContext
		? `\n\n[CONVERSATION CONTEXT: ${input.conversationContext}]`
		: '';
	const briefing = input.constraints
		? `${input.goal}${conversationCtx}\n\nConstraints: ${input.constraints}`
		: `${input.goal}${conversationCtx}`;
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

	context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'web-researcher',
		traceContext,
		plannedTaskId: input.plannedTaskId,
		run: async (signal, drainCorrections) => {
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
						maxSteps: RESEARCH_MAX_STEPS,
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
						llmStepTraceHooks,
					});

					return await text;
				});
			});
		},
	});

	return {
		result: `Research started (task: ${taskId}). Reply with one short sentence. Do NOT summarize the plan or list details.`,
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
