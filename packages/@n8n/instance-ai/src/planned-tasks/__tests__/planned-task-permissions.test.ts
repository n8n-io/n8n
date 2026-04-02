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
	describe('manage-data-tables', () => {
		it('should auto-approve data table creation and mutation', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, 'manage-data-tables');

			expect(result.permissions).toMatchObject({
				createDataTable: 'always_allow',
				mutateDataTableSchema: 'always_allow',
				mutateDataTableRows: 'always_allow',
			});
		});

		it('should not affect non-data-table permissions', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, 'manage-data-tables');

			expect(result.permissions?.runWorkflow).toBe('require_approval');
			expect(result.permissions?.publishWorkflow).toBe('require_approval');
			expect(result.permissions?.deleteWorkflow).toBe('require_approval');
			expect(result.permissions?.fetchUrl).toBe('require_approval');
			expect(result.permissions?.readFilesystem).toBe('require_approval');
			expect(result.permissions?.deleteCredential).toBe('require_approval');
		});

		it('should preserve admin always_allow settings on other keys', () => {
			const context = makeContext({ fetchUrl: 'always_allow' });
			const result = applyPlannedTaskPermissions(context, 'manage-data-tables');

			expect(result.permissions?.fetchUrl).toBe('always_allow');
			expect(result.permissions?.createDataTable).toBe('always_allow');
		});
	});

	describe('build-workflow', () => {
		it('should auto-approve workflow run and publish', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, 'build-workflow');

			expect(result.permissions).toMatchObject({
				runWorkflow: 'always_allow',
				publishWorkflow: 'always_allow',
			});
		});

		it('should not affect non-workflow permissions', () => {
			const context = makeContext();
			const result = applyPlannedTaskPermissions(context, 'build-workflow');

			expect(result.permissions?.createDataTable).toBe('require_approval');
			expect(result.permissions?.deleteWorkflow).toBe('require_approval');
			expect(result.permissions?.fetchUrl).toBe('require_approval');
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
		const result = applyPlannedTaskPermissions(context, 'manage-data-tables');

		expect(result).not.toBe(context);
		expect(result.permissions).not.toBe(context.permissions);
	});

	it('should not mutate the original context', () => {
		const context = makeContext();
		applyPlannedTaskPermissions(context, 'manage-data-tables');

		expect(context.permissions?.createDataTable).toBe('require_approval');
		expect(context.permissions?.mutateDataTableSchema).toBe('require_approval');
		expect(context.permissions?.mutateDataTableRows).toBe('require_approval');
	});

	it('should share service references with the original context', () => {
		const context = makeContext();
		const result = applyPlannedTaskPermissions(context, 'manage-data-tables');

		expect(result.dataTableService).toBe(context.dataTableService);
		expect(result.workflowService).toBe(context.workflowService);
		expect(result.userId).toBe(context.userId);
	});
});
