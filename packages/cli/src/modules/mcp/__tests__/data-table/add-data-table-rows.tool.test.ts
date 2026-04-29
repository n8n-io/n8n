import { createAddDataTableRowsTool } from '../../tools/data-table';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';

const createMocks = (overrides?: { insertedRows?: number; error?: Error }) => {
	const dataTableOps = {
		insertRows: overrides?.error
			? jest.fn().mockRejectedValue(overrides.error)
			: jest.fn().mockResolvedValue({ insertedRows: overrides?.insertedRows ?? 3 }),
	} as unknown as DataTableUserOperations;

	const telemetry = createTelemetry();

	return { dataTableOps, telemetry };
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

describe('add_data_table_rows MCP tool', () => {
	test('creates tool correctly', () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createAddDataTableRowsTool(user, dataTableOps, telemetry);

		expect(tool.name).toBe('add_data_table_rows');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('inserts rows and returns count', async () => {
		const { dataTableOps, telemetry } = createMocks({ insertedRows: 3 });
		const tool = createAddDataTableRowsTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			rows: sampleRows,
		});

		expect(result.structuredContent).toEqual({
			success: true,
			insertedCount: 3,
		});

		expect(dataTableOps.insertRows).toHaveBeenCalledWith('dt-1', 'proj-1', sampleRows, 'count');
	});

	test('returns error response on failure', async () => {
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('Column mismatch'),
		});
		const tool = createAddDataTableRowsTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			rows: sampleRows,
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			success: false,
			insertedCount: 0,
			error: 'Column mismatch',
		});
	});

	test('tracks telemetry on success', async () => {
		const { dataTableOps, telemetry } = createMocks({ insertedRows: 3 });
		const tool = createAddDataTableRowsTool(user, dataTableOps, telemetry);

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
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('Column mismatch'),
		});
		const tool = createAddDataTableRowsTool(user, dataTableOps, telemetry);

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
				results: { success: false, error: 'Column mismatch' },
			}),
		);
	});
});
