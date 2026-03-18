import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListDataTablesTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-data-tables',
		description:
			'List data tables. Defaults to the personal project; pass projectId to list tables in a specific project.',
		inputSchema: z.object({
			projectId: z
				.string()
				.optional()
				.describe('Project ID to list tables from. Defaults to personal project.'),
		}),
		outputSchema: z.object({
			tables: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					projectId: z.string(),
					columns: z.array(z.object({ id: z.string(), name: z.string(), type: z.string() })),
					createdAt: z.string(),
					updatedAt: z.string(),
				}),
			),
		}),
		execute: async (input) => {
			const tables = await context.dataTableService.list({ projectId: input.projectId });
			return { tables };
		},
	});
}
