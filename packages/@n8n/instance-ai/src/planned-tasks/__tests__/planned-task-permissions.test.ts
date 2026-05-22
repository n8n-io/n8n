import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext, PlannedTaskKind } from '../../types';
import { applyPlannedTaskPermissions } from '../planned-task-permissions';

function makeContext(
	permissionOverrides: Partial<typeof DEFAULT_INSTANCE_AI_PERMISSIONS> = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		permissions: { ...DEFAULT_INSTANCE_AI_PERMISSIONS, ...permissionOverrides },
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

describe('applyPlannedTaskPermissions', () => {
	describe('build-workflow', () => {
		it('should auto-approve workflow and data-table work owned by the builder task', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, 'build-workflow');

			expect(result.permissions).toMatchObject({
				createWorkflow: 'always_allow',
				updateWorkflow: 'always_allow',
				runWorkflow: 'always_allow',
				publishWorkflow: 'always_allow',
				createDataTable: 'always_allow',
				mutateDataTableSchema: 'always_allow',
				mutateDataTableRows: 'always_allow',
			});
		});

		it('should not affect destructive or open-ended permissions', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, 'build-workflow');

			expect(result.permissions?.deleteWorkflow).toBe('require_approval');
			expect(result.permissions?.deleteDataTable).toBe('require_approval');
			expect(result.permissions?.fetchUrl).toBe('require_approval');
		});

		it('should preserve admin always_allow settings on other keys', () => {
			const context = makeContext({ fetchUrl: 'always_allow' });
			const result = applyPlannedTaskPermissions(context, 'build-workflow');

			expect(result.permissions?.fetchUrl).toBe('always_allow');
			expect(result.permissions?.createWorkflow).toBe('always_allow');
		});
	});

	describe.each<PlannedTaskKind>(['research', 'delegate'])('%s', (kind) => {
		it('should return the original context unchanged', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, kind);

			expect(result).toBe(context);
		});
	});

	it('should return a new context object for overridden kinds', () => {
		const context = makeContext();
		const result = applyPlannedTaskPermissions(context, 'build-workflow');

		expect(result).not.toBe(context);
		expect(result.permissions).not.toBe(context.permissions);
	});

	it('should not mutate the original context', () => {
		const context = makeContext();
		applyPlannedTaskPermissions(context, 'build-workflow');

		expect(context.permissions?.createWorkflow).toBe('require_approval');
		expect(context.permissions?.updateWorkflow).toBe('require_approval');
		expect(context.permissions?.runWorkflow).toBe('require_approval');
	});

	it('should share service references with the original context', () => {
		const context = makeContext();
		const result = applyPlannedTaskPermissions(context, 'build-workflow');

		expect(result.dataTableService).toBe(context.dataTableService);
		expect(result.workflowService).toBe(context.workflowService);
		expect(result.userId).toBe(context.userId);
	});
});
