import { User } from '@n8n/db';

import {
	createAddDataTableRowsTool,
	createCreateDataTableTool,
	createModifyDataTableTool,
	createSearchDataTablesTool,
} from '../tools/data-table.tool';

import type { DataTableAggregateService } from '@/modules/data-table/data-table-aggregate.service';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { Telemetry } from '@/telemetry';

const user = Object.assign(new User(), { id: 'user-1' });

const createTelemetry = () => ({ track: jest.fn() }) as unknown as Telemetry;

// #region search_data_tables

describe('search_data_tables MCP tool', () => {
	const createMocks = (overrides?: {
		data?: Array<{
			id: string;
			name: string;
			projectId: string;
			createdAt: Date;
			updatedAt: Date;
			columns?: Array<{ id: string; name: string; type: string; index: number }>;
		}>;
		count?: number;
		error?: Error;
	}) => {
		const data = overrides?.data ?? [];
		const count = overrides?.count ?? data.length;

		const dataTableAggregateService = {
			getManyAndCount: overrides?.error
				? jest.fn().mockRejectedValue(overrides.error)
				: jest.fn().mockResolvedValue({ data, count }),
		} as unknown as DataTableAggregateService;

		const telemetry = createTelemetry();

		return { dataTableAggregateService, telemetry };
	};

	const callHandler = async (
		tool: ReturnType<typeof createSearchDataTablesTool>,
		args: { query?: string; projectId?: string; limit?: number },
	) =>
		await tool.handler(
			{
				query: args.query as string,
				projectId: args.projectId as string,
				limit: args.limit as number,
			},
			{} as never,
		);

	test('creates tool correctly', () => {
		const { dataTableAggregateService, telemetry } = createMocks();
		const tool = createSearchDataTablesTool(user, dataTableAggregateService, telemetry);

		expect(tool.name).toBe('search_data_tables');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('returns matching data tables', async () => {
		const now = new Date('2025-01-01T00:00:00Z');
		const data = [
			{
				id: 'dt-1',
				name: 'Users',
				projectId: 'proj-1',
				createdAt: now,
				updatedAt: now,
				columns: [{ id: 'col-1', name: 'email', type: 'string', index: 0 }],
			},
		];
		const { dataTableAggregateService, telemetry } = createMocks({ data });
		const tool = createSearchDataTablesTool(user, dataTableAggregateService, telemetry);

		const result = await callHandler(tool, {});

		expect(result.structuredContent).toEqual({
			data: [
				{
					id: 'dt-1',
					name: 'Users',
					projectId: 'proj-1',
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
					columns: [{ id: 'col-1', name: 'email', type: 'string', index: 0 }],
				},
			],
			count: 1,
		});
	});

	test('passes query and projectId filters', async () => {
		const { dataTableAggregateService, telemetry } = createMocks();
		const tool = createSearchDataTablesTool(user, dataTableAggregateService, telemetry);

		await callHandler(tool, { query: 'users', projectId: 'proj-1' });

		expect(dataTableAggregateService.getManyAndCount).toHaveBeenCalledWith(
			user,
			expect.objectContaining({
				filter: { name: 'users', projectId: 'proj-1' },
			}),
		);
	});

	test('handles errors gracefully', async () => {
		const { dataTableAggregateService, telemetry } = createMocks({
			error: new Error('DB error'),
		});
		const tool = createSearchDataTablesTool(user, dataTableAggregateService, telemetry);

		const result = await callHandler(tool, {});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'DB error',
		});
	});

	test('tracks telemetry on success', async () => {
		const { dataTableAggregateService, telemetry } = createMocks({ data: [], count: 0 });
		const tool = createSearchDataTablesTool(user, dataTableAggregateService, telemetry);

		await callHandler(tool, { query: 'test' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'search_data_tables',
				results: { success: true, data: { count: 0 } },
			}),
		);
	});

	test('tracks telemetry on error', async () => {
		const { dataTableAggregateService, telemetry } = createMocks({
			error: new Error('DB error'),
		});
		const tool = createSearchDataTablesTool(user, dataTableAggregateService, telemetry);

		await callHandler(tool, {});

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'search_data_tables',
				results: { success: false, error: 'DB error' },
			}),
		);
	});
});

// #endregion

// #region create_data_table

