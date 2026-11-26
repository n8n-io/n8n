import type { ExecutionLimitPeriodUnit, ExecutionLimitSettings } from '@n8n/api-types';

/** The execution limit of one project, as stored. */
export type ProjectLimit = {
	projectId: string;
	maxExecutions: number;
};

/**
 * The limits that apply to an execution of one project. A `null` maximum means that
 * scope has no limit. Each scope is compared with its own usage, so a project limit
 * above the instance limit is returned as it is.
 */
export type ApplicableLimits = {
	periodUnit: ExecutionLimitPeriodUnit;
	instanceMaxExecutions: number | null;
	projectMaxExecutions: number | null;
};

export type ExecutionLimitField =
	| keyof Pick<
			ExecutionLimitSettings,
			'periodUnit' | 'instanceMaxExecutions' | 'defaultProjectMaxExecutions'
	  >
	| keyof Pick<ApplicableLimits, 'projectMaxExecutions'>;

export type ExecutionLimitChange = {
	projectId: string | null;
	field: ExecutionLimitField;
	oldValue: ExecutionLimitPeriodUnit | number | null;
	newValue: ExecutionLimitPeriodUnit | number | null;
};

export type RecordedExecutionLimitChange = ExecutionLimitChange & {
	updatedBy: string | null;
	loginId?: string;
};
