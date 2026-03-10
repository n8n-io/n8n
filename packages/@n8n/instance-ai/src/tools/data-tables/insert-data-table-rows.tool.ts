import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createInsertDataTableRowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'insert-data-table-rows',
		description:
			'Insert rows into a data table. Max 100 rows per call. ' +
			'Each row is an object mapping column names to values.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
			rows: z
				.array(z.record(z.unknown()))
				.min(1)
				.max(100)
				.describe('Array of row objects (column name → value)'),
		}),
		outputSchema: z.object({
			insertedCount: z.number(),
		}),
		execute: async (input) => {
			return await context.dataTableService.insertRows(input.dataTableId, input.rows);
		},
	});
}
