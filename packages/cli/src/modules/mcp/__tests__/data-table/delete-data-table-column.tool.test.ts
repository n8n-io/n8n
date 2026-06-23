import { createDeleteDataTableColumnTool } from '../../tools/data-table';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';

import { createTelemetry, user } from './test-utils';

const createMocks = (overrides?: { error?: Error }) => {
	const dataTableOps = {
		deleteColumn: overrides?.error
			? jest.fn().mockRejectedValue(overrides.error)
			: jest.fn().mockResolvedValue(undefined),
	} as unknown as DataTableUserOperations;
	const telemetry = createTelemetry();
	return { dataTableOps, telemetry };
};

describe('delete_data_table_column MCP tool', () => {
	test('deletes a column', async () => {
		const { dataTableOps, telemetry } = createMocks();
		const tool = createDeleteDataTableColumnTool(user, dataTableOps, telemetry);

		const result = await tool.handler(
			{ dataTableId: 'dt-1', projectId: 'proj-1', columnId: 'col-1' },
			{} as never,
		);

		expect(result.structuredContent).toMatchObject({
			success: true,
			message: "Column 'col-1' deleted",
		});
		expect(dataTableOps.deleteColumn).toHaveBeenCalledWith('dt-1', 'proj-1', 'col-1');
	});

	test('returns error response and tracks telemetry', async () => {
		const { dataTableOps, telemetry } = createMocks({ error: new Error('Not found') });
		const tool = createDeleteDataTableColumnTool(user, dataTableOps, telemetry);

		const result = await tool.handler(
			{ dataTableId: 'dt-1', projectId: 'proj-1', columnId: 'col-1' },
			{} as never,
		);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ success: false, message: 'Not found' });

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				tool_name: 'delete_data_table_column',
				results: { success: false, error: 'Not found' },
			}),
		);
	});
});
