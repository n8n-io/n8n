import { z } from 'zod';

const createCredIntegrationSchema = <
	Value extends string,
	Settings extends z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>,
>(
	typeName: Value,
	settingsSchema: Settings,
) =>
	z.object({
		type: z.literal<Value>(typeName),
		credentialId: z.string().min(1),
		settings: settingsSchema,
	});

const createDraftCredIntegrationSchema = <
	Value extends string,
	Settings extends z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>,
>(
	typeName: Value,
	settingsSchema: Settings,
) =>
	z.object({
		type: z.literal<Value>(typeName),
		credentialId: z.string(),
		settings: settingsSchema,
	});

export const AGENT_TELEGRAM_ACCESS_MODES = ['private', 'public'] as const;

/** Minutes of inactivity after which a channel starts a fresh session. Unset or `null` disables rotation. */
const sessionIdleTimeoutMinutes = z.number().int().positive().nullable().optional();

export const AgentTelegramSettingsSchema = z
	.object({
		accessMode: z.enum(AGENT_TELEGRAM_ACCESS_MODES),
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
		sessionIdleTimeoutMinutes,
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

export type AgentTelegramIntegrationSettings = z.infer<typeof AgentTelegramSettingsSchema>;

export const SLACK_MESSAGING_EXPERIENCES = ['assistant', 'agent'] as const;

export const AgentSlackSettingsSchema = z
	.object({
		messagingExperience: z.enum(SLACK_MESSAGING_EXPERIENCES),
		sessionIdleTimeoutMinutes,
	})
	.strict();

export type AgentSlackIntegrationSettings = z.infer<typeof AgentSlackSettingsSchema>;

/** Settings shape for integrations with no platform-specific settings of their own. */
const AgentSessionOnlySettingsSchema = z.object({ sessionIdleTimeoutMinutes }).strict();

export const AgentDiscordSettingsSchema = AgentSessionOnlySettingsSchema;
export type AgentDiscordIntegrationSettings = z.infer<typeof AgentDiscordSettingsSchema>;

export const AgentLinearSettingsSchema = AgentSessionOnlySettingsSchema;
export type AgentLinearIntegrationSettings = z.infer<typeof AgentLinearSettingsSchema>;

export const AGENT_WEB_ACCESS_MODES = ['public', 'n8nUserAuth', 'basicAuth'] as const;

export const AgentWebSettingsSchema = z
	.object({
		accessMode: z.enum(AGENT_WEB_ACCESS_MODES).default('public'),
		title: z.string().trim().max(128).optional(),
		subtitle: z.string().trim().max(256).optional(),
		basicAuthCredentialId: z.string().min(1).optional(),
	})
	.strict()
	.superRefine((settings, ctx) => {
		if (settings.accessMode === 'basicAuth' && !settings.basicAuthCredentialId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['basicAuthCredentialId'],
				message: 'Select a Basic Auth credential',
			});
		}
		if (settings.accessMode !== 'basicAuth' && settings.basicAuthCredentialId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['basicAuthCredentialId'],
				message: 'Basic Auth credentials require Basic Auth access',
			});
		}
	});

export type AgentWebIntegrationSettings = z.infer<typeof AgentWebSettingsSchema>;

export const AgentIntegrationSettingsSchema = z.union([
	AgentTelegramSettingsSchema,
	AgentSlackSettingsSchema,
	AgentDiscordSettingsSchema,
	AgentLinearSettingsSchema,
	AgentWebSettingsSchema,
	z.undefined(),
]);
export type AgentIntegrationSettings = z.infer<typeof AgentIntegrationSettingsSchema>;

const credentialIntegrations = [
	createCredIntegrationSchema('telegram', AgentTelegramSettingsSchema).extend({
		// keep optional for older agents
		settings: AgentTelegramSettingsSchema.optional(),
	}),
	createCredIntegrationSchema('slack', AgentSlackSettingsSchema).extend({
		// Existing Slack integrations use the legacy Assistant messaging experience.
		settings: AgentSlackSettingsSchema.optional(),
	}),
	createCredIntegrationSchema('linear', AgentLinearSettingsSchema).extend({
		settings: AgentLinearSettingsSchema.optional(),
	}),
	createCredIntegrationSchema('discord', AgentDiscordSettingsSchema).extend({
		settings: AgentDiscordSettingsSchema.optional(),
	}),
] as const;

const draftCredentialIntegrations = [
	createDraftCredIntegrationSchema('telegram', AgentTelegramSettingsSchema).extend({
		settings: AgentTelegramSettingsSchema.optional(),
	}),
	createDraftCredIntegrationSchema('slack', AgentSlackSettingsSchema).extend({
		settings: AgentSlackSettingsSchema.optional(),
	}),
	createDraftCredIntegrationSchema('linear', AgentLinearSettingsSchema).extend({
		settings: AgentLinearSettingsSchema.optional(),
	}),
	createDraftCredIntegrationSchema('discord', AgentDiscordSettingsSchema).extend({
		settings: AgentDiscordSettingsSchema.optional(),
	}),
] as const;

const webIntegration = z.object({
	type: z.literal('web'),
	integrationId: z.string().uuid(),
	settings: AgentWebSettingsSchema,
});

export const AgentIntegrationSchema = z.discriminatedUnion('type', [
	...credentialIntegrations,
	webIntegration,
]);

/** Draft config variant that allows cleared stale credential IDs. */
export const AgentIntegrationConfigSchema = z.discriminatedUnion(
	'type',
	[...draftCredentialIntegrations, webIntegration],
);

export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationConfigSchema>;
// TODO: restructure credentials to avoid separation of types
export type AgentCredentialIntegrationConfig = Exclude<AgentIntegrationConfig, { type: 'web' }>;
export type AgentWebIntegrationConfig = Extract<AgentIntegrationConfig, { type: 'web' }>;

export function getAgentIntegrationConnectionId(integration: AgentIntegrationConfig): string {
	return 'credentialId' in integration ? integration.credentialId : integration.integrationId;
}

export function getAgentIntegrationPersistedIdentity(
	integration: AgentIntegrationConfig,
): { credentialId: string } | { integrationId: string } {
	return 'credentialId' in integration
		? { credentialId: integration.credentialId }
		: { integrationId: integration.integrationId };
}
