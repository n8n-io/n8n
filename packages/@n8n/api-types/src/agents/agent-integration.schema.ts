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
 * Where the Teams app may be used, and how much it may read there.
 *
 * These are manifest fields, not runtime switches: they become the bot's
 * `scopes` and its resource-specific permissions, so changing one means a new
 * app package. Direct chat is not listed because it is always on — it is what
 * makes the connection testable.
 *
 * Both reads default off. Without them Teams delivers only @mentions in a
 * shared conversation; with them every message arrives.
 */
export const AgentTeamsSettingsSchema = z
	.object({
		sessionIdleTimeoutMinutes,
		teamChannels: z.boolean().optional(),
		groupChats: z.boolean().optional(),
		readAllChannelMessages: z.boolean().optional(),
		readAllGroupMessages: z.boolean().optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		// A read permission without its surface would sit in the manifest doing
		// nothing, and would read to the user as if it were in effect.
		if (value.readAllChannelMessages && !value.teamChannels) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['readAllChannelMessages'],
				message: 'Turn on team channels before reading all channel messages',
			});
		}
		if (value.readAllGroupMessages && !value.groupChats) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['readAllGroupMessages'],
				message: 'Turn on group and meeting chats before reading all group messages',
			});
		}
	});
export type AgentTeamsIntegrationSettings = z.infer<typeof AgentTeamsSettingsSchema>;

export const AgentIntegrationSettingsSchema = z.union([
	AgentTelegramSettingsSchema,
	AgentSlackSettingsSchema,
	AgentDiscordSettingsSchema,
	AgentLinearSettingsSchema,
	// Teams was left out while it aliased the shared shape, when the entry was a
	// no-op. Its settings now differ, so leaving it out would reject them.
	AgentTeamsSettingsSchema,
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
	createCredIntegrationSchema('teams', AgentTeamsSettingsSchema).extend({
		settings: AgentTeamsSettingsSchema.optional(),
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
	createDraftCredIntegrationSchema('teams', AgentTeamsSettingsSchema).extend({
		settings: AgentTeamsSettingsSchema.optional(),
	}),
] as const;

export const AgentIntegrationSchema = z.discriminatedUnion('type', credentialIntegrations);

/** Draft config variant that allows cleared stale credential IDs. */
export const AgentIntegrationConfigSchema = z.discriminatedUnion(
	'type',
	draftCredentialIntegrations,
);

export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationConfigSchema>;
