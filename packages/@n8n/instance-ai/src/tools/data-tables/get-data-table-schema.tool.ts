import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetDataTableSchemaTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-data-table-schema',
		description: 'Get column definitions for a data table. Returns column names, types, and IDs.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
		}),
		outputSchema: z.object({
			columns: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
					index: z.number(),
				}),
			),
		}),
		execute: async (input) => {
			const columns = await context.dataTableService.getSchema(input.dataTableId);
			return { columns };
		},
	});
}
