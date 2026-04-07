import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListWorkflowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-workflows',
		description:
			'List workflows accessible to the current user. Use to discover existing automations.',
		inputSchema: z.object({
			query: z.string().optional().describe('Filter workflows by name'),
			limit: z
				.number()
				.int()
				.positive()
				.max(100)
				.optional()
				.describe('Max results to return (default 50)'),
		}),
		outputSchema: z.object({
			workflows: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					versionId: z.string(),
					activeVersionId: z
						.string()
						.nullable()
						.describe('Non-null when the workflow is published and running in production.'),
					createdAt: z.string(),
					updatedAt: z.string(),
				}),
			),
		}),
		execute: async (inputData) => {
			const workflows = await context.workflowService.list({
				limit: inputData.limit,
				query: inputData.query,
			});
			return { workflows };
		},
	});
}
