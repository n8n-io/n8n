import { createTool } from '@mastra/core/tools';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetWorkflowAsCodeTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-workflow-as-code',
		description:
			'Convert an existing workflow to TypeScript SDK code. Use this before modifying a workflow — it returns the current workflow as SDK code that you can edit and pass to build-workflow.',
		inputSchema: z.object({
			workflowId: z.string().describe('The ID of the workflow to convert to SDK code'),
		}),
		outputSchema: z.object({
			workflowId: z.string(),
			name: z.string(),
			code: z.string(),
			error: z.string().optional(),
		}),
		execute: async ({ workflowId }) => {
			try {
				// Canvas-first: convert unsaved workflow state to code if available
				let json: Awaited<ReturnType<typeof context.workflowService.getAsWorkflowJSON>>;
				if (
					context.canvasContext?.workflowId === workflowId &&
					context.canvasContext.currentWorkflow
				) {
					json = context.canvasContext.currentWorkflow as unknown as Awaited<
						ReturnType<typeof context.workflowService.getAsWorkflowJSON>
					>;
				} else {
					json = await context.workflowService.getAsWorkflowJSON(workflowId);
				}
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
