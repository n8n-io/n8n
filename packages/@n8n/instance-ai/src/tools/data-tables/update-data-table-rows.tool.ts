import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const filterSchema = z.object({
	type: z.enum(['and', 'or']).describe('Combine filters with AND or OR'),
	filters: z.array(
		z.object({
			columnName: z.string(),
			condition: z.enum(['eq', 'neq', 'like', 'gt', 'gte', 'lt', 'lte']),
			value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
		}),
	),
});

export function createUpdateDataTableRowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'update-data-table-rows',
		description:
			'Update rows matching a filter in a data table. ' +
			'All matching rows receive the same new values.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
			filter: filterSchema.describe('Which rows to update'),
			data: z.record(z.unknown()).describe('Column values to set on matching rows'),
		}),
		outputSchema: z.object({
			updatedCount: z.number(),
		}),
		execute: async (input) => {
			return await context.dataTableService.updateRows(input.dataTableId, input.filter, input.data);
		},
	});
}
