import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const listTagsInputSchema = z.object({});

export function createListTagsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-tags',
		description:
			'List all available tags. Use this to check existing tags before creating new ones.',
		inputSchema: listTagsInputSchema,
		outputSchema: z.object({
			tags: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
				}),
			),
		}),
		execute: async () => {
			const tags = await context.workspaceService!.listTags();
			return { tags };
		},
	});
}
