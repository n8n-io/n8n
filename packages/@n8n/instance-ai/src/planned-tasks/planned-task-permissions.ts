import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext, PlannedTaskKind } from '../types';

/**
 * Permission overrides applied when a planned task has been approved by the user.
 *
 * Plan approval acts as authorization for the task-family's non-destructive tools,
 * so the sub-agent can execute without a second confirmation prompt.
 *
 * Destructive actions (delete-data-table), open-ended actions (fetch-url, read-file),
 * and credential deletion are intentionally excluded — they always require explicit approval.
 */
export const PLANNED_TASK_PERMISSION_OVERRIDES: Partial<
	Record<PlannedTaskKind, Partial<InstanceAiPermissions>>
> = {
	'manage-data-tables': {
		createDataTable: 'always_allow',
		mutateDataTableSchema: 'always_allow',
		mutateDataTableRows: 'always_allow',
	},
	'build-workflow': {
		runWorkflow: 'always_allow',
		publishWorkflow: 'always_allow',
	},
	// Checkpoint tasks run inside an orchestrator follow-up run. Plan approval
	// authorizes the verification step, so the orchestrator can call
	// verify-built-workflow / executions(action="run") without a second prompt.
	checkpoint: {
		runWorkflow: 'always_allow',
	},
};

/**
 * Returns a shallow clone of the context with plan-approved permission overrides
 * applied for the given task kind. If no overrides exist for the kind, the
 * original context is returned unchanged.
 */
export function applyPlannedTaskPermissions(
	context: InstanceAiContext,
	taskKind: PlannedTaskKind,
): InstanceAiContext {
	const overrides = PLANNED_TASK_PERMISSION_OVERRIDES[taskKind];
	if (!overrides) return context;

	return {
		...context,
		permissions: {
			...context.permissions,
			...overrides,
		} as InstanceAiPermissions,
	};
}
