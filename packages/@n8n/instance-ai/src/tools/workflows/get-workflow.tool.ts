import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-workflow',
		description:
			'Get full details of a specific workflow including nodes, connections, settings, and publish state. A workflow is published (running in production) when activeVersionId is not null.',
		inputSchema: z.object({
			workflowId: z.string().describe('The ID of the workflow to retrieve'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			versionId: z.string(),
			activeVersionId: z
				.string()
				.nullable()
				.describe(
					'The published version ID. Non-null means the workflow is published and running on its triggers; null means unpublished.',
				),
			nodes: z.array(
				z.object({
					name: z.string(),
					type: z.string(),
					parameters: z.record(z.unknown()).optional(),
					position: z.array(z.number()).length(2),
				}),
			),
			connections: z.record(z.unknown()),
			settings: z.record(z.unknown()).optional(),
		}),
		execute: async (inputData) => {
			// Canvas-first: return unsaved workflow state if available for the current workflow
			if (
				context.canvasContext?.workflowId === inputData.workflowId &&
				context.canvasContext.currentWorkflow
			) {
				return context.canvasContext.currentWorkflow as unknown as Awaited<
					ReturnType<typeof context.workflowService.get>
				>;
			}
			return await context.workflowService.get(inputData.workflowId);
		},
	});
}
