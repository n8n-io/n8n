import '../../openapi-extend';

import {
	executionLimitMaxExecutionsSchema,
	executionLimitPeriodUnitSchema,
	type ExecutionLimitSettings,
} from '../../schemas/execution-limit-settings.schema';
import { Z } from '../../zod-class';

const instanceExecutionLimitShape = {
	periodUnit: executionLimitPeriodUnitSchema.openapi({
		description: 'The period over which executions are counted.',
		example: 'month',
	}),
	maxExecutions: executionLimitMaxExecutionsSchema.nullable().openapi({
		description: 'Maximum executions allowed across the instance per period, or null for no limit.',
		example: 100_000,
	}),
	defaultProjectMaxExecutions: executionLimitMaxExecutionsSchema.nullable().openapi({
		description:
			'Default execution limit for new team projects, or null for no default. Cannot be above maxExecutions. Each new team project gets this limit when it is created. Existing projects keep their limits.',
		example: 10_000,
	}),
};

/** Instance execution limit returned by `GET` and `PUT` on both internal and public APIs. */
export class InstanceExecutionLimitDto extends Z.class(instanceExecutionLimitShape) {}

/** Full-object `PUT` body for updating the instance execution limit. */
export class PutInstanceExecutionLimitDto extends Z.class(instanceExecutionLimitShape, {
	strict: true,
}) {}

export function toInstanceExecutionLimit(
	settings: ExecutionLimitSettings,
): InstanceExecutionLimitDto {
	return {
		periodUnit: settings.periodUnit,
		maxExecutions: settings.instanceMaxExecutions,
		defaultProjectMaxExecutions: settings.defaultProjectMaxExecutions,
	};
}
