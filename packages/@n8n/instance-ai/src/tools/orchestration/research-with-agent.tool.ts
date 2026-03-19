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
import { registerWithMastra } from '../../agent/register-with-mastra';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import type { OrchestrationContext } from '../../types';

const RESEARCH_MAX_STEPS = 25;

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
			result: z.string(),
		}),
		// eslint-disable-next-line @typescript-eslint/require-await -- framework requires Promise return but body is sync
		execute: async (input) => {
			// Collect research tools from the domain tools
			const researchTools: ToolsInput = {};
			const toolNames = ['web-search', 'fetch-url'];
			for (const name of toolNames) {
				if (name in context.domainTools) {
					researchTools[name] = context.domainTools[name];
				}
			}

			if (!researchTools['web-search']) {
				return { result: 'Error: web-search tool not available.' };
			}

			if (!context.spawnBackgroundTask) {
				return { result: 'Error: background task support not available.' };
			}

			const subAgentId = `agent-researcher-${nanoid(6)}`;
			const taskId = `research-${nanoid(8)}`;

			// Publish agent-spawned so the UI shows the research agent immediately
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

			const briefing = input.constraints
				? `${input.goal}\n\nConstraints: ${input.constraints}`
				: input.goal;

			// Spawn researcher as a background task — returns immediately
			context.spawnBackgroundTask({
				taskId,
				threadId: context.threadId,
				agentId: subAgentId,
				role: 'web-researcher',
				run: async (signal, drainCorrections) => {
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

					registerWithMastra(subAgentId, subAgent, context.storage, context.tracingConfig);

					const stream = await subAgent.stream(briefing, {
						maxSteps: RESEARCH_MAX_STEPS,
						abortSignal: signal,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					});

					// Use consumeStreamWithHitl so fetch-url suspensions inside
					// the researcher follow the standard confirmation flow
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
					});

					return await text;
				},
			});

			return {
				result: `Research started (task: ${taskId}). Acknowledge briefly and move on.`,
			};
		},
	});
}
