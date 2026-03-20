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
import { createBackgroundTaskExecutionKey } from './execution-key';
import { RESEARCH_AGENT_PROMPT } from './research-agent-prompt';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import type { OrchestrationContext } from '../../types';

const RESEARCH_MAX_STEPS = 25;

export interface StartResearchWithAgentTaskInput {
	goal: string;
	constraints?: string;
	planId?: string;
	phaseId?: string;
}

export function startResearchWithAgentTask(
	context: OrchestrationContext,
	input: StartResearchWithAgentTaskInput,
): { started: boolean; reused: boolean; result: string; taskId?: string } {
	const researchTools: ToolsInput = {};
	const toolNames = ['web-search', 'fetch-url'];
	for (const name of toolNames) {
		if (name in context.domainTools) {
			researchTools[name] = context.domainTools[name];
		}
	}

	if (!researchTools['web-search']) {
		return {
			started: false,
			reused: false,
			result: 'Error: web-search tool not available.',
		};
	}

	if (!context.spawnBackgroundTask) {
		return {
			started: false,
			reused: false,
			result: 'Error: background task support not available.',
		};
	}

	const subAgentId = `agent-researcher-${nanoid(6)}`;
	const taskId = `research-${nanoid(8)}`;
	const briefing = input.constraints
		? `${input.goal}\n\nConstraints: ${input.constraints}`
		: input.goal;
	const executionKey = createBackgroundTaskExecutionKey({
		kind: 'research',
		planId: input.planId,
		phaseId: input.phaseId,
		goal: input.goal,
		constraints: input.constraints,
	});

	const spawnResult = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'web-researcher',
		kind: 'research',
		executionKey,
		title: 'Researching',
		subtitle: truncateLabel(input.goal),
		goal: input.goal,
		planId: input.planId,
		phaseId: input.phaseId,
		messageGroupId: context.messageGroupId,
		run: async (signal, drainCorrections, lifecycle) => {
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
				tools: researchTools,
			});

			registerWithMastra(subAgentId, subAgent, context.storage);

			const stream = await subAgent.stream(briefing, {
				maxSteps: RESEARCH_MAX_STEPS,
				abortSignal: signal,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

			const { text } = await consumeStreamWithHitl({
				agent: subAgent,
				stream,
				runId: context.runId,
				agentId: subAgentId,
				eventBus: context.eventBus,
				threadId: context.threadId,
				abortSignal: signal,
				waitForConfirmation: context.waitForConfirmation,
				drainCorrections,
				onSuspended: async (suspension) => await lifecycle.suspended(suspension.requestId),
				onResumed: async () => await lifecycle.resumed(),
			});

			const finalText = await text;

			return {
				text: finalText,
				outcome: {
					kind: 'research',
					summary: finalText,
				},
			};
		},
	});

	if (!spawnResult.started) {
		return {
			started: false,
			reused: false,
			result: spawnResult.error ?? 'Error: failed to start research task.',
		};
	}

	if (!spawnResult.reused) {
		context.eventBus.publish(context.threadId, {
			type: 'agent-spawned',
			runId: context.runId,
			agentId: subAgentId,
			payload: {
				parentId: context.orchestratorAgentId,
				role: 'web-researcher',
				tools: Object.keys(researchTools),
				taskId: spawnResult.taskId,
				kind: 'researcher',
				title: 'Researching',
				subtitle: truncateLabel(input.goal),
				goal: input.goal,
			},
		});
	}

	return {
		started: true,
		reused: spawnResult.reused,
		result: spawnResult.reused
			? `Research already running (task: ${spawnResult.taskId}). Acknowledge briefly and move on.`
			: `Research started (task: ${spawnResult.taskId}). Acknowledge briefly and move on.`,
		taskId: spawnResult.taskId,
	};
}

export function createResearchWithAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'research-with-agent',
		description:
			'Spawn a background research agent that searches the web and reads pages ' +
			'to answer a complex question. Returns immediately with a task ID — results ' +
			'arrive when the research completes. Use when the question requires multiple ' +
			'searches and page reads, or needs synthesis from several sources.',
		inputSchema: z.object({
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
		}),
		outputSchema: z.object({
			started: z.boolean(),
			reused: z.boolean(),
			result: z.string(),
			taskId: z.string().optional(),
		}),
		execute: async (input) => {
			const result = startResearchWithAgentTask(context, input);
			await Promise.resolve();
			return result;
		},
	});
}
