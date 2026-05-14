import { z } from 'zod';

import { isValidCronExpression } from '../integrations/cron-validation';
import { AgentTelegramSettingsSchema } from '@n8n/api-types';

const createCredIntegrationSchema = <
	Value extends string,
	Settings extends z.ZodObject<z.ZodRawShape>,
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

export const AgentScheduleIntegrationSchema = z
	.object({
		type: z.literal('schedule'),
		active: z.boolean(),
		cronExpression: z
			.string()
			.min(1, 'cronExpression is required')
			.refine(isValidCronExpression, { message: 'Invalid cron expression' }),
		wakeUpPrompt: z.string().min(1, 'wakeUpPrompt is required'),
	})
	.strict();

const credentialIntegrations = [
	createCredIntegrationSchema('telegram', AgentTelegramSettingsSchema).extend({
		// legacy support for the old schema without settings
		settings: AgentTelegramSettingsSchema.optional(),
	}),
	createSimpleIntegrationSchema('slack'),
	createSimpleIntegrationSchema('linear'),
] as const;

// Place settings schemas inside @n8n/api-types to expose on frontend
export const AgentIntegrationSchema = z.discriminatedUnion('type', [
	...credentialIntegrations,
	AgentScheduleIntegrationSchema,
]);
export const AgentCredentialIntegrationSchema = z.discriminatedUnion(
	'type',
	credentialIntegrations,
);

export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationSchema>;
export type AgentScheduleIntegrationConfig = z.infer<typeof AgentScheduleIntegrationSchema>;
export type AgentCredentialIntegrationConfig = Exclude<
	AgentIntegrationConfig,
	{ type: 'schedule' }
>;

export function isAgentScheduleIntegration(
	integration: AgentIntegrationConfig | null | undefined,
): integration is AgentScheduleIntegrationConfig {
	return integration?.type === 'schedule';
}

export function isAgentCredentialIntegration(
	integration: AgentIntegrationConfig | null | undefined,
): integration is AgentCredentialIntegrationConfig {
	return integration?.type !== 'schedule';
}
