import '../../openapi-extend';
import { z } from 'zod';

import {
	executionLimitMaxExecutionsSchema,
	executionLimitPeriodUnitSchema,
	type ExecutionLimitPeriodUnit,
} from '../../schemas/execution-limit-settings.schema';
import { Z } from '../../zod-class';

const executionUsageShape = {
	periodUnit: executionLimitPeriodUnitSchema.openapi({
		description: 'The period over which executions are counted.',
		example: 'month',
	}),
	periodStart: z.string().date().openapi({
		format: 'date',
		description: 'The first UTC day of the current period.',
		example: '2026-11-01',
	}),
	resetsAt: z.string().datetime().openapi({
		description: 'Start of the next period, at 00:00 UTC.',
		example: '2026-12-01T00:00:00.000Z',
	}),
	maxExecutions: executionLimitMaxExecutionsSchema.nullable().openapi({
		description:
			'Maximum executions allowed for the scope per period, or null when the scope has no limit.',
		example: 100_000,
	}),
	workflowExecutions: z.number().int().min(0).openapi({
		description: 'Workflow executions counted in the current period.',
		example: 42_500,
	}),
	remaining: z.number().int().min(0).nullable().openapi({
		description:
			'Executions left before the limit is reached, never below 0, or null when the scope has no limit.',
		example: 57_500,
	}),
};

/** Read-only execution usage of a scope. Shared by the internal and the public API. */
export class ExecutionUsageDto extends Z.class(executionUsageShape) {}

/** Same structure as `ExecutionUsage` in the execution limits backend module. */
export type ExecutionUsageSource = {
	period: { unit: ExecutionLimitPeriodUnit; firstDay: string; resetsAt: Date };
	executions: number;
};

export function toExecutionUsage(
	usage: ExecutionUsageSource,
	maxExecutions: number | null,
): ExecutionUsageDto {
	return {
		periodUnit: usage.period.unit,
		periodStart: usage.period.firstDay,
		resetsAt: usage.period.resetsAt.toISOString(),
		maxExecutions,
		workflowExecutions: usage.executions,
		remaining: maxExecutions === null ? null : Math.max(0, maxExecutions - usage.executions),
	};
}
