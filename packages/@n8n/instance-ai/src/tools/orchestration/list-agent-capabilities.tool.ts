/**
 * list_agent_capabilities — read-only orchestration tool that exposes the
 * agents module's authoritative supported chat-channel integrations (and
 * their builder guidance) to the Instance AI orchestrator.
 *
 * The orchestrator cannot see the agents-module builder's toolset, so it has
 * no way to check whether a channel the user named (e.g. WhatsApp) is
 * supported before committing to a build path. Without this tool the model
 * either improvises a workflow substitute for an unsupported agent channel or
 * delegates to `build-agent` and learns the limitation only after the builder
 * rejects it. This tool projects the same `ChatIntegrationRegistry` list the
 * builder's `list_integration_types` uses, so the registry stays the single
 * source of truth and the orchestrator can explain unsupported channels and
 * offer valid alternatives at intent time.
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
	/** Agent-level limitations the orchestrator must respect when planning an agent build. */
	limitations: z.array(z.string()),
});

export function createListAgentCapabilitiesTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.LIST_AGENT_CAPABILITIES)
		.description(
			'List the chat-channel integrations n8n Agents currently support, with each ' +
				"channel's `type`, `label`, supported credential types, and builder guidance " +
				'(`capabilities`, `useIntegrationWhen`, `useNodeToolWhen`). Call this before ' +
				'building or modifying an agent whenever the user names a specific channel or ' +
				'capability (e.g. WhatsApp, Teams): if the named channel is absent, it is ' +
				'unsupported for agents — explain the limitation and offer the listed ' +
				'alternatives instead of improvising a workflow substitute or claiming it is ' +
				'configured. Also returns agent-level limitations (cannot create workflows or ' +
				'data tables; channels must come from this list). Read-only; channels are ' +
				'configured via `build-agent`.',
		)
		.input(z.object({}))
		.output(listAgentCapabilitiesOutputSchema)
		.handler(async () => {
			const delegate = context.domainContext?.builderDelegate;
			if (!delegate) {
				throw new Error('Agent capabilities are not available on this instance.');
			}
			const channels = await delegate.listAgentCapabilities();
			return {
				channels,
				limitations: [
					'Agents cannot create n8n workflows or data tables; attach existing workflows only.',
					'Chat channels must come from this list — any other channel is unsupported.',
				],
			};
		})
		.build();
}
