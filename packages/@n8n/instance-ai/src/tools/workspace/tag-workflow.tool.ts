import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const tagWorkflowInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow to tag'),
	workflowName: z.string().optional().describe('Name of the workflow (for confirmation message)'),
	tags: z.array(z.string()).min(1).describe('Tag names to assign to the workflow'),
});

export const tagWorkflowResumeSchema = z.object({
	approved: z.boolean(),
});

export function createTagWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'tag-workflow',
		description:
			'Assign tags to a workflow by name. Creates tags that do not exist yet. Replaces all existing tags on the workflow.',
		inputSchema: tagWorkflowInputSchema,
		outputSchema: z.object({
			appliedTags: z.array(z.string()),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: tagWorkflowResumeSchema,
		execute: async (input: z.infer<typeof tagWorkflowInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof tagWorkflowResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			const needsApproval = context.permissions?.tagWorkflow !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Tag workflow "${input.workflowName ?? input.workflowId}" (ID: ${input.workflowId}) with [${input.tags.join(', ')}]?`,
					severity: 'info' as const,
				});
				// suspend() never resolves — this line is unreachable but satisfies the type checker
				return { appliedTags: [] };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { appliedTags: [], denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			const appliedTags = await context.workspaceService!.tagWorkflow(input.workflowId, input.tags);
			return { appliedTags };
		},
	});
}
