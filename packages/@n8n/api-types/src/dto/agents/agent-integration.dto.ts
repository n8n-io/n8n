import { z } from 'zod';

import { Z } from '../../zod-class';

/** Telegram  */
export const AGENT_TELEGRAM_ACCESS_MODES = ['private', 'public'] as const;

export const AgentTelegramSettingsSchema = z
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
	.strict();

export type AgentTelegramIntegrationSettings = z.infer<typeof AgentTelegramSettingsSchema>;

/** General */
export class AgentCredentialIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
	settings: z.record(z.string(), z.unknown()).optional(),
}) {}

export const AgentIntegrationSettingsSchema = z.union([AgentTelegramSettingsSchema, z.undefined()]);

export type AgentIntegrationSettings = z.infer<typeof AgentIntegrationSettingsSchema>;
