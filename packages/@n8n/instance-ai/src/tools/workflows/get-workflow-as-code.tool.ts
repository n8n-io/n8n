import { createTool } from '@mastra/core/tools';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const getWorkflowAsCodeInputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to convert to SDK code'),
});

export function createGetWorkflowAsCodeTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-workflow-as-code',
		description:
			'Convert an existing workflow to TypeScript SDK code. Use this before modifying a workflow — it returns the current workflow as SDK code that you can edit and pass to build-workflow.',
		inputSchema: getWorkflowAsCodeInputSchema,
		outputSchema: z.object({
			workflowId: z.string(),
			name: z.string(),
			code: z.string(),
			error: z.string().optional(),
		}),
		execute: async ({ workflowId }: z.infer<typeof getWorkflowAsCodeInputSchema>) => {
			try {
				const json = await context.workflowService.getAsWorkflowJSON(workflowId);
				const code = generateWorkflowCode(json);
				return { workflowId, name: json.name, code };
			} catch (error) {
				return {
					workflowId,
					name: '',
					code: '',
					error: error instanceof Error ? error.message : 'Failed to convert workflow to code',
				};
			}
		},
	});
}
