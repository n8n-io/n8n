import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createDeleteWorkflowTool } from '../delete-workflow.tool';

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

describe('createDeleteWorkflowTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id and description', () => {
		const tool = createDeleteWorkflowTool(context);

		expect(tool.id).toBe('delete-workflow');
		expect(tool.description).toContain('Archive a workflow');
	});

	describe('when permissions require approval (default)', () => {
		it('suspends for user confirmation on first call', async () => {
			const tool = createDeleteWorkflowTool(context);
			const suspend = jest.fn();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf-123',
				name: 'Quarterly Cleanup',
			});

			await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalledTimes(1);
			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					message: expect.stringContaining('Quarterly Cleanup'),
					severity: 'warning',
				}),
			);
		});

		it('suspends with a requestId', async () => {
			const tool = createDeleteWorkflowTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-456' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			const suspendArg = (suspend.mock.calls as unknown[][])[0][0] as { requestId: string };
			expect(typeof suspendArg.requestId).toBe('string');
			expect(suspendArg.requestId.length).toBeGreaterThan(0);
		});

		it('archives the workflow when resumed with approved: true', async () => {
			(context.workflowService.archive as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteWorkflowTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.archive).toHaveBeenCalledWith('wf-123');
			expect(result).toEqual({ success: true });
		});

		it('returns denied when resumed with approved: false', async () => {
			const tool = createDeleteWorkflowTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never);

			expect(context.workflowService.archive).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
		});

		it('does not call archive when the user denies', async () => {
			const tool = createDeleteWorkflowTool(context);

			await tool.execute!({ workflowId: 'wf-999' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never);

			expect(context.workflowService.archive).not.toHaveBeenCalled();
		});
	});

	describe('when permissions.deleteWorkflow is always_allow', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					deleteWorkflow: 'always_allow',
				},
			});
		});

		it('skips confirmation and archives immediately', async () => {
			(context.workflowService.archive as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteWorkflowTool(context);
			const suspend = jest.fn();

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).not.toHaveBeenCalled();
			expect(context.workflowService.archive).toHaveBeenCalledWith('wf-123');
			expect(result).toEqual({ success: true });
		});

		it('does not suspend even when resumeData is undefined', async () => {
			(context.workflowService.archive as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteWorkflowTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-456' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('propagates errors from the workflow service on archive', async () => {
			(context.workflowService.archive as jest.Mock).mockRejectedValue(new Error('Archive failed'));
			const tool = createDeleteWorkflowTool(context);

			await expect(
				tool.execute!({ workflowId: 'wf-123' }, {
					agent: { suspend: jest.fn(), resumeData: { approved: true } },
				} as never),
			).rejects.toThrow('Archive failed');
		});
	});
});
