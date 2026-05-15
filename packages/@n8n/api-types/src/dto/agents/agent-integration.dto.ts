import { z } from 'zod';

import { Z } from '../../zod-class';

export const AGENT_TELEGRAM_ACCESS_MODES = ['private', 'public'] as const;

export const agentTelegramSettingsSchema = z
	.object({
		accessMode: z.enum(AGENT_TELEGRAM_ACCESS_MODES),
		// allowedUsers holds both Telegram user IDs (numeric strings, e.g. "487257961")
		// and usernames (alphanumeric + underscore, e.g. "@yokano" or "yokano"). Values
		// are stored verbatim — the leading "@" is NOT stripped here so user intent is
		// preserved. Normalization (stripping "@") happens only at access-check time in
		// TelegramIntegration.isUserAllowed().
		allowedUsers: z
			.array(
				z
					.string()
					.trim()
					.regex(
						/^@?[a-zA-Z0-9_]+$/,
						'Enter a valid Telegram user ID (numbers only) or username (letters, numbers, underscores)',
					),
			)
			.default([])
			.transform((items) => [...new Set(items)]),
	})
	.strict()
	.superRefine((settings, ctx) => {
		if (settings.accessMode === 'private' && settings.allowedUsers.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['allowedUsers'],
				message: 'Add at least one Telegram user ID or username',
			});
		}
	});

export type AgentTelegramIntegrationSettings = z.infer<typeof agentTelegramSettingsSchema>;

export const agentIntegrationSettingsSchema = z.union([agentTelegramSettingsSchema, z.undefined()]);

export type AgentIntegrationSettings = z.infer<typeof agentIntegrationSettingsSchema>;

// TODO: discriminate settings by type of integration
export class AgentIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
	settings: agentIntegrationSettingsSchema.optional(),
}) {}
