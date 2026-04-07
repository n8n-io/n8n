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

export function createQueryDataTableRowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'query-data-table-rows',
		description:
			'Query rows from a data table with optional filtering. ' +
			'Returns matching rows and total count.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
			filter: filterSchema.optional().describe('Row filter conditions'),
			limit: z
				.number()
				.int()
				.positive()
				.max(100)
				.optional()
				.describe('Max rows to return (default 50)'),
			offset: z.number().int().min(0).optional().describe('Number of rows to skip'),
		}),
		outputSchema: z.object({
			count: z.number(),
			data: z.array(z.record(z.unknown())),
			hint: z.string().optional(),
		}),
		execute: async (input) => {
			const result = await context.dataTableService.queryRows(input.dataTableId, {
				filter: input.filter,
				limit: input.limit,
				offset: input.offset,
			});

			const returnedRows = result.data.length;
			const remaining = result.count - (input.offset ?? 0) - returnedRows;

			if (remaining > 0) {
				return {
					...result,
					hint: `${remaining} more rows available. Use plan with a manage-data-tables task for bulk operations.`,
				};
			}

			return result;
		},
	});
}
