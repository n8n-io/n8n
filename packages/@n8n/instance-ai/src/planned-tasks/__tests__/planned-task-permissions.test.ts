import { DEFAULT_INSTANCE_AI_PERMISSIONS, type InstanceAiPermissions } from '@n8n/api-types';

import type { PlannedTask } from '../../types';
import {
	applyPlannedTaskPermissionOverrides,
	findPlannedTasksBlockedByAdmin,
	PLANNED_TASK_PERMISSION_OVERRIDES,
} from '../planned-task-permissions';

describe('PLANNED_TASK_PERMISSION_OVERRIDES', () => {
	describe('build-workflow', () => {
		it('should auto-approve workflow and data-table work owned by the builder task', () => {
			expect(PLANNED_TASK_PERMISSION_OVERRIDES['build-workflow']).toMatchObject({
				createWorkflow: 'always_allow',
				updateWorkflow: 'always_allow',
				runWorkflow: 'always_allow',
				publishWorkflow: 'always_allow',
				createDataTable: 'always_allow',
				mutateDataTableSchema: 'always_allow',
				mutateDataTableRows: 'always_allow',
			});
		});

		it('should not grant destructive or open-ended permissions', () => {
			const overrides = PLANNED_TASK_PERMISSION_OVERRIDES['build-workflow'];

			expect(overrides).not.toHaveProperty('deleteWorkflow');
			expect(overrides).not.toHaveProperty('deleteDataTable');
			expect(overrides).not.toHaveProperty('deleteCredential');
			expect(overrides).not.toHaveProperty('fetchUrl');
			expect(overrides).not.toHaveProperty('readFile');
		});
	});

	describe('checkpoint', () => {
		it('should grant only runWorkflow for the verification step', () => {
			expect(PLANNED_TASK_PERMISSION_OVERRIDES.checkpoint).toEqual({
				runWorkflow: 'always_allow',
			});
		});
	});

	it('should not override permissions for legacy delegate tasks', () => {
		expect(PLANNED_TASK_PERMISSION_OVERRIDES).not.toHaveProperty('delegate');
	});
});

describe('applyPlannedTaskPermissionOverrides', () => {
	const kinds = ['build-workflow', 'checkpoint'] as const;

	it.each(kinds)('lifts require_approval to always_allow for %s overrides', (kind) => {
		const result = applyPlannedTaskPermissionOverrides(DEFAULT_INSTANCE_AI_PERMISSIONS, kind);

		expect(result).toEqual({
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			...PLANNED_TASK_PERMISSION_OVERRIDES[kind],
		});
	});

	it.each(kinds)('keeps blocked permissions when applying %s overrides', (kind) => {
		const overriddenKeys = Object.keys(PLANNED_TASK_PERMISSION_OVERRIDES[kind] ?? {});
		const blocked: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };
		for (const key of Object.keys(blocked) as Array<keyof InstanceAiPermissions>) {
			blocked[key] = 'blocked';
		}

		const result = applyPlannedTaskPermissionOverrides(blocked, kind);

		expect(overriddenKeys.length).toBeGreaterThan(0);
		expect(result).toEqual(blocked);
	});

	it('applies overrides per key and leaves other keys untouched', () => {
		const permissions: InstanceAiPermissions = {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			createWorkflow: 'always_allow',
			publishWorkflow: 'blocked',
			mutateDataTableRows: 'blocked',
			deleteWorkflow: 'always_allow',
			fetchUrl: 'blocked',
		};

		const result = applyPlannedTaskPermissionOverrides(permissions, 'build-workflow');

		expect(result).toEqual({
			...permissions,
			updateWorkflow: 'always_allow',
			runWorkflow: 'always_allow',
			createDataTable: 'always_allow',
			mutateDataTableSchema: 'always_allow',
		});
	});

	it('keeps a blocked runWorkflow for checkpoint overrides', () => {
		const permissions: InstanceAiPermissions = {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			runWorkflow: 'blocked',
		};

		expect(applyPlannedTaskPermissionOverrides(permissions, 'checkpoint')).toEqual(permissions);
	});

	it('does not mutate the input permissions', () => {
		const permissions: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };

		applyPlannedTaskPermissionOverrides(permissions, 'build-workflow');

		expect(permissions).toEqual(DEFAULT_INSTANCE_AI_PERMISSIONS);
	});
});

describe('findPlannedTasksBlockedByAdmin', () => {
	const newBuild: PlannedTask = {
		id: 'new',
		title: 'Build new workflow',
		kind: 'build-workflow',
		spec: 'spec',
		deps: [],
	};
	const editBuild: PlannedTask = { ...newBuild, id: 'edit', workflowId: 'wf-1' };
	const checkpoint: PlannedTask = { ...newBuild, id: 'cp', kind: 'checkpoint', deps: ['new'] };

	it('returns nothing when no save permission is blocked', () => {
		expect(
			findPlannedTasksBlockedByAdmin(
				[newBuild, editBuild, checkpoint],
				DEFAULT_INSTANCE_AI_PERMISSIONS,
			),
		).toEqual([]);
	});

	it('returns nothing when permissions are unknown', () => {
		expect(findPlannedTasksBlockedByAdmin([newBuild], undefined)).toEqual([]);
	});

	it('flags new-workflow builds when createWorkflow is blocked', () => {
		const permissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS, createWorkflow: 'blocked' as const };

		expect(findPlannedTasksBlockedByAdmin([newBuild, editBuild, checkpoint], permissions)).toEqual([
			{ task: newBuild, permission: 'createWorkflow' },
		]);
	});

	it('flags existing-workflow builds when updateWorkflow is blocked', () => {
		const permissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS, updateWorkflow: 'blocked' as const };

		expect(findPlannedTasksBlockedByAdmin([newBuild, editBuild, checkpoint], permissions)).toEqual([
			{ task: editBuild, permission: 'updateWorkflow' },
		]);
	});
});
