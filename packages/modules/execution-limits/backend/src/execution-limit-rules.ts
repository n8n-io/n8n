import { executionLimitSettingsSchema, type ExecutionLimitSettings } from '@n8n/api-types';

import type { ExecutionLimitChange, ProjectLimit } from './execution-limits.types';

/** The project ids that occur more than one time in `limits`. */
export function findDuplicateProjectIds(limits: ProjectLimit[]): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const { projectId } of limits) {
		if (seen.has(projectId)) duplicates.add(projectId);
		seen.add(projectId);
	}

	return [...duplicates];
}

/**
 * The project ids with a limit higher than the instance limit. A project limit equal to the
 * instance limit is allowed. With no instance limit, no project limit is too high.
 */
export function findProjectLimitsAboveInstanceLimit(
	limits: ProjectLimit[],
	instanceMaxExecutions: number | null,
): string[] {
	if (instanceMaxExecutions === null) return [];

	return limits
		.filter(({ maxExecutions }) => maxExecutions > instanceMaxExecutions)
		.map(({ projectId }) => projectId);
}

/** A default limit for new projects equal to the instance limit is allowed. */
export function isDefaultProjectLimitAboveInstanceLimit({
	instanceMaxExecutions,
	defaultProjectMaxExecutions,
}: ExecutionLimitSettings): boolean {
	return (
		instanceMaxExecutions !== null &&
		defaultProjectMaxExecutions !== null &&
		defaultProjectMaxExecutions > instanceMaxExecutions
	);
}

export function diffLimitSettings(
	before: ExecutionLimitSettings,
	after: ExecutionLimitSettings,
): ExecutionLimitChange[] {
	return executionLimitSettingsSchema
		.keyof()
		.options.filter((field) => before[field] !== after[field])
		.map((field) => ({
			projectId: null,
			field,
			oldValue: before[field],
			newValue: after[field],
		}));
}

export function diffProjectLimits(
	before: ProjectLimit[],
	after: ProjectLimit[],
): ExecutionLimitChange[] {
	const oldValues = new Map(
		before.map(({ projectId, maxExecutions }) => [projectId, maxExecutions]),
	);
	const newValues = new Map(
		after.map(({ projectId, maxExecutions }) => [projectId, maxExecutions]),
	);

	return [...new Set([...newValues.keys(), ...oldValues.keys()])]
		.map(
			(projectId): ExecutionLimitChange => ({
				projectId,
				field: 'projectMaxExecutions',
				oldValue: oldValues.get(projectId) ?? null,
				newValue: newValues.get(projectId) ?? null,
			}),
		)
		.filter(({ oldValue, newValue }) => oldValue !== newValue);
}
