import { createAddDataTableColumnTool } from '../../tools/data-table';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';

const createMocks = (overrides?: { error?: Error }) => {
	const dataTableOps = {
		addColumn: overrides?.error
			? jest.fn().mockRejectedValue(overrides.error)
			: jest.fn().mockResolvedValue({ id: 'col-new', name: 'age', type: 'number' }),
	} as unknown as DataTableUserOperations;
	const telemetry = createTelemetry();
	return { dataTableOps, telemetry };
};

describe('add_data_table_column MCP tool', () => {
	test('adds a column', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createAddDataTableColumnTool(user, dataTableOps, telemetry);

		const result = await tool.handler(
			{ dataTableId: 'dt-1', projectId: 'proj-1', name: 'age', type: 'number' as const },
			{} as never,
		);

		expect(result.structuredContent).toMatchObject({
			success: true,
			column: { id: 'col-new', name: 'age', type: 'number' },
		});
		expect(dataTableOps.addColumn).toHaveBeenCalledWith('dt-1', 'proj-1', {
			name: 'age',
			type: 'number',
		});
	});

	test('returns error response and tracks telemetry', async () => {
		const { dataTableOps, telemetry } = createMocks({ error: new Error('Duplicate') });
		const tool = createAddDataTableColumnTool(user, dataTableOps, telemetry);

		const result = await tool.handler(
			{ dataTableId: 'dt-1', projectId: 'proj-1', name: 'age', type: 'number' as const },
			{} as never,
		);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ success: false, message: 'Duplicate' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				tool_name: 'add_data_table_column',
				results: { success: false, error: 'Duplicate' },
			}),
		);
	});
});
