import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createUpdateWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'update-workflow',
		description: 'Update an existing workflow. Only provided fields will be changed.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to update'),
			name: z.string().optional().describe('New name for the workflow'),
			nodes: z
				.array(
					z.object({
						name: z.string(),
						type: z.string(),
						parameters: z.record(z.unknown()).optional(),
						position: z.array(z.number()).length(2),
					}),
				)
				.optional()
				.describe('Updated node list (replaces all nodes)'),
			connections: z.record(z.unknown()).optional().describe('Updated connections map'),
			settings: z.record(z.unknown()).optional().describe('Updated workflow settings'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			active: z.boolean(),
		}),
		execute: async (inputData) => {
			const { workflowId, ...updates } = inputData;
			return await context.workflowService.update(workflowId, updates);
		},
	});
}
