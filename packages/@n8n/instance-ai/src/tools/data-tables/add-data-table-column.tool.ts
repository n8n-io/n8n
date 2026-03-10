import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export function createAddDataTableColumnTool(context: InstanceAiContext) {
	return createTool({
		id: 'add-data-table-column',
		description: 'Add a new column to an existing data table.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
			name: z.string().describe('Column name (alphanumeric + underscores)'),
			type: columnTypeSchema.describe('Column data type'),
		}),
		outputSchema: z.object({
			column: z.object({
				id: z.string(),
				name: z.string(),
				type: z.string(),
				index: z.number(),
			}),
		}),
		execute: async (input) => {
			const column = await context.dataTableService.addColumn(input.dataTableId, {
				name: input.name,
				type: input.type,
			});
			return { column };
		},
	});
}
