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

/**
 * OpenWebUI/LibreChat have no platform-specific settings of their own,
 * same as Discord/Linear. `sessionIdleTimeoutMinutes` is carried along for
 * type compatibility with generic code that reads it optionally across the
 * whole settings union (e.g. agent-chat-bridge.ts); it's meaningless here
 * and never read, since this channel never goes through AgentChatBridge or
 * resourceId-keyed session persistence at all (see
 * agent-connection-channels.md 5.1, 5.6, each call gets a fresh, throwaway
 * thread instead).
 */
export const AgentOpenAiCompatibleSettingsSchema = AgentSessionOnlySettingsSchema;
export type AgentOpenAiCompatibleIntegrationSettings = z.infer<
	typeof AgentOpenAiCompatibleSettingsSchema
>;

export const AgentIntegrationSettingsSchema = z.union([
	AgentTelegramSettingsSchema,
	AgentSlackSettingsSchema,
	AgentDiscordSettingsSchema,
	AgentLinearSettingsSchema,
	AgentOpenAiCompatibleSettingsSchema,
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
	createCredIntegrationSchema('openwebui', AgentOpenAiCompatibleSettingsSchema).extend({
		settings: AgentOpenAiCompatibleSettingsSchema.optional(),
	}),
	createCredIntegrationSchema('librechat', AgentOpenAiCompatibleSettingsSchema).extend({
		settings: AgentOpenAiCompatibleSettingsSchema.optional(),
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
	createDraftCredIntegrationSchema('openwebui', AgentOpenAiCompatibleSettingsSchema).extend({
		settings: AgentOpenAiCompatibleSettingsSchema.optional(),
	}),
	createDraftCredIntegrationSchema('librechat', AgentOpenAiCompatibleSettingsSchema).extend({
		settings: AgentOpenAiCompatibleSettingsSchema.optional(),
	}),
] as const;

export const AgentIntegrationSchema = z.discriminatedUnion('type', credentialIntegrations);

/** Draft config variant that allows cleared stale credential IDs. */
export const AgentIntegrationConfigSchema = z.discriminatedUnion(
	'type',
	draftCredentialIntegrations,
);

export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationConfigSchema>;
