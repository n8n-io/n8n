import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createRestoreWorkflowVersionTool } from '../restore-workflow-version.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn().mockResolvedValue({ activeVersionId: 'v-active-1' }),
			unpublish: jest.fn(),
			getVersion: jest.fn().mockResolvedValue({
				id: 'v-42',
				name: 'Initial version',
				createdAt: '2025-06-01T12:00:00.000Z',
			}),
			restoreVersion: jest.fn().mockResolvedValue(undefined),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRestoreWorkflowVersionTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createRestoreWorkflowVersionTool(context);

		expect(tool.id).toBe('restore-workflow-version');
	});

	describe('when permissions require approval (default)', () => {
		it('suspends for user confirmation on first call', async () => {
			const tool = createRestoreWorkflowVersionTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalledTimes(1);
			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					message: expect.stringContaining('overwrite the current draft'),
					severity: 'warning',
				}),
			);
		});

		it('includes version name and timestamp in confirmation when available', async () => {
			const tool = createRestoreWorkflowVersionTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload.message).toContain('Initial version');
		});

		it('falls back to versionId when getVersion fails', async () => {
			(context.workflowService.getVersion as jest.Mock).mockRejectedValue(new Error('Not found'));
			const tool = createRestoreWorkflowVersionTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload.message).toContain('v-42');
			expect(suspendPayload.message).toContain('unknown date');
		});

		it('restores the version when resumed with approved: true', async () => {
			const tool = createRestoreWorkflowVersionTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.restoreVersion).toHaveBeenCalledWith('wf-123', 'v-42');
			expect(result).toEqual({ success: true });
		});

		it('returns denied when resumed with approved: false', async () => {
			const tool = createRestoreWorkflowVersionTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never);

			expect(context.workflowService.restoreVersion).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
		});
	});

	describe('when permissions.restoreWorkflowVersion is always_allow', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					restoreWorkflowVersion: 'always_allow',
				},
			});
		});

		it('skips confirmation and restores immediately', async () => {
			const tool = createRestoreWorkflowVersionTool(context);
			const suspend = jest.fn();

			const result = await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).not.toHaveBeenCalled();
			expect(context.workflowService.restoreVersion).toHaveBeenCalledWith('wf-123', 'v-42');
			expect(result).toEqual({ success: true });
		});
	});

	describe('error handling', () => {
		it('returns error when restore fails', async () => {
			(context.workflowService.restoreVersion as jest.Mock).mockRejectedValue(
				new Error('Version not found'),
			);
			const tool = createRestoreWorkflowVersionTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never);

			expect(result).toEqual({
				success: false,
				error: 'Version not found',
			});
		});
	});
});
