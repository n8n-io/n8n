/**
 * configure_channel — interactive HITL tool that walks the user through setting
 * up a chat channel for the target agent.
 *
 * Standalone (not an `agent_builder` router action): the router declares no
 * suspend/resume, so any interactive tool must be registered on its own. It
 * suspends with a `channelConfig` confirmation-request payload; the UI renders
 * the channel setup card inline in chat, where the user creates a NEW credential
 * and connects (or skips). The setup card persists the connection itself via the
 * agents REST endpoints, so this tool does not write the `integrations` config —
 * it only orchestrates the UI and reports the outcome to the model.
 */
import { Tool } from '@n8n/agents';
import { channelConfigSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

const NOT_CONFIGURED = {
	ok: false as const,
	errors: [
		{
			message: 'No agent is being built yet. Call agent_builder({ action: "create_agent" }) first.',
		},
	],
};

const configureChannelInputSchema = z.object({
	integrationType: z
		.string()
		.describe('Chat platform type from agent_builder({ action: "list_integration_types" })'),
});

const configureChannelResumeSchema = z.object({
	approved: z.boolean(),
});

export function createConfigureChannelTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.CONFIGURE_CHANNEL)
		.description(
			'Connect one available chat channel to the target agent. First call ' +
				'agent_builder({ action: "list_integration_types" }) and pass a returned `type` as ' +
				'`integrationType`; do not infer channel names. Shows setup UI in chat where the user ' +
				'creates a new channel credential or skips. The setup UI persists the connection, so use ' +
				'this for channel credentials instead of the credentials tool or config writes. Returns ' +
				'{ connected: boolean }; if false, continue without the channel and do not re-prompt.',
		)
		.input(configureChannelInputSchema)
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				channelConfig: channelConfigSchema,
				projectId: z.string(),
			}),
		)
		.resume(configureChannelResumeSchema)
		.handler(async ({ integrationType }, ctx) => {
			const resumeData = ctx.resumeData;

			// Resumed — the user connected (approved) or skipped (dismissed). Handled
			// before any builder-state guard: a run rebuilt from a checkpoint after a
			// process restart has no agentBuilderTarget (it lives only in the original
			// run's memory), and the setup card already persisted (or skipped) the
			// connection, so the resume leg only reports the outcome.
			if (resumeData !== undefined && resumeData !== null) {
				return { connected: Boolean(resumeData.approved) };
			}

			// First call — suspend to show the inline channel-setup card. The channelConfig
			// payload alone drives the UI (presence-based, like setupRequests).
			const { agentBuilderService, agentBuilderTarget } = context;
			if (!agentBuilderService || !agentBuilderTarget) return NOT_CONFIGURED;

			const integrations = await agentBuilderService.listChatIntegrations();
			const availableTypes = integrations.map((integration) => integration.type);
			if (!availableTypes.includes(integrationType)) {
				const availableMessage = availableTypes.length
					? ` Available: ${availableTypes.join(', ')}.`
					: ' No chat channels are currently available.';
				return {
					ok: false as const,
					errors: [
						{
							message:
								`Unsupported chat channel "${integrationType}". Call ` +
								'agent_builder({ action: "list_integration_types" }) and choose a returned type.' +
								availableMessage,
						},
					],
				};
			}

			return await ctx.suspend({
				requestId: nanoid(),
				message: `Set up the ${integrationType} channel`,
				severity: 'info' as const,
				channelConfig: { integrationType, agentId: agentBuilderTarget.agentId },
				projectId: agentBuilderTarget.projectId,
			});
		})
		.build();
}
