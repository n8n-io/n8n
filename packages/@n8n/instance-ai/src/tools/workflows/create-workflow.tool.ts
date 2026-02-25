import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const nodeSchema = z.object({
	name: z.string().describe('Unique display name for the node'),
	type: z.string().describe('Node type identifier (e.g. "n8n-nodes-base.httpRequest")'),
	parameters: z.record(z.unknown()).optional().describe('Node configuration parameters'),
	position: z.array(z.number()).length(2).describe('Canvas position [x, y]'),
});

export function createCreateWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-workflow',
		description: 'Create a new workflow with the given name, nodes, and connections.',
		inputSchema: z.object({
			name: z.string().describe('Name for the new workflow'),
			nodes: z.array(nodeSchema).optional().describe('Nodes to include'),
			connections: z.record(z.unknown()).optional().describe('Node connections map'),
			settings: z.record(z.unknown()).optional().describe('Workflow settings'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			active: z.boolean(),
			nodes: z.array(nodeSchema),
			connections: z.record(z.unknown()),
		}),
		execute: async (inputData) => {
			return await context.workflowService.create({
				name: inputData.name,
				nodes: inputData.nodes,
				connections: inputData.connections,
				settings: inputData.settings,
			});
		},
	});
}
