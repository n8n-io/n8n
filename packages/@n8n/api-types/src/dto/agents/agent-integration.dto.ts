import { z } from 'zod';

import { Z } from '../../zod-class';

export const AGENT_TELEGRAM_ACCESS_MODES = ['private', 'public'] as const;

export const agentTelegramIntegrationSettingsSchema = z
	.object({
		accessMode: z.enum(AGENT_TELEGRAM_ACCESS_MODES),
		allowedUserIds: z
			.array(z.string().trim().regex(/^\d+$/, 'Telegram user IDs must contain numbers only'))
			.default([])
			.transform((ids) => [...new Set(ids)]),
	})
	.strict()
	.superRefine((settings, ctx) => {
		if (settings.accessMode === 'private' && settings.allowedUserIds.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['allowedUserIds'],
				message: 'Add at least one Telegram user ID',
			});
		}
	});

export type AgentTelegramIntegrationSettings = z.infer<
	typeof agentTelegramIntegrationSettingsSchema
>;

export class AgentIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
	settings: agentTelegramIntegrationSettingsSchema.optional(),
}) {}
