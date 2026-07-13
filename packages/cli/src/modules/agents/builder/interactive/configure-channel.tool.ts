import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	CONFIGURE_CHANNEL_TOOL_NAME,
	channelResumeSchema,
	channelSuspendPayloadSchema,
	type ChannelResumeData,
	type ChannelSuspendPayload,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const configureChannelInputSchema = z.object({
	integrationType: z.string().describe('Chat platform type from list_integration_types'),
});

type ConfigureChannelInput = z.infer<typeof configureChannelInputSchema>;

export interface ConfigureChannelToolDeps {
	agentId: string;
	projectId: string;
	/** Wraps `AgentIntegrationPersistenceService.listChatIntegrations()`. */
	listChatIntegrationTypes: () => string[];
}

export function buildConfigureChannelTool(deps: ConfigureChannelToolDeps): BuiltTool {
	return new Tool(CONFIGURE_CHANNEL_TOOL_NAME)
		.description(
			'Connect one available chat channel to the target agent. First call ' +
				'list_integration_types and pass a returned `type` as `integrationType`; do not infer ' +
				'channel names. Shows setup UI in chat where the user creates a new channel credential ' +
				'or skips. The setup UI persists the connection, so use this for channel credentials ' +
				'instead of the credentials tool or config writes. Returns { connected: boolean }; if ' +
				'false, continue without the channel and do not re-prompt.',
		)
		.input(configureChannelInputSchema)
		.suspend(channelSuspendPayloadSchema)
		.resume(channelResumeSchema)
		.handler(
			async (
				{ integrationType }: ConfigureChannelInput,
				ctx: InterruptibleToolContext<ChannelSuspendPayload, ChannelResumeData>,
			) => {
				// Resumed — the user connected (approved) or skipped (dismissed). Handled
				// before the integration-catalog validation below: a run rebuilt from a
				// checkpoint after a process restart may see a different (or empty)
				// catalog than the original call, but the setup card already persisted
				// (or skipped) the connection, so the resume leg only reports the outcome.
				if (ctx.resumeData !== undefined && ctx.resumeData !== null) {
					return { connected: ctx.resumeData.approved };
				}

				const availableTypes = deps.listChatIntegrationTypes();
				if (!availableTypes.includes(integrationType)) {
					const availableMessage = availableTypes.length
						? ` Available: ${availableTypes.join(', ')}.`
						: ' No chat channels are currently available.';
					return {
						ok: false as const,
						errors: [
							{
								message:
									`Unsupported chat channel "${integrationType}". Call list_integration_types ` +
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
