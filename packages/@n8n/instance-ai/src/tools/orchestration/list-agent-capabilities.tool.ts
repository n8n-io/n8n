/**
 * list-agent-capabilities — read-only orchestration tool that exposes the
 * agents module's authoritative supported integrations (and
 * their builder guidance) to the Instance AI orchestrator because
 * the orchestrator cannot see the subagent builder's toolset.
 *
 * Returns each supported channel's `type`, `label`, `credentialTypes`, and
 * builder guidance (`capabilities`, `useIntegrationWhen`, `useNodeToolWhen`),
 * plus a concise agent-level limitations note. Read-only; channels are
 * configured via the builder (`build-agent`).
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

const chatIntegrationDescriptorSchema = z.object({
	type: z.string(),
	label: z.string(),
	icon: z.string(),
	credentialTypes: z.array(z.string()),
	capabilities: z.array(z.string()).optional(),
	useIntegrationWhen: z.array(z.string()).optional(),
	useNodeToolWhen: z.array(z.string()).optional(),
});

const listAgentCapabilitiesOutputSchema = z.object({
	/** Supported chat-channel integrations; absence from this list means unsupported. */
	channels: z.array(chatIntegrationDescriptorSchema),
	/** What an n8n Agent can do beyond chat channels — brief, for planning. */
	agentCapabilities: z.array(z.string()),
	/** Agent-level limitations the orchestrator must respect when planning an agent build. */
	limitations: z.array(z.string()),
});

export function createListAgentCapabilitiesTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.LIST_AGENT_CAPABILITIES)
		.description(
			'List what n8n Agents can do and the chat-channel integrations they support. ' +
				"Returns each supported channel's `type`, `label`, supported credential types, " +
				'and builder guidance (`capabilities`, `useIntegrationWhen`, `useNodeToolWhen`), ' +
				'plus `agentCapabilities` (what an agent can do beyond chat) and `limitations` ' +
				'(agent-level constraints to respect when planning a build). ' +
				'Call this before building or modifying an agent whenever the user names a ' +
				'specific channel or capability (e.g. WhatsApp, Teams): if the named channel ' +
				'is absent from `channels`, it is unsupported for agents — explain the ' +
				'limitation and offer the listed alternatives instead of improvising a ' +
				'workflow substitute or claiming it is configured. Read-only; channels and ' +
				'capabilities are configured via `build-agent`.',
		)
		.input(z.object({}))
		.output(listAgentCapabilitiesOutputSchema)
		.handler(async () => {
			const delegate = context.domainContext?.builderDelegate;
			if (!delegate) {
				throw new Error('Agent capabilities are not available on this instance.');
			}
			// Channels, agent-level capabilities, and limitations all come from the
			// agents module via the delegate, so the orchestrator never hardcodes
			// capability info and stays aligned as the module evolves.
			return await delegate.listAgentCapabilities();
		})
		.build();
}
