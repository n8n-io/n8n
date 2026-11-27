import type { ExecutionLimitPeriodUnit, ExecutionLimitSettings } from '@n8n/api-types';

import type { ExecutionLimitPolicyGroup } from './execution-limit-policy-group-assignment.entity';

/** What an admin sets on a policy. */
export type PolicyValues = {
	name: string;
	maxExecutions: number;
};

export type Policy = PolicyValues & { id: string };

/** One policy of one project, as stored. A project can have several rows. */
export type ProjectPolicy = PolicyValues & {
	projectId: string;
	policyId: string;
};

/** The group that a write can assign a policy to. */
export type AssignablePolicyGroup = Extract<ExecutionLimitPolicyGroup, 'newProjects'>;

/**
 * The limits that apply to an execution of one project. A `null` maximum means that
 * scope has no limit. Each scope is compared with its own usage, so a project limit
 * above the instance limit is returned as it is.
 */
export type ApplicableLimits = {
	periodUnit: ExecutionLimitPeriodUnit;
	instanceMaxExecutions: number | null;
	projectMaxExecutions: number | null;
	/** The policy that sets `projectMaxExecutions`. */
	projectPolicy: Pick<Policy, 'id' | 'name'> | null;
};

/**
 * `policy` is the name or the maximum of a policy. `projectPolicy` and `newProjectsPolicy`
 * are the policy of a project or of the group, as a policy id.
 */
export type ExecutionLimitField =
	| keyof Pick<ExecutionLimitSettings, 'periodUnit' | 'instanceMaxExecutions'>
	| 'policy'
	| 'projectPolicy'
	| 'newProjectsPolicy';

/** A period unit or a policy id as a string, a maximum, or the values of a policy. */
export type ExecutionLimitChangeValue = string | number | PolicyValues;

export type ExecutionLimitChange = {
	projectId: string | null;
	/** The policy that changed, or the policy that was assigned or removed. */
	policyId: string | null;
	field: ExecutionLimitField;
	oldValue: ExecutionLimitChangeValue | null;
	newValue: ExecutionLimitChangeValue | null;
};

export type RecordedExecutionLimitChange = ExecutionLimitChange & {
	updatedBy: string | null;
	loginId?: string;
};
