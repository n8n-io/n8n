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

const createSimpleIntegrationSchema = <Value extends string>(typeName: Value) =>
	z.object({
		type: z.literal<Value>(typeName),
		credentialId: z.string().min(1),
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

const createDraftSimpleIntegrationSchema = <Value extends string>(typeName: Value) =>
	z.object({
		type: z.literal<Value>(typeName),
		credentialId: z.string(),
	});

export const AGENT_TELEGRAM_ACCESS_MODES = ['private', 'public'] as const;

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

export const AgentIntegrationSettingsSchema = z.union([AgentTelegramSettingsSchema, z.undefined()]);
export type AgentIntegrationSettings = z.infer<typeof AgentIntegrationSettingsSchema>;

const credentialIntegrations = [
	createCredIntegrationSchema('telegram', AgentTelegramSettingsSchema).extend({
		// keep optional for older agents
		settings: AgentTelegramSettingsSchema.optional(),
	}),
	createSimpleIntegrationSchema('slack'),
	createSimpleIntegrationSchema('linear'),
] as const;

const draftCredentialIntegrations = [
	createDraftCredIntegrationSchema('telegram', AgentTelegramSettingsSchema).extend({
		settings: AgentTelegramSettingsSchema.optional(),
	}),
	createDraftSimpleIntegrationSchema('slack'),
	createDraftSimpleIntegrationSchema('linear'),
] as const;

export const AgentIntegrationSchema = z.discriminatedUnion('type', credentialIntegrations);

/** Draft config variant that allows cleared stale credential IDs. */
export const AgentIntegrationConfigSchema = z.discriminatedUnion(
	'type',
	draftCredentialIntegrations,
);

export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationConfigSchema>;
