import { createRenameDataTableTool } from '../../tools/data-table';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';

const createMocks = (overrides?: { error?: Error }) => {
	const dataTableOps = {
		updateDataTable: overrides?.error
			? jest.fn().mockRejectedValue(overrides.error)
			: jest.fn().mockResolvedValue(undefined),
	} as unknown as DataTableUserOperations;
	const telemetry = createTelemetry();
	return { dataTableOps, telemetry };
};

describe('rename_data_table MCP tool', () => {
	test('renames a data table', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createRenameDataTableTool(user, dataTableOps, telemetry);

		const result = await tool.handler(
			{ dataTableId: 'dt-1', projectId: 'proj-1', name: 'Customers' },
			{} as never,
		);

		expect(result.structuredContent).toMatchObject({
			success: true,
			message: "Data table renamed to 'Customers'",
		});
		expect(dataTableOps.updateDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', {
			name: 'Customers',
		});
	});

	test('returns error response and tracks telemetry', async () => {
		const { dataTableOps, telemetry } = createMocks({ error: new Error('Not found') });
		const tool = createRenameDataTableTool(user, dataTableOps, telemetry);

		const result = await tool.handler(
			{ dataTableId: 'dt-1', projectId: 'proj-1', name: 'X' },
			{} as never,
		);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ success: false, message: 'Not found' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				tool_name: 'rename_data_table',
				results: { success: false, error: 'Not found' },
			}),
		);
	});
});
