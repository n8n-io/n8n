import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListDataTablesTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-data-tables',
		description: "List all data tables in the user's project. Returns names, IDs, and column info.",
		inputSchema: z.object({}),
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
		execute: async () => {
			const tables = await context.dataTableService.list();
			return { tables };
		},
	});
}
