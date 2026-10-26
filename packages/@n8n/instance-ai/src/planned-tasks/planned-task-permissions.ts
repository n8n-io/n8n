import type { InstanceAiPermissions } from '@n8n/api-types';

import type { PlannedTask, PlannedTaskKind } from '../types';

/**
 * Permission overrides applied when a planned task has been approved by the user.
 *
 * Plan approval acts as authorization for the task-family's non-destructive tools,
 * so the sub-agent can execute without a second confirmation prompt.
 *
 * Destructive actions, open-ended actions (fetch-url, read-file),
 * and credential deletion are intentionally excluded — they always require explicit approval.
 *
 * Apply these through `applyPlannedTaskPermissionOverrides`, which keeps admin blocks.
 */
export const PLANNED_TASK_PERMISSION_OVERRIDES: Partial<
	Record<PlannedTaskKind, Partial<InstanceAiPermissions>>
> = {
	'build-workflow': {
		createWorkflow: 'always_allow',
		updateWorkflow: 'always_allow',
		runWorkflow: 'always_allow',
		publishWorkflow: 'always_allow',
		createDataTable: 'always_allow',
		mutateDataTableSchema: 'always_allow',
		mutateDataTableRows: 'always_allow',
	},
	// Checkpoint tasks run inside an orchestrator follow-up run. Plan approval
	// authorizes the verification step, so the orchestrator can call
	// workflow_builder_verify_built_workflow / workflow_builder_executions(action="run") without a second prompt.
	checkpoint: {
		runWorkflow: 'always_allow',
	},
};

function isPermissionKey(
	permissions: InstanceAiPermissions,
	key: string,
): key is keyof InstanceAiPermissions {
	return key in permissions;
}

/**
 * Returns the permissions for a run that executes an approved planned task.
 * Plan approval stands in for the per-action approval prompt only, so an
 * admin `blocked` setting is never replaced.
 */
export function applyPlannedTaskPermissionOverrides(
	permissions: InstanceAiPermissions,
	kind: PlannedTaskKind,
): InstanceAiPermissions {
	const result = { ...permissions };
	for (const [key, mode] of Object.entries(PLANNED_TASK_PERMISSION_OVERRIDES[kind] ?? {})) {
		if (mode === undefined || !isPermissionKey(result, key) || result[key] === 'blocked') continue;
		result[key] = mode;
	}
	return result;
}

export interface PlannedTaskBlockedByAdmin {
	task: PlannedTask;
	permission: 'createWorkflow' | 'updateWorkflow';
}

/**
 * Returns the build tasks that cannot save their workflow because an admin
 * blocked the save action. The build tool checks the same permission first.
 */
export function findPlannedTasksBlockedByAdmin(
	tasks: PlannedTask[],
	permissions: InstanceAiPermissions | undefined,
): PlannedTaskBlockedByAdmin[] {
	if (!permissions) return [];
	return tasks.flatMap((task) => {
		if (task.kind !== 'build-workflow') return [];
		const permission = task.workflowId ? 'updateWorkflow' : 'createWorkflow';
		return permissions[permission] === 'blocked' ? [{ task, permission }] : [];
	});
}
