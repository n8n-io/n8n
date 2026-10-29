import { z } from 'zod';

const executionLimitPeriodUnitSchema = z.enum(['day', 'week', 'month']);
export const EXECUTION_LIMIT_PERIOD_UNITS = executionLimitPeriodUnitSchema.options;
export type ExecutionLimitPeriodUnit = z.infer<typeof executionLimitPeriodUnitSchema>;

export const EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING = 2_147_483_647;

const maxExecutionsSchema = z
	.number()
	.int()
	.min(1)
	.max(EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING)
	.nullable();

export const executionLimitSettingsSchema = z
	.object({
		periodUnit: executionLimitPeriodUnitSchema,
		maxExecutions: maxExecutionsSchema,
		defaultProjectMaxExecutions: maxExecutionsSchema,
	})
	.strict();

export type ExecutionLimitSettings = z.infer<typeof executionLimitSettingsSchema>;
