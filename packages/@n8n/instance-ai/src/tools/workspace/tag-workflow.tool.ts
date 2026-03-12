import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createTagWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'tag-workflow',
		description:
			'Assign tags to a workflow by name. Creates tags that do not exist yet. Replaces all existing tags on the workflow.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to tag'),
			tags: z.array(z.string()).min(1).describe('Tag names to assign to the workflow'),
		}),
		outputSchema: z.object({
			appliedTags: z.array(z.string()),
		}),
		execute: async (input) => {
			const appliedTags = await context.workspaceService!.tagWorkflow(input.workflowId, input.tags);
			return { appliedTags };
		},
	});
}
