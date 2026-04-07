import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const updateWorkflowVersionInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().describe('ID of the version to update'),
	name: z.string().nullable().optional().describe('New name for the version (null to clear)'),
	description: z
		.string()
		.nullable()
		.optional()
		.describe('New description for the version (null to clear)'),
});

export function createUpdateWorkflowVersionTool(context: InstanceAiContext) {
	return createTool({
		id: 'update-workflow-version',
		description:
			'Update the name or description of a workflow version. Use to label versions ' +
			'with meaningful names (e.g. "v1 – initial release") or add descriptions ' +
			'explaining what changed. Only available when the named-versions license feature is active.',
		inputSchema: updateWorkflowVersionInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			error: z.string().optional(),
		}),
		execute: async (input: z.infer<typeof updateWorkflowVersionInputSchema>) => {
			await context.workflowService.updateVersion!(input.workflowId, input.versionId, {
				name: input.name,
				description: input.description,
			});
			return { success: true };
		},
	});
}
