import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';
import { createDataTablesTool } from '../data-tables.tool';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		dataTableService: {
			list: jest.fn().mockResolvedValue([]),
			getSchema: jest.fn().mockResolvedValue([]),
			queryRows: jest.fn().mockResolvedValue({ count: 0, data: [] }),
			create: jest.fn().mockResolvedValue({}),
			delete: jest.fn().mockResolvedValue(undefined),
			addColumn: jest.fn().mockResolvedValue({}),
			deleteColumn: jest.fn().mockResolvedValue(undefined),
			renameColumn: jest.fn().mockResolvedValue(undefined),
			insertRows: jest.fn().mockResolvedValue({ insertedCount: 0 }),
			updateRows: jest.fn().mockResolvedValue({ updatedCount: 0 }),
			deleteRows: jest.fn().mockResolvedValue({ deletedCount: 0 }),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspendFn: jest.Mock) {
	return { agent: { resumeData: undefined, suspend: suspendFn } } as never;
}

function resumeCtx(approved: boolean) {
	return { agent: { resumeData: { approved } } } as never;
}

function noSuspendCtx() {
	return { agent: { resumeData: undefined, suspend: undefined } } as never;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('data-tables tool', () => {
	// ── Surface filtering ──────────────────────────────────────────────────

	describe('surface filtering', () => {
		it('should support read-only actions on orchestrator surface', async () => {
			const context = createMockContext();
			const tables = [{ id: 'dt-1', name: 'Users', columns: [] }];
			context.dataTableService.list = jest.fn().mockResolvedValue(tables);
			const tool = createDataTablesTool(context, 'orchestrator');

			const result = await tool.execute!({ action: 'list', projectId: 'p1' } as never, {} as never);

			expect(result).toEqual({ tables });
		});

		it('should have a concise description for full surface', () => {
			const context = createMockContext();
			const tool = createDataTablesTool(context, 'full');

			expect(tool.description).toContain('data tables');
		});

		it('should default to full surface when not specified', () => {
			const context = createMockContext();
			const tool = createDataTablesTool(context);

			expect(tool.description).toContain('data tables');
		});
	});

	// ── list ────────────────────────────────────────────────────────────────

	describe('list action', () => {
		it('should call dataTableService.list and return tables', async () => {
			const tables = [
				{
					id: 'dt-1',
					name: 'Users',
					columns: [],
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
				},
			];
			const context = createMockContext();
			(context.dataTableService.list as jest.Mock).mockResolvedValue(tables);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!({ action: 'list' as const }, noSuspendCtx());

			expect(context.dataTableService.list).toHaveBeenCalledWith({ projectId: undefined });
			expect(result).toEqual({ tables });
		});

		it('should pass projectId when provided', async () => {
			const context = createMockContext();
			(context.dataTableService.list as jest.Mock).mockResolvedValue([]);

			const tool = createDataTablesTool(context);
			await tool.execute!({ action: 'list' as const, projectId: 'proj-1' }, noSuspendCtx());

			expect(context.dataTableService.list).toHaveBeenCalledWith({ projectId: 'proj-1' });
		});

		it('should work on orchestrator surface', async () => {
			const tables = [{ id: 'dt-1', name: 'Users' }];
			const context = createMockContext();
			(context.dataTableService.list as jest.Mock).mockResolvedValue(tables);

			const tool = createDataTablesTool(context, 'orchestrator');
			const result = await tool.execute!({ action: 'list' as const }, noSuspendCtx());

			expect(result).toEqual({ tables });
		});
	});

	// ── schema ──────────────────────────────────────────────────────────────

	describe('schema action', () => {
		it('should call dataTableService.getSchema and return columns', async () => {
			const columns = [
				{ id: 'col-1', name: 'email', type: 'string', index: 0 },
				{ id: 'col-2', name: 'age', type: 'number', index: 1 },
			];
			const context = createMockContext();
			(context.dataTableService.getSchema as jest.Mock).mockResolvedValue(columns);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(
				{ action: 'schema' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(context.dataTableService.getSchema).toHaveBeenCalledWith('dt-1', {
				projectId: undefined,
			});
			expect(result).toEqual({ columns });
		});
	});

	// ── query ───────────────────────────────────────────────────────────────

	describe('query action', () => {
		it('should call dataTableService.queryRows with filter, limit, and offset', async () => {
			const queryResult = { count: 1, data: [{ email: 'a@b.com' }] };
			const context = createMockContext();
			(context.dataTableService.queryRows as jest.Mock).mockResolvedValue(queryResult);

			const filter = {
				type: 'and' as const,
				filters: [{ columnName: 'email', condition: 'eq' as const, value: 'a@b.com' }],
			};

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(
				{ action: 'query' as const, dataTableId: 'dt-1', filter, limit: 10, offset: 0 },
				noSuspendCtx(),
			);

			expect(context.dataTableService.queryRows).toHaveBeenCalledWith('dt-1', {
				filter,
				limit: 10,
				offset: 0,
				projectId: undefined,
			});
			expect(result).toEqual(queryResult);
		});

		it('should include hint when more rows are available', async () => {
			const queryResult = { count: 100, data: Array.from({ length: 50 }, (_, i) => ({ id: i })) };
			const context = createMockContext();
			(context.dataTableService.queryRows as jest.Mock).mockResolvedValue(queryResult);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(
				{ action: 'query' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				...queryResult,
				hint: '50 more rows available. Use plan with a manage-data-tables task for bulk operations.',
			});
		});

		it('should include hint with correct remaining count when offset is provided', async () => {
			const queryResult = { count: 100, data: Array.from({ length: 10 }, (_, i) => ({ id: i })) };
			const context = createMockContext();
			(context.dataTableService.queryRows as jest.Mock).mockResolvedValue(queryResult);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(
				{ action: 'query' as const, dataTableId: 'dt-1', offset: 20, limit: 10 },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				...queryResult,
				hint: '70 more rows available. Use plan with a manage-data-tables task for bulk operations.',
			});
		});

		it('should not include hint when all rows are returned', async () => {
			const queryResult = { count: 3, data: [{ id: 1 }, { id: 2 }, { id: 3 }] };
			const context = createMockContext();
			(context.dataTableService.queryRows as jest.Mock).mockResolvedValue(queryResult);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(
				{ action: 'query' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual(queryResult);
			expect(result).not.toHaveProperty('hint');
		});
	});

	// ── create ──────────────────────────────────────────────────────────────

	describe('create action', () => {
		const createInput = {
			action: 'create' as const,
			name: 'Contacts',
			columns: [{ name: 'email', type: 'string' as const }],
		};

		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({ permissions: { createDataTable: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(createInput as never, noSuspendCtx());

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.create).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission is not set', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(createInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Create data table "Contacts"?',
					severity: 'info',
				}),
			);
			expect(context.dataTableService.create).not.toHaveBeenCalled();
		});

		it('should include project name in message when projectId is provided', async () => {
			const context = createMockContext({
				permissions: {},
				workspaceService: {
					getProject: jest
						.fn()
						.mockResolvedValue({ id: 'proj-1', name: 'My Project', type: 'team' }),
					listProjects: jest.fn(),
					tagWorkflow: jest.fn(),
					listTags: jest.fn(),
					createTag: jest.fn(),
					cleanupTestExecutions: jest.fn(),
				},
			});
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!({ ...createInput, projectId: 'proj-1' } as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Create data table "Contacts" in project "My Project"?',
				}),
			);
		});

		it('should execute immediately when permission is always_allow', async () => {
			const table = { id: 'dt-new', name: 'Contacts' };
			const context = createMockContext({ permissions: { createDataTable: 'always_allow' } });
			(context.dataTableService.create as jest.Mock).mockResolvedValue(table);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(createInput as never, noSuspendCtx());

			expect(context.dataTableService.create).toHaveBeenCalledWith(
				'Contacts',
				[{ name: 'email', type: 'string' }],
				{ projectId: undefined },
			);
			expect(result).toEqual({ table });
		});

		it('should create after user approves on resume', async () => {
			const table = { id: 'dt-new', name: 'Contacts' };
			const context = createMockContext({ permissions: {} });
			(context.dataTableService.create as jest.Mock).mockResolvedValue(table);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(createInput as never, resumeCtx(true));

			expect(context.dataTableService.create).toHaveBeenCalled();
			expect(result).toEqual({ table });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(createInput as never, resumeCtx(false));

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.create).not.toHaveBeenCalled();
		});

		it('should return denied when table already exists (name conflict)', async () => {
			const conflictError = new Error(
				"Data table with name 'Contacts' already exists in this project",
			);
			Object.defineProperty(conflictError, 'constructor', {
				value: { name: 'DataTableNameConflictError' },
			});
			const wrappedError = new Error('wrapped');
			(wrappedError as Error & { cause: Error }).cause = conflictError;

			const context = createMockContext({ permissions: { createDataTable: 'always_allow' } });
			(context.dataTableService.create as jest.Mock).mockRejectedValue(wrappedError);

			const tool = createDataTablesTool(context);
			const result = (await tool.execute!(createInput as never, noSuspendCtx())) as Record<
				string,
				unknown
			>;

			expect(result.denied).toBe(true);
			expect(result.reason).toContain('already exists');
		});

		it('should throw non-conflict errors normally', async () => {
			const context = createMockContext({ permissions: { createDataTable: 'always_allow' } });
			(context.dataTableService.create as jest.Mock).mockRejectedValue(
				new Error('Database connection failed'),
			);

			const tool = createDataTablesTool(context);

			await expect(tool.execute!(createInput as never, noSuspendCtx())).rejects.toThrow(
				'Database connection failed',
			);
		});
	});

	// ── delete ──────────────────────────────────────────────────────────────

	describe('delete action', () => {
		const deleteInput = { action: 'delete' as const, dataTableId: 'dt-1' };

		it('should return denied when deleteDataTable permission is blocked', async () => {
			const context = createMockContext({ permissions: { deleteDataTable: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteInput as never, noSuspendCtx());

			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.delete).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(deleteInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message:
						'Delete data table "dt-1"? This will permanently remove the table and all its data.',
					severity: 'destructive',
				}),
			);
			expect(context.dataTableService.delete).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { deleteDataTable: 'always_allow' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteInput as never, noSuspendCtx());

			expect(context.dataTableService.delete).toHaveBeenCalledWith('dt-1', {
				projectId: undefined,
			});
			expect(result).toEqual({ success: true });
		});

		it('should delete after user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteInput as never, resumeCtx(true));

			expect(context.dataTableService.delete).toHaveBeenCalledWith('dt-1', {
				projectId: undefined,
			});
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteInput as never, resumeCtx(false));

			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.delete).not.toHaveBeenCalled();
		});
	});

	// ── add-column ──────────────────────────────────────────────────────────

	describe('add-column action', () => {
		const addColumnInput = {
			action: 'add-column' as const,
			dataTableId: 'dt-1',
			columnName: 'age',
			type: 'number' as const,
		};

		it('should return denied when mutateDataTableSchema permission is blocked', async () => {
			const context = createMockContext({ permissions: { mutateDataTableSchema: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(addColumnInput as never, noSuspendCtx());

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.addColumn).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(addColumnInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Add column "age" (number) to data table "dt-1"?',
					severity: 'warning',
				}),
			);
			expect(context.dataTableService.addColumn).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const column = { id: 'col-new', name: 'age', type: 'number', index: 2 };
			const context = createMockContext({ permissions: { mutateDataTableSchema: 'always_allow' } });
			(context.dataTableService.addColumn as jest.Mock).mockResolvedValue(column);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(addColumnInput as never, noSuspendCtx());

			expect(context.dataTableService.addColumn).toHaveBeenCalledWith(
				'dt-1',
				{ name: 'age', type: 'number' },
				{ projectId: undefined },
			);
			expect(result).toEqual({ column });
		});

		it('should add column after user approves on resume', async () => {
			const column = { id: 'col-new', name: 'age', type: 'number', index: 2 };
			const context = createMockContext({ permissions: {} });
			(context.dataTableService.addColumn as jest.Mock).mockResolvedValue(column);

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(addColumnInput as never, resumeCtx(true));

			expect(context.dataTableService.addColumn).toHaveBeenCalled();
			expect(result).toEqual({ column });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(addColumnInput as never, resumeCtx(false));

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.addColumn).not.toHaveBeenCalled();
		});
	});

	// ── delete-column ───────────────────────────────────────────────────────

	describe('delete-column action', () => {
		const deleteColumnInput = {
			action: 'delete-column' as const,
			dataTableId: 'dt-1',
			columnId: 'col-1',
		};

		it('should return denied when mutateDataTableSchema permission is blocked', async () => {
			const context = createMockContext({ permissions: { mutateDataTableSchema: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteColumnInput as never, noSuspendCtx());

			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.deleteColumn).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(deleteColumnInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message:
						'Delete column "col-1" from data table "dt-1"? All data in this column will be permanently lost.',
					severity: 'destructive',
				}),
			);
			expect(context.dataTableService.deleteColumn).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { mutateDataTableSchema: 'always_allow' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteColumnInput as never, noSuspendCtx());

			expect(context.dataTableService.deleteColumn).toHaveBeenCalledWith('dt-1', 'col-1', {
				projectId: undefined,
			});
			expect(result).toEqual({ success: true });
		});

		it('should delete column after user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteColumnInput as never, resumeCtx(true));

			expect(context.dataTableService.deleteColumn).toHaveBeenCalledWith('dt-1', 'col-1', {
				projectId: undefined,
			});
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteColumnInput as never, resumeCtx(false));

			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.deleteColumn).not.toHaveBeenCalled();
		});
	});

	// ── rename-column ───────────────────────────────────────────────────────

	describe('rename-column action', () => {
		const renameColumnInput = {
			action: 'rename-column' as const,
			dataTableId: 'dt-1',
			columnId: 'col-1',
			newName: 'full_name',
		};

		it('should return denied when mutateDataTableSchema permission is blocked', async () => {
			const context = createMockContext({ permissions: { mutateDataTableSchema: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(renameColumnInput as never, noSuspendCtx());

			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.renameColumn).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(renameColumnInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Rename column "col-1" to "full_name" in data table "dt-1"?',
					severity: 'warning',
				}),
			);
			expect(context.dataTableService.renameColumn).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { mutateDataTableSchema: 'always_allow' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(renameColumnInput as never, noSuspendCtx());

			expect(context.dataTableService.renameColumn).toHaveBeenCalledWith(
				'dt-1',
				'col-1',
				'full_name',
				{ projectId: undefined },
			);
			expect(result).toEqual({ success: true });
		});

		it('should rename column after user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(renameColumnInput as never, resumeCtx(true));

			expect(context.dataTableService.renameColumn).toHaveBeenCalledWith(
				'dt-1',
				'col-1',
				'full_name',
				{ projectId: undefined },
			);
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(renameColumnInput as never, resumeCtx(false));

			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.renameColumn).not.toHaveBeenCalled();
		});
	});

	// ── insert-rows ─────────────────────────────────────────────────────────

	describe('insert-rows action', () => {
		const insertRowsInput = {
			action: 'insert-rows' as const,
			dataTableId: 'dt-1',
			rows: [{ email: 'a@b.com' }, { email: 'c@d.com' }],
		};

		it('should return denied when mutateDataTableRows permission is blocked', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(insertRowsInput as never, noSuspendCtx());

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(insertRowsInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Insert 2 row(s) into data table "dt-1"?',
					severity: 'warning',
				}),
			);
			expect(context.dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'always_allow' } });
			(context.dataTableService.insertRows as jest.Mock).mockResolvedValue({ insertedCount: 2 });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(insertRowsInput as never, noSuspendCtx());

			expect(context.dataTableService.insertRows).toHaveBeenCalledWith(
				'dt-1',
				insertRowsInput.rows,
				{ projectId: undefined },
			);
			expect(result).toEqual({ insertedCount: 2 });
		});

		it('should insert rows after user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });
			(context.dataTableService.insertRows as jest.Mock).mockResolvedValue({ insertedCount: 2 });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(insertRowsInput as never, resumeCtx(true));

			expect(context.dataTableService.insertRows).toHaveBeenCalledWith(
				'dt-1',
				insertRowsInput.rows,
				{ projectId: undefined },
			);
			expect(result).toEqual({ insertedCount: 2 });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(insertRowsInput as never, resumeCtx(false));

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('should return artifact metadata (dataTableId, tableName, projectId) in result', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'always_allow' } });
			(context.dataTableService.insertRows as jest.Mock).mockResolvedValue({
				insertedCount: 3,
				dataTableId: 'dt-1',
				tableName: 'Orders',
				projectId: 'proj-1',
			});

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(insertRowsInput as never, noSuspendCtx());

			expect(result).toEqual({
				insertedCount: 3,
				dataTableId: 'dt-1',
				tableName: 'Orders',
				projectId: 'proj-1',
			});
		});
	});

	// ── update-rows ─────────────────────────────────────────────────────────

	describe('update-rows action', () => {
		const updateRowsInput = {
			action: 'update-rows' as const,
			dataTableId: 'dt-1',
			filter: {
				type: 'and' as const,
				filters: [{ columnName: 'status', condition: 'eq' as const, value: 'active' }],
			},
			data: { status: 'archived' },
		};

		it('should return denied when mutateDataTableRows permission is blocked', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(updateRowsInput as never, noSuspendCtx());

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.updateRows).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation when permission needs approval', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(updateRowsInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Update rows in data table "dt-1"?',
					severity: 'warning',
				}),
			);
			expect(context.dataTableService.updateRows).not.toHaveBeenCalled();
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'always_allow' } });
			(context.dataTableService.updateRows as jest.Mock).mockResolvedValue({ updatedCount: 5 });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(updateRowsInput as never, noSuspendCtx());

			expect(context.dataTableService.updateRows).toHaveBeenCalledWith(
				'dt-1',
				updateRowsInput.filter,
				updateRowsInput.data,
				{ projectId: undefined },
			);
			expect(result).toEqual({ updatedCount: 5 });
		});

		it('should update rows after user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });
			(context.dataTableService.updateRows as jest.Mock).mockResolvedValue({ updatedCount: 3 });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(updateRowsInput as never, resumeCtx(true));

			expect(context.dataTableService.updateRows).toHaveBeenCalledWith(
				'dt-1',
				updateRowsInput.filter,
				updateRowsInput.data,
				{ projectId: undefined },
			);
			expect(result).toEqual({ updatedCount: 3 });
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(updateRowsInput as never, resumeCtx(false));

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.updateRows).not.toHaveBeenCalled();
		});
	});

	// ── delete-rows ─────────────────────────────────────────────────────────

	describe('delete-rows action', () => {
		const deleteRowsInput = {
			action: 'delete-rows' as const,
			dataTableId: 'dt-1',
			filter: {
				type: 'and' as const,
				filters: [{ columnName: 'status', condition: 'eq' as const, value: 'inactive' }],
			},
		};

		it('should return denied when mutateDataTableRows permission is blocked', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'blocked' } });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteRowsInput as never, noSuspendCtx());

			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
			expect(context.dataTableService.deleteRows).not.toHaveBeenCalled();
		});

		it('should suspend with destructive confirmation including filter description', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const tool = createDataTablesTool(context);
			await tool.execute!(deleteRowsInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Delete rows where status eq inactive? This cannot be undone.',
					severity: 'destructive',
				}),
			);
			expect(context.dataTableService.deleteRows).not.toHaveBeenCalled();
		});

		it('should format filter description with multiple conditions joined by filter type', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = jest.fn();

			const multiFilterInput = {
				action: 'delete-rows' as const,
				dataTableId: 'dt-1',
				filter: {
					type: 'or' as const,
					filters: [
						{ columnName: 'status', condition: 'eq' as const, value: 'inactive' },
						{ columnName: 'age', condition: 'lt' as const, value: 18 },
					],
				},
			};

			const tool = createDataTablesTool(context);
			await tool.execute!(multiFilterInput as never, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0]![0]).toEqual(
				expect.objectContaining({
					message: 'Delete rows where status eq inactive or age lt 18? This cannot be undone.',
				}),
			);
		});

		it('should execute immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { mutateDataTableRows: 'always_allow' } });
			(context.dataTableService.deleteRows as jest.Mock).mockResolvedValue({
				deletedCount: 10,
				dataTableId: 'dt-1',
				tableName: 'Users',
				projectId: 'proj-1',
			});

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteRowsInput as never, noSuspendCtx());

			expect(context.dataTableService.deleteRows).toHaveBeenCalledWith(
				'dt-1',
				deleteRowsInput.filter,
				{ projectId: undefined },
			);
			expect(result).toEqual({
				success: true,
				deletedCount: 10,
				dataTableId: 'dt-1',
				tableName: 'Users',
				projectId: 'proj-1',
			});
		});

		it('should delete rows after user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });
			(context.dataTableService.deleteRows as jest.Mock).mockResolvedValue({
				deletedCount: 7,
				dataTableId: 'dt-1',
				tableName: 'Users',
				projectId: 'proj-1',
			});

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteRowsInput as never, resumeCtx(true));

			expect(context.dataTableService.deleteRows).toHaveBeenCalledWith(
				'dt-1',
				deleteRowsInput.filter,
				{ projectId: undefined },
			);
			expect(result).toEqual({
				success: true,
				deletedCount: 7,
				dataTableId: 'dt-1',
				tableName: 'Users',
				projectId: 'proj-1',
			});
		});

		it('should return denied when user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createDataTablesTool(context);
			const result = await tool.execute!(deleteRowsInput as never, resumeCtx(false));

			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
			expect(context.dataTableService.deleteRows).not.toHaveBeenCalled();
		});
	});
});
