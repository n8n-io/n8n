import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createPublishWorkflowTool } from '../publish-workflow.tool';

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

describe('createPublishWorkflowTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createPublishWorkflowTool(context);

		expect(tool.id).toBe('publish-workflow');
	});

	describe('when permissions require approval (default)', () => {
		it('suspends for user confirmation on first call', async () => {
			const tool = createPublishWorkflowTool(context);
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

		it('includes versionId in the confirmation message when provided', async () => {
			const tool = createPublishWorkflowTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload.message).toContain('v-42');
			expect(suspendPayload.message).toContain('wf-123');
		});

		it('does not include versionId in message when omitted', async () => {
			const tool = createPublishWorkflowTool(context);
			const suspend = jest.fn();

			await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendPayload.message).toBe('Publish workflow "wf-123"?');
		});

		it('publishes the workflow when resumed with approved: true', async () => {
			const tool = createPublishWorkflowTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.publish).toHaveBeenCalledWith('wf-123', {
				versionId: undefined,
			});
			expect(result).toEqual({ success: true, activeVersionId: 'v-active-1' });
		});

		it('passes versionId to the service when provided', async () => {
			const tool = createPublishWorkflowTool(context);

			await tool.execute!({ workflowId: 'wf-123', versionId: 'v-42' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.publish).toHaveBeenCalledWith('wf-123', {
				versionId: 'v-42',
			});
		});

		it('returns denied when resumed with approved: false', async () => {
			const tool = createPublishWorkflowTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never);

			expect(context.workflowService.publish).not.toHaveBeenCalled();
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

		it('skips confirmation and publishes immediately', async () => {
			const tool = createPublishWorkflowTool(context);
			const suspend = jest.fn();

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).not.toHaveBeenCalled();
			expect(context.workflowService.publish).toHaveBeenCalledWith('wf-123', {
				versionId: undefined,
			});
			expect(result).toEqual({ success: true, activeVersionId: 'v-active-1' });
		});
	});

	describe('error handling', () => {
		it('returns error when publish fails', async () => {
			(context.workflowService.publish as jest.Mock).mockRejectedValue(
				new Error('Activation failed'),
			);
			const tool = createPublishWorkflowTool(context);

			const result = await tool.execute!({ workflowId: 'wf-123' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never);

			expect(result).toEqual({
				success: false,
				error: 'Activation failed',
			});
		});
	});
});
