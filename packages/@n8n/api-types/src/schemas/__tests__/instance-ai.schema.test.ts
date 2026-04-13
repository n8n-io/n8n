import {
	applyBranchReadOnlyOverrides,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
} from '../instance-ai.schema';

describe('applyBranchReadOnlyOverrides', () => {
	it('should block all write permissions while preserving safe ones', () => {
		const result = applyBranchReadOnlyOverrides({ ...DEFAULT_INSTANCE_AI_PERMISSIONS });

		// These should remain unchanged (safe for read-only instances)
		expect(result.readFilesystem).toBe('require_approval');
		expect(result.fetchUrl).toBe('require_approval');
		expect(result.publishWorkflow).toBe('require_approval');
		expect(result.deleteCredential).toBe('require_approval');
		expect(result.restoreWorkflowVersion).toBe('require_approval');

		// These should all be blocked
		expect(result.createWorkflow).toBe('blocked');
		expect(result.updateWorkflow).toBe('blocked');
		expect(result.runWorkflow).toBe('blocked');
		expect(result.deleteWorkflow).toBe('blocked');
		expect(result.createFolder).toBe('blocked');
		expect(result.deleteFolder).toBe('blocked');
		expect(result.moveWorkflowToFolder).toBe('blocked');
		expect(result.tagWorkflow).toBe('blocked');
		expect(result.createDataTable).toBe('blocked');
		expect(result.deleteDataTable).toBe('blocked');
		expect(result.mutateDataTableSchema).toBe('blocked');
		expect(result.mutateDataTableRows).toBe('blocked');
		expect(result.cleanupTestExecutions).toBe('blocked');
	});

	it('should preserve safe permissions even when set to always_allow', () => {
		const permissions: InstanceAiPermissions = {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			publishWorkflow: 'always_allow',
			deleteCredential: 'always_allow',
			readFilesystem: 'always_allow',
		};

		const result = applyBranchReadOnlyOverrides(permissions);

		expect(result.publishWorkflow).toBe('always_allow');
		expect(result.deleteCredential).toBe('always_allow');
		expect(result.readFilesystem).toBe('always_allow');
	});

	it('should not mutate the original permissions object', () => {
		const original = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };
		applyBranchReadOnlyOverrides(original);

		expect(original.createWorkflow).toBe('require_approval');
	});
});
