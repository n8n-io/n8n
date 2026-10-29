import { z } from 'zod';

export const executionLimitPeriodUnitSchema = z.enum(['day', 'week', 'month']);
export const EXECUTION_LIMIT_PERIOD_UNITS = executionLimitPeriodUnitSchema.options;
export type ExecutionLimitPeriodUnit = z.infer<typeof executionLimitPeriodUnitSchema>;

const pauseValueSchema = z.number().int().positive().nullable();

export const executionLimitSettingsSchema = z
	.object({
		periodUnit: executionLimitPeriodUnitSchema,
		pauseAfter: pauseValueSchema,
		defaultProjectPauseAfter: pauseValueSchema,
	})
	.strict();

export type ExecutionLimitSettings = z.infer<typeof executionLimitSettingsSchema>;
