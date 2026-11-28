import { executionLimitSettingsSchema, type ExecutionLimitSettings } from '@n8n/api-types';

import type { ExecutionLimitChange, PolicyValues, ProjectPolicy } from './execution-limits.types';

export function diffLimitSettings(
	before: ExecutionLimitSettings,
	after: ExecutionLimitSettings,
): ExecutionLimitChange[] {
	return executionLimitSettingsSchema
		.keyof()
		.options.filter((field) => before[field] !== after[field])
		.map((field) => ({
			projectId: null,
			policyId: null,
			field,
			oldValue: before[field],
			newValue: after[field],
		}));
}

/** One change for the policy, or none when the name and the maximum stay the same. */
export function diffPolicy(
	policyId: string,
	before: PolicyValues | null,
	after: PolicyValues | null,
): ExecutionLimitChange[] {
	if (before?.name === after?.name && before?.maxExecutions === after?.maxExecutions) return [];

	const values = (policy: PolicyValues | null) =>
		policy ? { name: policy.name, maxExecutions: policy.maxExecutions } : null;

	return [
		{
			projectId: null,
			policyId,
			field: 'policy',
			oldValue: values(before),
			newValue: values(after),
		},
	];
}

// The row names the new policy, or the old policy when the new value is none.
function policyChange(
	field: 'projectPolicy' | 'newProjectsPolicy',
	projectId: string | null,
	oldPolicyId: string | null,
	newPolicyId: string | null,
): ExecutionLimitChange[] {
	if (oldPolicyId === newPolicyId) return [];

	return [
		{
			projectId,
			policyId: newPolicyId ?? oldPolicyId,
			field,
			oldValue: oldPolicyId,
			newValue: newPolicyId,
		},
	];
}

/**
 * One change for each project whose policy is not `newPolicyId` already. `before` holds
 * the policy of the projects that have one.
 */
export function diffProjectPolicies(
	projectIds: string[],
	before: ReadonlyMap<string, ProjectPolicy>,
	newPolicyId: string | null,
): ExecutionLimitChange[] {
	return [...new Set(projectIds)].flatMap((projectId) =>
		policyChange('projectPolicy', projectId, before.get(projectId)?.policyId ?? null, newPolicyId),
	);
}

export function diffNewProjectsPolicy(
	oldPolicyId: string | null,
	newPolicyId: string | null,
): ExecutionLimitChange[] {
	return policyChange('newProjectsPolicy', null, oldPolicyId, newPolicyId);
}

/**
 * The policy that applies to each project: the lowest maximum when a project has several.
 * The lowest policy id wins between two policies with the same maximum.
 */
export function resolveProjectPolicies(rows: ProjectPolicy[]): {
	byProject: Map<string, ProjectPolicy>;
	projectsWithSeveralPolicies: string[];
} {
	const byProject = new Map<string, ProjectPolicy>();
	const several = new Set<string>();

	for (const row of rows) {
		const current = byProject.get(row.projectId);
		if (current) several.add(row.projectId);
		if (!current || isLower(row, current)) byProject.set(row.projectId, row);
	}

	return { byProject, projectsWithSeveralPolicies: [...several] };
}

function isLower(a: ProjectPolicy, b: ProjectPolicy): boolean {
	return a.maxExecutions === b.maxExecutions
		? a.policyId < b.policyId
		: a.maxExecutions < b.maxExecutions;
}
