import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-workflow',
		description:
			'Get full details of a specific workflow including nodes, connections, and settings.',
		inputSchema: z.object({
			workflowId: z.string().describe('The ID of the workflow to retrieve'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			active: z.boolean(),
			nodes: z.array(
				z.object({
					name: z.string(),
					type: z.string(),
					parameters: z.record(z.unknown()).optional(),
					position: z.tuple([z.number(), z.number()]),
				}),
			),
			connections: z.record(z.unknown()),
			settings: z.record(z.unknown()).optional(),
		}),
		execute: async (inputData) => {
			return await context.workflowService.get(inputData.workflowId);
		},
	});
}
