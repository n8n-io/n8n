import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	CONFIGURE_CHANNEL_TOOL_NAME,
	channelResumeSchema,
	channelSuspendPayloadSchema,
	type ChannelResumeData,
	type ChannelSuspendPayload,
	getLegacyBuilderToolNames,
} from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { ChannelSetupDeps } from './setup-tool.types';

const configureChannelInputSchema = z.object({
	integrationType: z.string().describe('Chat platform type from agent-context integrations'),
});

type ConfigureChannelInput = z.infer<typeof configureChannelInputSchema>;

export function buildConfigureChannelTool(deps: ChannelSetupDeps): BuiltTool {
	return new Tool(CONFIGURE_CHANNEL_TOOL_NAME)
		.legacyNames(...getLegacyBuilderToolNames(CONFIGURE_CHANNEL_TOOL_NAME))
		.description(
			'Configure one available chat channel for target agent. First call ' +
				'agent-context with type "integrations", pass returned `type` as `integrationType`; do not infer ' +
				'channel names. Shows setup UI in chat where user creates new channel credential ' +
				'(for n8n_chat: confirms agent description) or skips. Setup UI persists channel config, does not publish agent, ' +
				'so use this for channel credentials, not credentials tool or config writes. ' +
				'Returns { configured: boolean } (plus configMutated/agentId refresh metadata when configured); ' +
				'false = user skipped: continue without channel, do not re-prompt.',
		)
		.input(configureChannelInputSchema)
		.suspend(channelSuspendPayloadSchema)
		.resume(channelResumeSchema)
		.handler(
			async (
				{ integrationType }: ConfigureChannelInput,
				ctx: InterruptibleToolContext<ChannelSuspendPayload, ChannelResumeData>,
			) => {
				// Resumed — the user configured (approved) or skipped (dismissed). Handled
				// before the integration-catalog validation below: a run rebuilt from a
				// checkpoint after a process restart may see a different (or empty)
				// catalog than the original call, but the setup card already persisted (or
				// skipped) the configuration, so the resume leg only reports the outcome.
				if (ctx.resumeData !== undefined && ctx.resumeData !== null) {
					if (ctx.resumeData.approved) {
						deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TRIGGER, {
							trigger_type: integrationType,
						});
					}
					return { configured: ctx.resumeData.approved };
				}

				const availableTypes = await deps.listChatIntegrationTypes();
				if (!availableTypes.includes(integrationType)) {
					const availableMessage = availableTypes.length
						? ` Available: ${availableTypes.join(', ')}.`
						: ' No chat channels are currently available.';
					return {
						ok: false as const,
						errors: [
							{
								message:
									`Unsupported chat channel "${integrationType}". Call agent-context with type "integrations" ` +
									'and choose a returned type.' +
									availableMessage,
							},
						],
					};
				}

				return await ctx.suspend({
					requestId: nanoid(),
					message: `Set up the ${integrationType} channel`,
					severity: 'info' as const,
					channelConfig: { integrationType, agentId: deps.agentId },
					projectId: deps.projectId,
				});
			},
		)
		.build();
}
