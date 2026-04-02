import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListNodesTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-nodes',
		description:
			'List available node types in this n8n instance. Use to discover integrations and triggers.',
		inputSchema: z.object({
			query: z
				.string()
				.optional()
				.describe('Filter nodes by name or description (e.g. "slack", "http")'),
		}),
		outputSchema: z.object({
			nodes: z.array(
				z.object({
					name: z.string(),
					displayName: z.string(),
					description: z.string(),
					group: z.array(z.string()),
					version: z.number(),
				}),
			),
		}),
		execute: async (inputData) => {
			const nodes = await context.nodeService.listAvailable({
				query: inputData.query,
			});
			return { nodes };
		},
	});
}
