import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const getWorkflowVersionInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().describe('ID of the version to retrieve'),
});

export function createGetWorkflowVersionTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-workflow-version',
		description:
			'Get full details of a specific workflow version including nodes and connections. ' +
			'Use to inspect what a version looked like, diff against the current draft, or ' +
			'answer questions like "when did node X change".',
		inputSchema: getWorkflowVersionInputSchema,
		outputSchema: z.object({
			versionId: z.string(),
			name: z.string().nullable(),
			description: z.string().nullable(),
			authors: z.string(),
			createdAt: z.string(),
			autosaved: z.boolean(),
			isActive: z.boolean(),
			isCurrentDraft: z.boolean(),
			nodes: z.array(
				z.object({
					name: z.string(),
					type: z.string(),
					parameters: z.record(z.unknown()).optional(),
					position: z.array(z.number()),
				}),
			),
			connections: z.record(z.unknown()),
		}),
		execute: async (input: z.infer<typeof getWorkflowVersionInputSchema>) => {
			return await context.workflowService.getVersion!(input.workflowId, input.versionId);
		},
	});
}
