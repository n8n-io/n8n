import z from 'zod';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';
import { createGetDataTableRowsTool } from '../../tools/data-table';

const createdAt = new Date('2024-01-01T00:00:00.000Z');
const updatedAt = new Date('2024-01-02T00:00:00.000Z');

const sampleRows = [
	{ id: 1, name: 'Alice', age: 30, createdAt, updatedAt },
	{ id: 2, name: 'Bob', age: 25, createdAt, updatedAt },
];

const createMocks = (overrides?: {
	rows?: Array<Record<string, unknown>>;
	count?: number;
	error?: Error;
}) => {
	const dataTableOps = {
		getManyRowsAndCount: overrides?.error
			? vi.fn().mockRejectedValue(overrides.error)
			: vi.fn().mockResolvedValue({
					data: overrides?.rows ?? sampleRows,
					count: overrides?.count ?? sampleRows.length,
				}),
	} as unknown as DataTableUserOperations;

	const telemetry = createTelemetry();

	return { dataTableOps, telemetry };
};

const callHandler = async (
	tool: ReturnType<typeof createGetDataTableRowsTool>,
	args: Parameters<typeof tool.handler>[0],
) => await tool.handler(args, {} as never);

describe('get_data_table_rows MCP tool', () => {
	test('creates tool correctly', () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		expect(tool.name).toBe('get_data_table_rows');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
		expect(tool.config.annotations?.readOnlyHint).toBe(true);
		expect(typeof tool.handler).toBe('function');
	});

	test('returns rows with dates serialized to ISO strings', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, { dataTableId: 'dt-1', projectId: 'proj-1' });

		expect(result.structuredContent).toEqual({
			rows: [
				{
					id: 1,
					name: 'Alice',
					age: 30,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
				{
					id: 2,
					name: 'Bob',
					age: 25,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
			],
			count: 2,
		});

		expect(dataTableOps.getManyRowsAndCount).toHaveBeenCalledWith('dt-1', 'proj-1', {
			take: 100,
		});
	});

	test('passes filter, sort and pagination options through', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		await callHandler(tool, {
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			filter: {
				type: 'or',
				filters: [
					{ columnName: 'name', condition: 'ilike', value: 'ali' },
					{ columnName: 'age', condition: 'gte', value: 21 },
				],
			},
			sortBy: 'age:desc',
			limit: 10,
			skip: 5,
		});

		expect(dataTableOps.getManyRowsAndCount).toHaveBeenCalledWith('dt-1', 'proj-1', {
			filter: {
				type: 'or',
				filters: [
					{ columnName: 'name', condition: 'ilike', value: 'ali' },
					{ columnName: 'age', condition: 'gte', value: 21 },
				],
			},
			sortBy: ['age', 'DESC'],
			take: 10,
			skip: 5,
		});
	});

	test('defaults filter type to and, condition to eq', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		// Defaults are applied when the registration layer parses args against
		// the input schema, so parse here the same way before calling the handler.
		const args = z.object(tool.config.inputSchema!).parse({
			dataTableId: 'dt-1',
			projectId: 'proj-1',
			filter: { filters: [{ columnName: 'name', value: 'Alice' }] },
			sortBy: 'name:asc',
		});
		await callHandler(tool, args);

		expect(dataTableOps.getManyRowsAndCount).toHaveBeenCalledWith('dt-1', 'proj-1', {
			filter: {
				type: 'and',
				filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
			},
			sortBy: ['name', 'ASC'],
			take: 100,
		});
	});

	test('returns error response on failure', async () => {
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('Unknown column'),
		});
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		const result = await callHandler(tool, { dataTableId: 'dt-1', projectId: 'proj-1' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			rows: [],
			count: 0,
			error: 'Unknown column',
		});
	});

	// MCP clients validate structuredContent against the advertised output
	// schema with additionalProperties forbidden, so both response shapes must
	// parse strictly or the client rejects the response outright.
	test('success and error responses match the declared output schema', async () => {
		const strictOutputSchema = z
			.object(
				createGetDataTableRowsTool(user, createMocks().dataTableOps, createTelemetry()).config
					.outputSchema!,
			)
			.strict();

		const success = createMocks();
		const successResult = await callHandler(
			createGetDataTableRowsTool(user, success.dataTableOps, success.telemetry),
			{ dataTableId: 'dt-1', projectId: 'proj-1' },
		);
		expect(() => strictOutputSchema.parse(successResult.structuredContent)).not.toThrow();

		const failure = createMocks({ error: new Error('Unknown column') });
		const errorResult = await callHandler(
			createGetDataTableRowsTool(user, failure.dataTableOps, failure.telemetry),
			{ dataTableId: 'dt-1', projectId: 'proj-1' },
		);
		expect(() => strictOutputSchema.parse(errorResult.structuredContent)).not.toThrow();
	});

	test('tracks telemetry on success', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		await callHandler(tool, { dataTableId: 'dt-1', projectId: 'proj-1' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'get_data_table_rows',
				results: { success: true, data: { count: 2, returned: 2 } },
			}),
		);
	});

	test('tracks telemetry on error', async () => {
		const { dataTableOps, telemetry } = createMocks({
			error: new Error('Unknown column'),
		});
		const tool = createGetDataTableRowsTool(user, dataTableOps, telemetry);

		await callHandler(tool, { dataTableId: 'dt-1', projectId: 'proj-1' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'get_data_table_rows',
				results: { success: false, error: 'Unknown column' },
			}),
		);
	});
});
