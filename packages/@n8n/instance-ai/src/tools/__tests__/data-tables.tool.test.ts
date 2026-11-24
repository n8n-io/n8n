import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import { createDataTableTool } from '../data-tables.tool';
import { createDataTableToolRouter, createMockContext } from './data-table-tools-test-utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function noSuspendCtx() {
	return { resumeData: undefined, suspend: undefined } as never;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('data table tools', () => {
	// ── Tool construction ──────────────────────────────────────────────────

	describe('tool construction', () => {
		it('should require loading data-table-manager before use', () => {
			const context = createMockContext();
			const tool = createDataTableTool(context, 'list');

			expect(tool.description).toContain('data tables');
			expect(tool.description).toContain('data-table-manager');
			expect(tool.description).toContain('load_skill');
			expect(tool.description).toContain('what data tables do I have?');
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
			(context.dataTableService.list as Mock).mockResolvedValue(tables);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(tool, { action: 'list' as const }, noSuspendCtx());

			expect(context.dataTableService.list).toHaveBeenCalledWith({ projectId: undefined });
			expect(result).toEqual({ tables });
		});

		it('should pass projectId when provided', async () => {
			const context = createMockContext();
			(context.dataTableService.list as Mock).mockResolvedValue([]);

			const tool = createDataTableToolRouter(context);
			await executeTool(tool, { action: 'list' as const, projectId: 'proj-1' }, noSuspendCtx());

			expect(context.dataTableService.list).toHaveBeenCalledWith({ projectId: 'proj-1' });
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
			(context.dataTableService.getSchema as Mock).mockResolvedValue(columns);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'schema' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(context.dataTableService.getSchema).toHaveBeenCalledWith('dt-1', {
				projectId: undefined,
			});
			expect(result).toEqual({ dataTableId: 'dt-1', columns });
		});

		it('should include resolved table metadata when available', async () => {
			const columns = [{ id: 'col-1', name: 'email', type: 'string', index: 0 }];
			const context = createMockContext({
				dataTableService: {
					...createMockContext().dataTableService,
					resolveTableReference: vi.fn().mockResolvedValue({
						id: 'dt-resolved',
						name: 'Signups',
						projectId: 'proj-1',
					}),
				},
			});
			(context.dataTableService.getSchema as Mock).mockResolvedValue(columns);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'schema' as const, dataTableId: 'Signups', projectId: 'proj-1' },
				noSuspendCtx(),
			);

			expect(context.dataTableService.resolveTableReference).toHaveBeenCalledWith('Signups', {
				projectId: 'proj-1',
				permission: 'read',
			});
			expect(result).toEqual({
				dataTableId: 'dt-resolved',
				dataTableName: 'Signups',
				projectId: 'proj-1',
				columns,
			});
		});
	});

	// ── query ───────────────────────────────────────────────────────────────

	describe('query action', () => {
		it('should call dataTableService.queryRows with filter, limit, and offset', async () => {
			const queryResult = { count: 1, data: [{ email: 'a@b.com' }] };
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const filter = {
				type: 'and' as const,
				filters: [{ columnName: 'email', condition: 'eq' as const, value: 'a@b.com' }],
			};

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', filter, limit: 10, offset: 0 },
				noSuspendCtx(),
			);

			expect(context.dataTableService.queryRows).toHaveBeenCalledWith('dt-1', {
				filter,
				limit: 10,
				offset: 0,
				projectId: undefined,
			});
			expect(result).toEqual({ dataTableId: 'dt-1', ...queryResult });
		});

		it('should accept ilike filters and pass them through to the service', async () => {
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue({ count: 0, data: [] });

			const filter = {
				type: 'and' as const,
				filters: [{ columnName: 'name', condition: 'ilike' as const, value: '%Vivo%' }],
			};

			const tool = createDataTableToolRouter(context);
			await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', filter, limit: 5 },
				noSuspendCtx(),
			);

			expect(context.dataTableService.queryRows).toHaveBeenCalledWith('dt-1', {
				filter,
				limit: 5,
				offset: undefined,
				projectId: undefined,
			});
		});

		it('should include hint when more rows are available', async () => {
			const queryResult = { count: 100, data: Array.from({ length: 50 }, (_, i) => ({ id: i })) };
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				dataTableId: 'dt-1',
				...queryResult,
				hint: '50 more rows available. Use additional paginated query_data_table calls for bulk operations.',
			});
		});

		it('should include hint with correct remaining count when offset is provided', async () => {
			const queryResult = { count: 100, data: Array.from({ length: 10 }, (_, i) => ({ id: i })) };
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', offset: 20, limit: 10 },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				dataTableId: 'dt-1',
				...queryResult,
				hint: '70 more rows available. Use additional paginated query_data_table calls for bulk operations.',
			});
		});

		it('should not include hint when all rows are returned', async () => {
			const queryResult = { count: 3, data: [{ id: 1 }, { id: 2 }, { id: 3 }] };
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({ dataTableId: 'dt-1', ...queryResult });
			expect(result).not.toHaveProperty('hint');
		});

		it('should truncate oversized cell values and hint how to fetch full values', async () => {
			const blob = 'x'.repeat(5000);
			const queryResult = {
				count: 1,
				data: [{ name: 'vivo y17', image_url: blob, stock: 3 }],
			};
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool<{ data: Array<Record<string, unknown>>; hint?: string }>(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1' },
				noSuspendCtx(),
			);

			expect(result.data[0].name).toBe('vivo y17');
			expect(result.data[0].stock).toBe(3);
			expect(result.data[0].image_url).toBe(`${'x'.repeat(1024)}… [truncated, 5000 chars total]`);
			expect(result.hint).toContain('image_url');
			expect(result.hint).toContain('fullCellValues: true');
		});

		it('should return full cell values for a filtered query, defaulting the limit to 1', async () => {
			const blob = 'x'.repeat(5000);
			const queryResult = { count: 1, data: [{ image_url: blob }] };
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const filter = {
				type: 'and' as const,
				filters: [{ columnName: 'name', condition: 'eq' as const, value: 'vivo y17' }],
			};

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', filter, fullCellValues: true },
				noSuspendCtx(),
			);

			expect(context.dataTableService.queryRows).toHaveBeenCalledWith('dt-1', {
				filter,
				limit: 1,
				offset: undefined,
				projectId: undefined,
			});
			expect(result).toEqual({ dataTableId: 'dt-1', ...queryResult });
			expect(result).not.toHaveProperty('hint');
		});

		it('should cap the limit when full cell values are requested', async () => {
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue({ count: 0, data: [] });

			const filter = {
				type: 'and' as const,
				filters: [{ columnName: 'name', condition: 'like' as const, value: '%vivo%' }],
			};

			const tool = createDataTableToolRouter(context);
			await executeTool(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', filter, fullCellValues: true, limit: 20 },
				noSuspendCtx(),
			);

			expect(context.dataTableService.queryRows).toHaveBeenCalledWith('dt-1', {
				filter,
				limit: 5,
				offset: undefined,
				projectId: undefined,
			});
		});

		it('should ignore fullCellValues and keep truncating when the query has no filter', async () => {
			const blob = 'x'.repeat(5000);
			const queryResult = { count: 1, data: [{ image_url: blob }] };
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool<{ data: Array<Record<string, unknown>>; hint?: string }>(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', fullCellValues: true },
				noSuspendCtx(),
			);

			expect(context.dataTableService.queryRows).toHaveBeenCalledWith('dt-1', {
				filter: undefined,
				limit: undefined,
				offset: undefined,
				projectId: undefined,
			});
			expect(result.data[0].image_url).toBe(`${'x'.repeat(1024)}… [truncated, 5000 chars total]`);
			expect(result.hint).toContain('fullCellValues was ignored');
		});

		it('should combine truncation and pagination hints', async () => {
			const blob = 'x'.repeat(2000);
			const queryResult = {
				count: 10,
				data: Array.from({ length: 5 }, (_, i) => ({ id: i, payload: blob })),
			};
			const context = createMockContext();
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool<{ hint?: string }>(
				tool,
				{ action: 'query' as const, dataTableId: 'dt-1', limit: 5 },
				noSuspendCtx(),
			);

			expect(result.hint).toContain('payload');
			expect(result.hint).toContain('5 more rows available.');
		});

		it('should include resolved table metadata when available', async () => {
			const queryResult = { count: 1, data: [{ email: 'a@b.com' }] };
			const context = createMockContext({
				dataTableService: {
					...createMockContext().dataTableService,
					resolveTableReference: vi.fn().mockResolvedValue({
						id: 'dt-resolved',
						name: 'Signups',
						projectId: 'proj-1',
					}),
				},
			});
			(context.dataTableService.queryRows as Mock).mockResolvedValue(queryResult);

			const tool = createDataTableToolRouter(context);
			const result = await executeTool(
				tool,
				{
					action: 'query' as const,
					dataTableId: 'Signups',
					dataTableName: 'Fallback Name',
					projectId: 'proj-1',
				},
				noSuspendCtx(),
			);

			expect(context.dataTableService.resolveTableReference).toHaveBeenCalledWith('Signups', {
				projectId: 'proj-1',
				permission: 'readRow',
			});
			expect(result).toEqual({
				dataTableId: 'dt-resolved',
				dataTableName: 'Signups',
				projectId: 'proj-1',
				...queryResult,
			});
		});
	});

	describe('artifact changes', () => {
		it('reports a table that the agent reads', async () => {
			const onArtifactChanged = vi.fn().mockResolvedValue(undefined);
			const context = createMockContext({ onArtifactChanged });

			const tool = createDataTableToolRouter(context);
			await executeTool(
				tool,
				{ action: 'query', dataTableId: 'dt-1', projectId: 'proj-1' } as never,
				noSuspendCtx(),
			);

			expect(onArtifactChanged).toHaveBeenCalledWith({
				type: 'data-table',
				id: 'dt-1',
				projectId: 'proj-1',
			});
		});
	});
});
