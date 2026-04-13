import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createCreateDataTableTool } from '../create-data-table.tool';

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

const validInput = {
	name: 'Shopping List',
	columns: [{ name: 'item', type: 'string' as const }],
};

const mockTable = {
	id: 'dt-123',
	name: 'Shopping List',
	columns: [{ id: 'col-1', name: 'item', type: 'string' }],
	createdAt: '2026-01-01',
	updatedAt: '2026-01-01',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createCreateDataTableTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createCreateDataTableTool(context);
		expect(tool.id).toBe('create-data-table');
	});

	describe('when permission requires approval (default)', () => {
		it('suspends for user confirmation on first call', async () => {
			const tool = createCreateDataTableTool(context);
			const suspend = jest.fn();

			await tool.execute!(validInput, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalledTimes(1);
			const payload = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(payload).toEqual(
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					message: expect.stringContaining('Shopping List'),
					severity: 'info',
				}),
			);
		});

		it('creates when resumed with approved: true', async () => {
			(context.dataTableService.create as jest.Mock).mockResolvedValue(mockTable);
			const tool = createCreateDataTableTool(context);

			const result = (await tool.execute!(validInput, {
				agent: { suspend: jest.fn(), resumeData: { approved: true } },
			} as never)) as Record<string, unknown>;

			expect(context.dataTableService.create).toHaveBeenCalled();
			expect(result.table).toEqual(mockTable);
		});

		it('returns denied when resumed with approved: false', async () => {
			const tool = createCreateDataTableTool(context);

			const result = (await tool.execute!(validInput, {
				agent: { suspend: jest.fn(), resumeData: { approved: false } },
			} as never)) as Record<string, unknown>;

			expect(context.dataTableService.create).not.toHaveBeenCalled();
			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
		});
	});

	describe('when permission is always_allow', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					createDataTable: 'always_allow',
				},
			});
		});

		it('creates the table without suspending', async () => {
			(context.dataTableService.create as jest.Mock).mockResolvedValue(mockTable);
			const tool = createCreateDataTableTool(context);

			const result = (await tool.execute!(validInput, {
				agent: { suspend: jest.fn(), resumeData: undefined },
			} as never)) as Record<string, unknown>;

			expect(context.dataTableService.create).toHaveBeenCalledWith(
				'Shopping List',
				[{ name: 'item', type: 'string' }],
				{ projectId: undefined },
			);
			expect(result.table).toEqual(mockTable);
		});

		it('returns denied when table already exists', async () => {
			const conflictError = new Error(
				"Data table with name 'Shopping List' already exists in this project",
			);
			Object.defineProperty(conflictError, 'constructor', {
				value: { name: 'DataTableNameConflictError' },
			});
			// Simulate the cause chain: MastraError wraps the original
			const wrappedError = new Error('wrapped');
			(wrappedError as Error & { cause: Error }).cause = conflictError;

			(context.dataTableService.create as jest.Mock).mockRejectedValue(wrappedError);

			const tool = createCreateDataTableTool(context);

			const result = (await tool.execute!(validInput, {
				agent: { suspend: jest.fn(), resumeData: undefined },
			} as never)) as Record<string, unknown>;

			expect(result.denied).toBe(true);
			expect(result.reason).toContain('already exists');
			expect(result.table).toBeUndefined();
		});

		it('throws non-conflict errors normally', async () => {
			(context.dataTableService.create as jest.Mock).mockRejectedValue(
				new Error('Database connection failed'),
			);

			const tool = createCreateDataTableTool(context);

			await expect(
				tool.execute!(validInput, {
					agent: { suspend: jest.fn(), resumeData: undefined },
				} as never),
			).rejects.toThrow('Database connection failed');
		});
	});

	describe('when permission is blocked', () => {
		beforeEach(() => {
			context = createMockContext({
				permissions: {
					...DEFAULT_INSTANCE_AI_PERMISSIONS,
					createDataTable: 'blocked',
				},
			});
		});

		it('returns denied without calling the service', async () => {
			const tool = createCreateDataTableTool(context);

			const result = (await tool.execute!(validInput, {
				agent: { suspend: jest.fn(), resumeData: undefined },
			} as never)) as Record<string, unknown>;

			expect(context.dataTableService.create).not.toHaveBeenCalled();
			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
		});
	});
});
