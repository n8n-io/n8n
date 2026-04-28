import { createCreateDataTableTool } from '../../tools/data-table';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';

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

	const dataTableOps = {
		createDataTable: overrides?.error
			? jest.fn().mockRejectedValue(overrides.error)
			: jest.fn().mockResolvedValue(createdTable),
		getColumns: jest.fn().mockResolvedValue(columns),
	} as unknown as DataTableUserOperations;

	const telemetry = createTelemetry();

	return { dataTableOps, telemetry };
};

const callHandler = async (
	tool: ReturnType<typeof createCreateDataTableTool>,
	args: {
		projectId: string;
		name: string;
		columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>;
	},
) => await tool.handler(args, {} as never);

describe('create_data_table MCP tool', () => {
	test('creates tool correctly', () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createCreateDataTableTool(user, dataTableOps, telemetry);

		expect(tool.name).toBe('create_data_table');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('creates data table and returns result', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createCreateDataTableTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Users',
			columns: [{ name: 'email', type: 'string' }],
		});

		expect(result.structuredContent).toEqual({
			id: 'dt-1',
			name: 'Users',
			projectId: 'proj-1',
		});

		expect(dataTableOps.createDataTable).toHaveBeenCalledWith('proj-1', {
			name: 'Users',
			columns: [{ name: 'email', type: 'string' }],
		});
	});

	test('returns error response on failure', async () => {
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('Duplicate name'),
		});
		const tool = createCreateDataTableTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Users',
			columns: [{ name: 'email', type: 'string' }],
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ error: 'Duplicate name' });
	});

	test('tracks telemetry on success', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createCreateDataTableTool(user, dataTableOps, telemetry);

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
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('Duplicate name'),
		});
		const tool = createCreateDataTableTool(user, dataTableOps, telemetry);

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
				results: { success: false, error: 'Duplicate name' },
			}),
		);
	});
});
