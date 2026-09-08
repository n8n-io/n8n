import { PLANNED_TASK_PERMISSION_OVERRIDES } from '../planned-task-permissions';

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
