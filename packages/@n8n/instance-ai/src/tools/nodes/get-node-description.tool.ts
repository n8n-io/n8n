import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const getNodeDescriptionInputSchema = z.object({
	nodeType: z.string().describe('Node type identifier (e.g. "n8n-nodes-base.httpRequest")'),
});

export function createGetNodeDescriptionTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-node-description',
		description:
			'Get detailed description of a node type including its properties, credentials, inputs, and outputs.',
		inputSchema: getNodeDescriptionInputSchema,
		outputSchema: z.object({
			found: z.boolean(),
			error: z.string().optional(),
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
		execute: async (inputData: z.infer<typeof getNodeDescriptionInputSchema>) => {
			try {
				const desc = await context.nodeService.getDescription(inputData.nodeType);
				return { found: true, ...desc };
			} catch {
				return {
					found: false,
					error: `Node type "${inputData.nodeType}" not found. Use the search-nodes tool to discover available node types.`,
					name: inputData.nodeType,
					displayName: '',
					description: '',
					properties: [],
					inputs: [],
					outputs: [],
				};
			}
		},
	});
}