describe('create_data_table MCP tool', () => {
	const createMocks = (overrides?: {
		createdTable?: { id: string; name: string; projectId: string };
		columns?: Array<{ id: string; name: string; type: string }>;
		error?: Error;
	}) => {
		const createdTable = overrides?.createdTable ?? {
			id: 'dt-1',
			name: 'Users',
			projectId: 'proj-1',
		};
		const columns = overrides?.columns ?? [{ id: 'col-1', name: 'email', type: 'string' }];

		const dataTableService = {
			createDataTable: overrides?.error
				? jest.fn().mockRejectedValue(overrides.error)
				: jest.fn().mockResolvedValue(createdTable),
			getColumns: jest.fn().mockResolvedValue(columns),
		} as unknown as DataTableService;

		const telemetry = createTelemetry();

		return { dataTableService, telemetry };
	};

	const callHandler = async (
		tool: ReturnType<typeof createCreateDataTableTool>,
		args: {
			projectId: string;
			name: string;
			columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>;
		},
	) => await tool.handler(args, {} as never);

	test('creates tool correctly', () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createCreateDataTableTool(user, dataTableService, telemetry);

		expect(tool.name).toBe('create_data_table');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('creates data table and returns result', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createCreateDataTableTool(user, dataTableService, telemetry);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Users',
			columns: [{ name: 'email', type: 'string' }],
		});

		expect(result.structuredContent).toEqual({
			id: 'dt-1',
			name: 'Users',
			projectId: 'proj-1',
			columns: [{ id: 'col-1', name: 'email', type: 'string' }],
		});

		expect(dataTableService.createDataTable).toHaveBeenCalledWith('proj-1', {
			name: 'Users',
			columns: [{ name: 'email', type: 'string' }],
		});
	});

	test('throws on error', async () => {
		const { dataTableService, telemetry } = createMocks({
			error: new Error('Duplicate name'),
		});
		const tool = createCreateDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				projectId: 'proj-1',
				name: 'Users',
				columns: [{ name: 'email', type: 'string' }],
			}),
		).rejects.toThrow('Duplicate name');
	});

	test('tracks telemetry on success', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createCreateDataTableTool(user, dataTableService, telemetry);

		await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Users',
			columns: [{ name: 'email', type: 'string' }],
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'create_data_table',
				results: { success: true, data: { dataTableId: 'dt-1' } },
			}),
		);
	});

	test('tracks telemetry on error', async () => {
		const { dataTableService, telemetry } = createMocks({
			error: new Error('Duplicate name'),
		});
		const tool = createCreateDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				projectId: 'proj-1',
				name: 'Users',
				columns: [{ name: 'email', type: 'string' }],
			}),
		).rejects.toThrow();

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'create_data_table',
				results: { success: false, error: 'Duplicate name' },
			}),
		);
	});
});

// #endregion

// #region modify_data_table

describe('modify_data_table MCP tool', () => {
	const createMocks = (overrides?: { error?: Error }) => {
		const dataTableService = {
			updateDataTable: overrides?.error
				? jest.fn().mockRejectedValue(overrides.error)
				: jest.fn().mockResolvedValue(undefined),
			addColumn: jest.fn().mockResolvedValue({ id: 'col-new', name: 'age', type: 'number' }),
			deleteColumn: jest.fn().mockResolvedValue(undefined),
			renameColumn: jest.fn().mockResolvedValue({ id: 'col-1', name: 'full_name', type: 'string' }),
		} as unknown as DataTableService;

		const telemetry = createTelemetry();

		return { dataTableService, telemetry };
	};

	const callHandler = async (
		tool: ReturnType<typeof createModifyDataTableTool>,
		args: {
			dataTableId: string;
			projectId: string;
			operation: 'rename_table' | 'add_column' | 'delete_column' | 'rename_column';
			name?: string;
			columnId?: string;
			columnType?: 'string' | 'number' | 'boolean' | 'date';
		},
	) => await tool.handler(args, {} as never);

	test('creates tool correctly', () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		expect(tool.name).toBe('modify_data_table');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('renames a data table', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			operation: 'rename_table',
			name: 'Customers',
		});

		expect(result.structuredContent).toMatchObject({
			success: true,
			message: "Data table renamed to 'Customers'",
		});
		expect(dataTableService.updateDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', {
			name: 'Customers',
		});
	});

	test('adds a column', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			operation: 'add_column',
			name: 'age',
			columnType: 'number',
		});

		expect(result.structuredContent).toMatchObject({
			success: true,
			column: { id: 'col-new', name: 'age', type: 'number' },
		});
		expect(dataTableService.addColumn).toHaveBeenCalledWith('dt-1', 'proj-1', {
			name: 'age',
			type: 'number',
		});
	});

	test('deletes a column', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			operation: 'delete_column',
			columnId: 'col-1',
		});

		expect(result.structuredContent).toMatchObject({
			success: true,
			message: "Column 'col-1' deleted",
		});
		expect(dataTableService.deleteColumn).toHaveBeenCalledWith('dt-1', 'proj-1', 'col-1');
	});

	test('renames a column', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			operation: 'rename_column',
			columnId: 'col-1',
			name: 'full_name',
		});

		expect(result.structuredContent).toMatchObject({
			success: true,
			column: { id: 'col-1', name: 'full_name', type: 'string' },
		});
		expect(dataTableService.renameColumn).toHaveBeenCalledWith('dt-1', 'proj-1', 'col-1', {
			name: 'full_name',
		});
	});

	test('throws when rename_table is missing name', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				operation: 'rename_table',
			}),
		).rejects.toThrow("'name' is required");
	});

	test('throws when add_column is missing columnType', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				operation: 'add_column',
				name: 'age',
			}),
		).rejects.toThrow("'columnType' is required");
	});

	test('throws when delete_column is missing columnId', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				operation: 'delete_column',
			}),
		).rejects.toThrow("'columnId' is required");
	});

	test('throws when rename_column is missing columnId', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				operation: 'rename_column',
				name: 'new_name',
			}),
		).rejects.toThrow("'columnId' is required");
	});

	test('tracks telemetry on success', async () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			operation: 'rename_table',
			name: 'Customers',
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'modify_data_table',
				results: { success: true, data: { operation: 'rename_table' } },
			}),
		);
	});

	test('tracks telemetry on error', async () => {
		const { dataTableService, telemetry } = createMocks({
			error: new Error('Not found'),
		});
		const tool = createModifyDataTableTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				operation: 'rename_table',
				name: 'Customers',
			}),
		).rejects.toThrow();

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'modify_data_table',
				results: { success: false, error: 'Not found' },
			}),
		);
	});
});

