import { createSearchDataTablesTool } from '../../tools/data-table';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';

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

	const dataTableOps = {
		getManyAndCount: overrides?.error
			? jest.fn().mockRejectedValue(overrides.error)
			: jest.fn().mockResolvedValue({ data, count }),
	} as unknown as DataTableUserOperations;

	const telemetry = createTelemetry();

	return { dataTableOps, telemetry };
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

describe('search_data_tables MCP tool', () => {
	test('creates tool correctly', () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createSearchDataTablesTool(user, dataTableOps, telemetry);

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
		const { dataTableOps, telemetry } = createMocks({ data });
		const tool = createSearchDataTablesTool(user, dataTableOps, telemetry);

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
		const { dataTableOps, telemetry } = createMocks();
		const tool = createSearchDataTablesTool(user, dataTableOps, telemetry);

		await callHandler(tool, { query: 'users', projectId: 'proj-1' });

		expect(dataTableOps.getManyAndCount).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: { name: 'users', projectId: 'proj-1' },
			}),
		);
	});

	test('handles errors gracefully', async () => {
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('DB error'),
		});
		const tool = createSearchDataTablesTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, {});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'DB error',
		});
	});

	test('tracks telemetry on success', async () => {
		const { dataTableOps, telemetry } = createMocks({ data: [], count: 0 });
		const tool = createSearchDataTablesTool(user, dataTableOps, telemetry);

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
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('DB error'),
		});
		const tool = createSearchDataTablesTool(user, dataTableOps, telemetry);

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
