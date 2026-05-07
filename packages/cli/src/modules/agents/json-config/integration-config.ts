import { z } from 'zod';

import { isValidCronExpression } from '../integrations/cron-validation';

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

export const AgentCredentialIntegrationSchema = z
	.object({
		type: z
			.string()
			.min(1)
			.refine((value) => value !== 'schedule', {
				message: 'Type "schedule" is reserved for the schedule trigger',
			}),
		credentialId: z.string().min(1),
		credentialName: z.string().min(1),
	})
	.strict();

export const AgentIntegrationSchema = z.union([
	AgentScheduleIntegrationSchema,
	AgentCredentialIntegrationSchema,
]);

export type AgentScheduleIntegrationConfig = z.infer<typeof AgentScheduleIntegrationSchema>;
export type AgentCredentialIntegrationConfig = z.infer<typeof AgentCredentialIntegrationSchema>;
export type AgentIntegrationConfig = z.infer<typeof AgentIntegrationSchema>;
