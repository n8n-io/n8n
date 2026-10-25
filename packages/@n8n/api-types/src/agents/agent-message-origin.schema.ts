import { z } from 'zod';

const id = z.string().min(1);

/**
 * Platform context stored once on an inbound agent message.
 * Names are snapshots for display. They never define ownership or access.
 */
export const AgentMessageIntegrationOriginSchema = z.discriminatedUnion('type', [
	z
		.object({
			type: z.literal('slack'),
			workspaceId: id,
			conversationKind: z.enum(['dm', 'group', 'channel']),
			channelId: id,
			channelName: z.string().min(1).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('discord'),
			/** Absent in a direct message. */
			serverId: id.optional(),
			channelId: id,
			channelName: z.string().min(1).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('linear'),
			issueId: id,
			identifier: id.optional(),
			title: z.string().min(1).optional(),
			projectId: id.optional(),
			teamId: id.optional(),
			teamName: z.string().min(1).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('telegram'),
			chatId: id,
			messageThreadId: id.optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('teams'),
			conversationId: id,
			conversationType: z.enum(['personal', 'groupChat', 'channel']).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal('whatsapp'),
			phoneNumberId: id,
			userWaId: id,
		})
		.strict(),
]);

export type AgentMessageIntegrationOrigin = z.infer<typeof AgentMessageIntegrationOriginSchema>;
