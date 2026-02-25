import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetNodeDescriptionTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-node-description',
		description:
			'Get detailed description of a node type including its properties, credentials, inputs, and outputs.',
		inputSchema: z.object({
			nodeType: z.string().describe('Node type identifier (e.g. "n8n-nodes-base.httpRequest")'),
		}),
		outputSchema: z.object({
			name: z.string(),
			displayName: z.string(),
			description: z.string(),
			properties: z.array(
				z.object({
					displayName: z.string(),
					name: z.string(),
					type: z.string(),
					required: z.boolean().optional(),
					description: z.string().optional(),
				}),
			),
			credentials: z
				.array(z.object({ name: z.string(), required: z.boolean().optional() }))
				.optional(),
			inputs: z.array(z.string()),
			outputs: z.array(z.string()),
		}),
		execute: async (inputData) => {
			return await context.nodeService.getDescription(inputData.nodeType);
		},
	});
}
