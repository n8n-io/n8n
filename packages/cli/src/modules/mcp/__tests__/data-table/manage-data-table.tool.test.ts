import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';
import { createManageDataTableTool } from '../../tools/data-table';

const createMocks = (overrides?: { error?: Error }) => {
	const resolveOrReject = <T>(value: T) =>
		overrides?.error
			? vi.fn().mockRejectedValue(overrides.error)
			: vi.fn().mockResolvedValue(value);

	const dataTableOps = {
		createDataTable: resolveOrReject({ id: 'dt-1', name: 'Users', projectId: 'proj-1' }),
		updateDataTable: resolveOrReject(true),
		addColumn: resolveOrReject({ id: 'col-1', name: 'email', type: 'string' }),
		deleteColumn: resolveOrReject(true),
		renameColumn: resolveOrReject({ id: 'col-1', name: 'email_address', type: 'string' }),
		insertRows: resolveOrReject({ insertedRows: 3 }),
	} as unknown as DataTableUserOperations;

	const telemetry = createTelemetry();

	return { dataTableOps, telemetry };
};

const callHandler = async (
	tool: ReturnType<typeof createManageDataTableTool>,
	args: Record<string, unknown>,
) => await tool.handler(args as never, {} as never);

const sampleRows = [
	{ email: 'a@test.com', name: 'Alice' },
	{ email: 'b@test.com', name: 'Bob' },
	{ email: 'c@test.com', name: 'Charlie' },
];

describe('manage_data_table MCP tool', () => {
	test('creates tool correctly', () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createManageDataTableTool(user, dataTableOps, telemetry);

		expect(tool.name).toBe('manage_data_table');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(tool.config.annotations?.destructiveHint).toBe(true);
		expect(typeof tool.handler).toBe('function');
	});

	describe('create', () => {
		test('creates data table and returns it', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'create',
				projectId: 'proj-1',
				name: 'Users',
				columns: [{ name: 'email', type: 'string' }],
			});

			expect(result.structuredContent).toEqual({
				success: true,
				message: "Data table 'Users' created",
				dataTable: { id: 'dt-1', name: 'Users', projectId: 'proj-1' },
			});

			expect(dataTableOps.createDataTable).toHaveBeenCalledWith('proj-1', {
				name: 'Users',
				columns: [{ name: 'email', type: 'string' }],
			});
		});

		test('tracks telemetry with created data table ID', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			await callHandler(tool, {
				operation: 'create',
				projectId: 'proj-1',
				name: 'Users',
				columns: [{ name: 'email', type: 'string' }],
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'manage_data_table',
					parameters: expect.objectContaining({
						operation: 'create',
						projectId: 'proj-1',
						columnCount: 1,
					}),
					results: { success: true, data: { dataTableId: 'dt-1' } },
				}),
			);
		});

		test('rejects a create call without columns', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'create',
				projectId: 'proj-1',
				name: 'Users',
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				success: false,
				message: expect.stringContaining("Invalid parameters for operation 'create'"),
			});
			expect(dataTableOps.createDataTable).not.toHaveBeenCalled();
		});
	});

	describe('rename', () => {
		test('renames the data table', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'rename',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				name: 'Customers',
			});

			expect(result.structuredContent).toEqual({
				success: true,
				message: "Data table renamed to 'Customers'",
			});
			expect(dataTableOps.updateDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', {
				name: 'Customers',
			});
		});

		test('rejects a rename call without dataTableId', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'rename',
				projectId: 'proj-1',
				name: 'Customers',
			});

			expect(result.isError).toBe(true);
			expect(dataTableOps.updateDataTable).not.toHaveBeenCalled();
		});
	});

	describe('add_column', () => {
		test('adds a column and returns it', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'add_column',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				name: 'email',
				columnType: 'string',
			});

			expect(result.structuredContent).toEqual({
				success: true,
				message: "Column 'email' added with type 'string'",
				column: { id: 'col-1', name: 'email', type: 'string' },
			});
			expect(dataTableOps.addColumn).toHaveBeenCalledWith('dt-1', 'proj-1', {
				name: 'email',
				type: 'string',
			});
		});

		test('rejects an invalid column name', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'add_column',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				name: '1-invalid name',
				columnType: 'string',
			});

			expect(result.isError).toBe(true);
			expect(dataTableOps.addColumn).not.toHaveBeenCalled();
		});
	});

	describe('delete_column', () => {
		test('deletes the column', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'delete_column',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				columnId: 'col-1',
			});

			expect(result.structuredContent).toEqual({
				success: true,
				message: "Column 'col-1' deleted",
			});
			expect(dataTableOps.deleteColumn).toHaveBeenCalledWith('dt-1', 'proj-1', 'col-1');
		});
	});

	describe('rename_column', () => {
		test('renames the column and returns it', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'rename_column',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				columnId: 'col-1',
				name: 'email_address',
			});

			expect(result.structuredContent).toEqual({
				success: true,
				message: "Column renamed to 'email_address'",
				column: { id: 'col-1', name: 'email_address', type: 'string' },
			});
			expect(dataTableOps.renameColumn).toHaveBeenCalledWith('dt-1', 'proj-1', 'col-1', {
				name: 'email_address',
			});
		});
	});

	describe('add_rows', () => {
		test('inserts rows and returns count', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'add_rows',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				rows: sampleRows,
			});

			expect(result.structuredContent).toEqual({
				success: true,
				message: 'Inserted 3 row(s)',
				insertedCount: 3,
			});
			expect(dataTableOps.insertRows).toHaveBeenCalledWith('dt-1', 'proj-1', sampleRows, 'count');
		});

		test('tracks telemetry with inserted count', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			await callHandler(tool, {
				operation: 'add_rows',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				rows: sampleRows,
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'manage_data_table',
					parameters: expect.objectContaining({ operation: 'add_rows', rowCount: 3 }),
					results: { success: true, data: { insertedCount: 3 } },
				}),
			);
		});
	});

	describe('error handling', () => {
		test('returns error response when the operation fails', async () => {
			const { dataTableOps, telemetry } = createMocks({ error: new Error('Duplicate name') });
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			const result = await callHandler(tool, {
				operation: 'create',
				projectId: 'proj-1',
				name: 'Users',
				columns: [{ name: 'email', type: 'string' }],
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({ success: false, message: 'Duplicate name' });
		});

		test('tracks telemetry on operation failure', async () => {
			const { dataTableOps, telemetry } = createMocks({ error: new Error('Column mismatch') });
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			await callHandler(tool, {
				operation: 'add_rows',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
				rows: sampleRows,
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'manage_data_table',
					results: { success: false, error: 'Column mismatch' },
				}),
			);
		});

		test('tracks telemetry on parameter validation failure', async () => {
			const { dataTableOps, telemetry } = createMocks();
			const tool = createManageDataTableTool(user, dataTableOps, telemetry);

			await callHandler(tool, {
				operation: 'delete_column',
				projectId: 'proj-1',
				dataTableId: 'dt-1',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'manage_data_table',
					results: {
						success: false,
						error: expect.stringContaining("Invalid parameters for operation 'delete_column'"),
					},
				}),
			);
		});
	});
});
