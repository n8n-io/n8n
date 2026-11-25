import '../../openapi-extend';

import {
	EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
	executionLimitMaxExecutionsSchema,
	executionLimitPeriodUnitSchema,
	executionLimitVersionSchema,
} from '../../schemas/execution-limit-settings.schema';
import { Z } from '../../zod-class';

const periodUnit = executionLimitPeriodUnitSchema.openapi({
	description: 'Calendar period that counts executions (`day`, `week` or `month`).',
});

const maxExecutions = executionLimitMaxExecutionsSchema.nullable().openapi({
	description: `Maximum number of executions for the instance in each period (1 to ${EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING}), or \`null\` for no limit.`,
});

const defaultProjectMaxExecutions = executionLimitMaxExecutionsSchema.nullable().openapi({
	description: `Default execution limit for new team projects (1 to ${EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING}), or \`null\` for no default. Cannot be above \`maxExecutions\`. Each new team project gets this limit when it is created. Existing projects keep their limits.`,
});

const version = executionLimitVersionSchema.openapi({
	description:
		'Version from the last read. A stale version on PUT is rejected with 409 and nothing changes.',
});

const instanceExecutionLimitShape = {
	periodUnit,
	maxExecutions,
	defaultProjectMaxExecutions,
	version,
};

/** Response body for `GET` and `PUT` of the instance execution limit. */
export class InstanceExecutionLimitDto extends Z.class(instanceExecutionLimitShape) {}

/** Full-object `PUT` body for the instance execution limit. A `GET` body is a valid `PUT` body. */
export class PutInstanceExecutionLimitDto extends Z.class(instanceExecutionLimitShape, {
	strict: true,
}) {}
