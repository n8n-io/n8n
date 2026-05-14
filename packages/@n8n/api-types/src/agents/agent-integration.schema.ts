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

export const AGENT_SCHEDULE_TRIGGER_TYPE = 'schedule';

export const AgentScheduleIntegrationSchema = z
	.object({
		type: z.literal(AGENT_SCHEDULE_TRIGGER_TYPE),
		active: z.boolean(),
		cronExpression: z.string().min(1, 'cronExpression is required'),
		wakeUpPrompt: z.string().min(1, 'wakeUpPrompt is required'),
	})
	.strict();

const credentialIntegrations = [
	createCredIntegrationSchema('telegram', AgentTelegramSettingsSchema).extend({
		// keep optional for older agents
		settings: AgentTelegramSettingsSchema.optional(),
	}),
	createSimpleIntegrationSchema('slack'),
	createSimpleIntegrationSchema('linear'),
] as const;

export const AgentCredentialIntegrationSchema = z.discriminatedUnion(
	'type',
	credentialIntegrations,
);

export const AgentIntegrationSchema = z.discriminatedUnion('type', [
	...credentialIntegrations,
	AgentScheduleIntegrationSchema,
]);

export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationSchema>;
export type AgentScheduleIntegrationConfig = z.infer<typeof AgentScheduleIntegrationSchema>;
export type AgentCredentialIntegrationConfig = Exclude<
	AgentIntegrationConfig,
	{ type: typeof AGENT_SCHEDULE_TRIGGER_TYPE }
>;

export type AgentScheduleIntegration = AgentScheduleIntegrationConfig;
export type AgentCredentialIntegrationDto = AgentCredentialIntegrationConfig;
export type AgentIntegration = AgentIntegrationConfig;

export function isAgentScheduleIntegration(
	integration: AgentIntegrationConfig | null | undefined,
): integration is AgentScheduleIntegrationConfig {
	return integration?.type === AGENT_SCHEDULE_TRIGGER_TYPE;
}

export function isAgentCredentialIntegration(
	integration: AgentIntegrationConfig | null | undefined,
): integration is AgentCredentialIntegrationConfig {
	return (
		integration !== null && integration !== undefined && !isAgentScheduleIntegration(integration)
	);
}