// #endregion

// #region add_data_table_rows

describe('add_data_table_rows MCP tool', () => {
	const createMocks = (overrides?: { insertedRows?: number; error?: Error }) => {
		const dataTableService = {
			insertRows: overrides?.error
				? jest.fn().mockRejectedValue(overrides.error)
				: jest.fn().mockResolvedValue({ insertedRows: overrides?.insertedRows ?? 3 }),
		} as unknown as DataTableService;

		const telemetry = createTelemetry();

		return { dataTableService, telemetry };
	};

	const callHandler = async (
		tool: ReturnType<typeof createAddDataTableRowsTool>,
		args: {
			dataTableId: string;
			projectId: string;
			rows: Array<Record<string, string | number | boolean | null>>;
		},
	) => await tool.handler(args, {} as never);

	const sampleRows = [
		{ email: 'a@test.com', name: 'Alice' },
		{ email: 'b@test.com', name: 'Bob' },
		{ email: 'c@test.com', name: 'Charlie' },
	];

	test('creates tool correctly', () => {
		const { dataTableService, telemetry } = createMocks();
		const tool = createAddDataTableRowsTool(user, dataTableService, telemetry);

		expect(tool.name).toBe('add_data_table_rows');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('inserts rows and returns count', async () => {
		const { dataTableService, telemetry } = createMocks({ insertedRows: 3 });
		const tool = createAddDataTableRowsTool(user, dataTableService, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			rows: sampleRows,
		});

		expect(result.structuredContent).toEqual({
			success: true,
			insertedCount: 3,
		});

		expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', 'proj-1', sampleRows, 'count');
	});

	test('throws on error', async () => {
		const { dataTableService, telemetry } = createMocks({
			error: new Error('Column mismatch'),
		});
		const tool = createAddDataTableRowsTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				rows: sampleRows,
			}),
		).rejects.toThrow('Column mismatch');
	});

	test('tracks telemetry on success', async () => {
		const { dataTableService, telemetry } = createMocks({ insertedRows: 3 });
		const tool = createAddDataTableRowsTool(user, dataTableService, telemetry);

		await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			rows: sampleRows,
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'add_data_table_rows',
				results: { success: true, data: { insertedCount: 3 } },
			}),
		);
	});

	test('tracks telemetry on error', async () => {
		const { dataTableService, telemetry } = createMocks({
			error: new Error('Column mismatch'),
		});
		const tool = createAddDataTableRowsTool(user, dataTableService, telemetry);

		await expect(
			callHandler(tool, {
				dataTableId: 'dt-1',
				projectId: 'proj-1',
				rows: sampleRows,
			}),
		).rejects.toThrow();

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'add_data_table_rows',
				results: { success: false, error: 'Column mismatch' },
			}),
		);
	});
});

// #endregion
