import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export function createCreateDataTableTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-data-table',
		description:
			'Create a new data table with typed columns. ' +
			'Column names must be alphanumeric with underscores, no leading numbers.',
		inputSchema: z.object({
			name: z.string().min(1).max(128).describe('Table name'),
			columns: z
				.array(
					z.object({
						name: z.string().describe('Column name (alphanumeric + underscores)'),
						type: columnTypeSchema.describe('Column data type'),
					}),
				)
				.min(1)
				.describe('Column definitions'),
		}),
		outputSchema: z.object({
			table: z.object({
				id: z.string(),
				name: z.string(),
				columns: z.array(z.object({ id: z.string(), name: z.string(), type: z.string() })),
				createdAt: z.string(),
				updatedAt: z.string(),
			}),
		}),
		execute: async (input) => {
			const table = await context.dataTableService.create(input.name, input.columns);
			return { table };
		},
	});
}
