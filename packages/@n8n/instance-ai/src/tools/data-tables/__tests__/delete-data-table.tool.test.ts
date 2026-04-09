import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createDeleteDataTableTool } from '../delete-data-table.tool';

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

describe('createDeleteDataTableTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createDeleteDataTableTool(context);

		expect(tool.id).toBe('delete-data-table');
	});

	describe('when permission is blocked', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					deleteDataTable: 'blocked',
				},
			});
		});

		it('returns denied without calling the service', async () => {
			const tool = createDeleteDataTableTool(context);
			const suspend = jest.fn();

			const result = (await tool.execute!({ dataTableId: 'dt-1' }, {
				agent: { suspend, resumeData: undefined },
			} as never)) as Record<string, unknown>;

			expect(suspend).not.toHaveBeenCalled();
			expect(context.dataTableService.delete).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		});
	});

	describe('when permission requires approval (default)', () => {
		it('suspends for user confirmation on first call', async () => {
			const tool = createDeleteDataTableTool(context);
			const suspend = jest.fn();

			await tool.execute!({ dataTableId: 'dt-1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalledTimes(1);
			const payload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(payload).toEqual(
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					message: expect.stringContaining('dt-1'),
					severity: 'destructive',
				}),
			);
		});

		it('deletes when resumed with approved: true', async () => {
			(context.dataTableService.delete as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteDataTableTool(context);

			const result = (await tool.execute!({ dataTableId: 'dt-1' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never)) as Record<string, unknown>;

			expect(context.dataTableService.delete).toHaveBeenCalledWith('dt-1');
			expect(result).toEqual({ success: true });
		});

		it('returns denied when resumed with approved: false', async () => {
			const tool = createDeleteDataTableTool(context);

			const result = (await tool.execute!({ dataTableId: 'dt-1' }, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never)) as Record<string, unknown>;

			expect(context.dataTableService.delete).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
		});
	});

	describe('when permission is always_allow', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					deleteDataTable: 'always_allow',
				},
			});
		});

		it('skips confirmation and deletes immediately', async () => {
			(context.dataTableService.delete as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteDataTableTool(context);
			const suspend = jest.fn();

			const result = (await tool.execute!({ dataTableId: 'dt-1' }, {
				agent: { suspend, resumeData: undefined },
			} as never)) as Record<string, unknown>;

			expect(suspend).not.toHaveBeenCalled();
			expect(context.dataTableService.delete).toHaveBeenCalledWith('dt-1');
			expect(result).toEqual({ success: true });
		});
	});
});
