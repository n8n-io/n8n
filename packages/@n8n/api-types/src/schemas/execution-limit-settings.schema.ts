import { z } from 'zod';

const executionLimitPeriodUnitSchema = z.enum(['day', 'week', 'month']);
export const EXECUTION_LIMIT_PERIOD_UNITS = executionLimitPeriodUnitSchema.options;
export type ExecutionLimitPeriodUnit = z.infer<typeof executionLimitPeriodUnitSchema>;

export const EXECUTION_LIMIT_MAX_PAUSE_AFTER = 2_147_483_647;

const pauseAfterSchema = z.number().int().min(1).max(EXECUTION_LIMIT_MAX_PAUSE_AFTER).nullable();

export const executionLimitSettingsSchema = z
	.object({
		periodUnit: executionLimitPeriodUnitSchema,
		pauseAfter: pauseAfterSchema,
		defaultProjectPauseAfter: pauseAfterSchema,
	})
	.strict();

export type ExecutionLimitSettings = z.infer<typeof executionLimitSettingsSchema>;
