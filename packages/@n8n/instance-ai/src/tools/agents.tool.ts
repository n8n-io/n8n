/**
 * agents — read-only listing of the n8n Agent artifacts in the conversation's
 * project. Lets the orchestrator answer "what agents do I have?" and find an
 * `agentId` to pass to `build-agent` when editing an agent not built in this
 * conversation. Creation and editing stay on `build-agent`.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { OrchestrationContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const agentsInputSchema = z.object({
	action: z
		.literal('list')
		.describe(
			'List the n8n Agents in this project (id, name, published state, last update), most recently updated first.',
		),
});

const agentsOutputSchema = z.object({
	count: z.number(),
	agents: z.array(
		z.object({
			agentId: z.string(),
			name: z.string(),
			published: z.boolean(),
			updatedAt: z.string(),
		}),
	),
});

export function createAgentsTool(context: OrchestrationContext) {
	return new Tool(DOMAIN_TOOL_IDS.AGENTS)
		.description(
			'List the n8n Agent artifacts in this project — id, name, published state, and last ' +
				'update, most recently updated first. Use it to answer questions about existing ' +
				'agents and to find the `agentId` to pass to `build-agent` when the user wants to ' +
				'edit an agent that was not built in this conversation. Read-only; agents are ' +
				'created and edited via `build-agent`.',
		)
		.input(agentsInputSchema)
		.output(agentsOutputSchema)
		.handler(async () => {
			const delegate = context.domainContext?.builderDelegate;
			if (!delegate) {
				throw new Error('Agent listing is not available on this instance.');
			}
			const agents = await delegate.listAgents();
			return { count: agents.length, agents };
		})
		.build();
}
