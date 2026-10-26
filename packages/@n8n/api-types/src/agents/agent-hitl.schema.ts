import { z } from 'zod';

export const AGENT_DECISION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.agentDecisionTrigger';

export const AgentApprovalRouteSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('conversation') }).strict(),
	z.object({ type: z.literal('configuration'), configurationId: z.string().min(1) }).strict(),
]);

export const AgentHitlChannelSchema = z.enum(['slack', 'telegram', 'discord']);
const configurationBase = {
	id: z.string().min(1),
	name: z.string().trim().min(1),
};
export const AgentHitlConfigurationSchema = z
	.discriminatedUnion('method', [
		z
			.object({
				...configurationBase,
				method: z.literal('workflow'),
				workflowId: z.string().min(1),
			})
			.strict(),
		z
			.object({
				...configurationBase,
				method: z.literal('channel'),
				channel: AgentHitlChannelSchema,
				credentialId: z.string().min(1),
				recipient: z
					.object({
						kind: z.enum(['channel', 'user']),
						id: z.string().min(1),
						name: z.string().optional(),
					})
					.strict(),
				guildId: z.string().regex(/^\d+$/).optional(),
			})
			.strict(),
	])
	.superRefine((configuration, ctx) => {
		if (configuration.method !== 'channel') return;
		if (
			configuration.channel === 'telegram' &&
			(configuration.recipient.kind !== 'user' || !/^\d+$/.test(configuration.recipient.id))
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['recipient', 'id'],
				message: 'Enter a numeric Telegram user ID',
			});
		}
		if (
			configuration.channel === 'discord' &&
			(!configuration.guildId || !/^\d+$/.test(configuration.recipient.id))
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['recipient'],
				message: 'Select a Discord server and destination',
			});
		}
	});

export type AgentHitlChannel = z.infer<typeof AgentHitlChannelSchema>;
export type AgentHitlChannelConfiguration = Extract<AgentHitlConfiguration, { method: 'channel' }>;
export type AgentHitlOption = {
	id: string;
	name: string;
};
export interface AgentHitlOptionsPage {
	options: AgentHitlOption[];
	nextCursor?: string;
}
export interface AgentHitlChannelDescriptor {
	channel: AgentHitlChannel;
	credentialId: string;
	label: string;
	fields: Array<{
		name: 'guild' | 'recipient';
		type: 'search' | 'text';
		kinds?: Array<'channel' | 'user'>;
	}>;
}

export const AgentHitlOptionsQuerySchema = z.object({
	channel: AgentHitlChannelSchema,
	credentialId: z.string().min(1),
	field: z.enum(['guild', 'channel', 'user']),
	guildId: z.string().regex(/^\d+$/).optional(),
	query: z.string().max(200).default(''),
	cursor: z.string().max(2048).optional(),
});
export type AgentHitlOptionsQuery = z.infer<typeof AgentHitlOptionsQuerySchema>;

export const AgentDecisionSchema = z.object({
	approved: z.boolean(),
	reason: z.string().optional(),
});

export type AgentApprovalRoute = z.infer<typeof AgentApprovalRouteSchema>;
export type AgentHitlConfiguration = z.infer<typeof AgentHitlConfigurationSchema>;

/** Send-and-wait nodes return either the decision or a data envelope. */
export function parseAgentDecision(value: unknown): z.infer<typeof AgentDecisionSchema> {
	const direct = AgentDecisionSchema.safeParse(value);
	if (direct.success) return direct.data;
	return z.object({ data: AgentDecisionSchema }).parse(value).data;
}
