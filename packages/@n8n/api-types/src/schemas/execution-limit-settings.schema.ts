import { z } from 'zod';

const executionLimitPeriodUnitSchema = z.enum(['day', 'week', 'month']);
export const EXECUTION_LIMIT_PERIOD_UNITS = executionLimitPeriodUnitSchema.options;
export type ExecutionLimitPeriodUnit = z.infer<typeof executionLimitPeriodUnitSchema>;

export const EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING = 2_147_483_647;

export const executionLimitMaxExecutionsSchema = z
	.number()
	.int()
	.min(1)
	.max(EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING);

export const executionLimitSettingsSchema = z.object({
	periodUnit: executionLimitPeriodUnitSchema,
	instanceMaxExecutions: executionLimitMaxExecutionsSchema.nullable(),
	defaultProjectMaxExecutions: executionLimitMaxExecutionsSchema.nullable(),
});

export type ExecutionLimitSettings = z.infer<typeof executionLimitSettingsSchema>;

/** What an instance has until an admin saves execution limit settings for the first time. */
export const DEFAULT_EXECUTION_LIMIT_SETTINGS: ExecutionLimitSettings = {
	periodUnit: 'month',
	instanceMaxExecutions: null,
	defaultProjectMaxExecutions: null,
};
