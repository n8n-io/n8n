import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListWorkflowVersionsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-workflow-versions',
		description:
			'List version history for a workflow (metadata only). Use to discover past versions, ' +
			'see who made changes, and find the active/current draft versions.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow'),
			limit: z
				.number()
				.int()
				.positive()
				.max(100)
				.optional()
				.describe('Max results to return (default 20)'),
			skip: z.number().int().min(0).optional().describe('Number of results to skip (default 0)'),
		}),
		outputSchema: z.object({
			versions: z.array(
				z.object({
					versionId: z.string(),
					name: z.string().nullable(),
					description: z.string().nullable(),
					authors: z.string(),
					createdAt: z.string(),
					autosaved: z.boolean(),
					isActive: z
						.boolean()
						.describe('True when this version is the currently published/active version'),
					isCurrentDraft: z
						.boolean()
						.describe('True when this version is the current draft (latest saved version)'),
				}),
			),
		}),
		execute: async (input) => {
			const versions = await context.workflowService.listVersions!(input.workflowId, {
				limit: input.limit,
				skip: input.skip,
			});
			return { versions };
		},
	});
}
