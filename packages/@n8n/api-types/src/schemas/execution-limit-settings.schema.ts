import { z } from 'zod';

const executionLimitPeriodUnitSchema = z.enum(['day', 'week', 'month']);
export const EXECUTION_LIMIT_PERIOD_UNITS = executionLimitPeriodUnitSchema.options;
export type ExecutionLimitPeriodUnit = z.infer<typeof executionLimitPeriodUnitSchema>;

const pauseAfterSchema = z.number().int().positive().nullable();

export const executionLimitSettingsSchema = z
	.object({
		periodUnit: executionLimitPeriodUnitSchema,
		pauseAfter: pauseAfterSchema,
		defaultProjectPauseAfter: pauseAfterSchema,
	})
	.strict();

export type ExecutionLimitSettings = z.infer<typeof executionLimitSettingsSchema>;
