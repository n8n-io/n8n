/**
 * configure_channel — interactive HITL tool that walks the user through setting
 * up a chat channel (Slack / Telegram / Linear) for the target agent.
 *
 * Standalone (not an `agent_builder` router action): the router declares no
 * suspend/resume, so any interactive tool must be registered on its own. It
 * suspends with a `channelConfig` confirmation-request payload; the UI
 * opens the existing channel-setup modal, where the user creates a NEW
 * credential and connects (or skips). The modal persists the connection itself
 * via the agents REST endpoints, so this tool never writes the `integrations`
 * config — it only orchestrates the UI and reports the outcome to the model.
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
		.describe(
			'Chat platform type from list_integration_types, e.g. "slack" | "telegram" | "linear"',
		),
});

const configureChannelResumeSchema = z.object({
	approved: z.boolean(),
});

export function createConfigureChannelTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.CONFIGURE_CHANNEL)
		.description(
			'Connect a chat channel (Slack, Telegram, Linear, …) to the target agent. Opens the ' +
				'channel setup UI in the chat so the user creates a NEW credential and connects — a new ' +
				'agent always needs its own credential for its own identity, so never reuse an existing ' +
				'one. The user may skip. This tool persists the connection through the setup UI itself: ' +
				'do NOT call list_credentials for a channel and do NOT write channel entries into the ' +
				'`integrations` config. Returns { connected: boolean } — if connected is false the user ' +
				'skipped; proceed without the channel and do not re-prompt.',
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
			// run's memory), and the modal already persisted (or skipped) the
			// connection, so the resume leg only reports the outcome.
			if (resumeData !== undefined && resumeData !== null) {
				return { connected: Boolean(resumeData.approved) };
			}

			// First call — suspend to open the channel-setup modal. The channelConfig
			// payload alone drives the UI (presence-based, like setupRequests).
			const { agentBuilderTarget } = context;
			if (!agentBuilderTarget) return NOT_CONFIGURED;

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
