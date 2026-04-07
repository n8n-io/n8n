import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createUnpublishWorkflowTool } from '../unpublish-workflow.tool';

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
			publish: jest.fn(),
			unpublish: jest.fn(),
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

describe('createUnpublishWorkflowTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createUnpublishWorkflowTool(context);

		expect(tool.id).toBe('unpublish-workflow');
	});

	describe('when permissions require approval (default)', () => {
		it('suspends for user confirmation on first call', async () => {
			const tool = createUnpublishWorkflowTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalledTimes(1);
			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					message: expect.stringContaining('wf-123'),
					severity: 'warning',
				}),
			);
		});

		it('unpublishes the workflow when resumed with approved: true', async () => {
			(context.workflowService.unpublish as jest.Mock).mockResolvedValue(undefined);
			const tool = createUnpublishWorkflowTool(context);

			const result = (await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never)) as Record<string, unknown>;

			expect(context.workflowService.unpublish).toHaveBeenCalledWith('wf-123');
			expect(result).toEqual({ success: true });
		});

		it('returns denied when resumed with approved: false', async () => {
			const tool = createUnpublishWorkflowTool(context);

			const result = (await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never)) as Record<string, unknown>;

			expect(context.workflowService.unpublish).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
		});
	});

	describe('when permissions.publishWorkflow is always_allow', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					publishWorkflow: 'always_allow',
				},
			});
		});

		it('skips confirmation and unpublishes immediately', async () => {
			(context.workflowService.unpublish as jest.Mock).mockResolvedValue(undefined);
			const tool = createUnpublishWorkflowTool(context);
			const suspend = jest.fn();

			const result = (await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend, resumeData: undefined },
			} as never)) as Record<string, unknown>;

			expect(suspend).not.toHaveBeenCalled();
			expect(context.workflowService.unpublish).toHaveBeenCalledWith('wf-123');
			expect(result).toEqual({ success: true });
		});
	});

	describe('error handling', () => {
		it('returns error when unpublish fails', async () => {
			(context.workflowService.unpublish as jest.Mock).mockRejectedValue(
				new Error('Deactivation failed'),
			);
			const tool = createUnpublishWorkflowTool(context);

			const result = (await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never)) as Record<string, unknown>;

			expect(result).toEqual({
				success: false,
				error: 'Deactivation failed',
			});
		});
	});
});
