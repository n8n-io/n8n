import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createRenameDataTableColumnTool(context: InstanceAiContext) {
	return createTool({
		id: 'rename-data-table-column',
		description: 'Rename a column in a data table.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
			columnId: z.string().describe('ID of the column to rename'),
			newName: z.string().describe('New column name'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
		}),
		execute: async (input) => {
			await context.dataTableService.renameColumn(input.dataTableId, input.columnId, input.newName);
			return { success: true };
		},
	});
}
