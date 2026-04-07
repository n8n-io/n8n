import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const nodeRequestSchema = z.union([
	z.string().describe('Simple node ID, e.g. "n8n-nodes-base.httpRequest"'),
	z.object({
		nodeId: z.string().describe('Node type ID'),
		version: z.string().optional().describe('Version, e.g. "4.3" or "v43"'),
		resource: z.string().optional().describe('Resource discriminator for split nodes'),
		operation: z.string().optional().describe('Operation discriminator for split nodes'),
		mode: z.string().optional().describe('Mode discriminator for split nodes'),
	}),
]);

export const getNodeTypeDefinitionInputSchema = z.object({
	nodeIds: z
		.array(nodeRequestSchema)
		.min(1)
		.max(5)
		.describe('Node IDs to get definitions for (max 5)'),
});

export function createGetNodeTypeDefinitionTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-node-type-definition',
		description:
			'Get TypeScript type definitions for nodes. Returns the SDK type definition that shows all available parameters, their types, and valid values. Use after search-nodes to get exact schemas before calling build-workflow.',
		inputSchema: getNodeTypeDefinitionInputSchema,
		outputSchema: z.object({
			definitions: z.array(
				z.object({
					nodeId: z.string(),
					version: z.string().optional(),
					content: z.string(),
					error: z.string().optional(),
				}),
			),
		}),
		execute: async ({ nodeIds }: z.infer<typeof getNodeTypeDefinitionInputSchema>) => {
			if (!context.nodeService.getNodeTypeDefinition) {
				return {
					definitions: nodeIds.map((req: z.infer<typeof nodeRequestSchema>) => ({
						nodeId: typeof req === 'string' ? req : req.nodeId,
						content: '',
						error: 'Node type definitions are not available.',
					})),
				};
			}

			const definitions = await Promise.all(
				nodeIds.map(async (req: z.infer<typeof nodeRequestSchema>) => {
					const nodeId = typeof req === 'string' ? req : req.nodeId;
					const options = typeof req === 'string' ? undefined : req;

					const result = await context.nodeService.getNodeTypeDefinition!(nodeId, options);

					if (!result) {
						return {
							nodeId,
							content: '',
							error: `No type definition found for '${nodeId}'.`,
						};
					}

					if (result.error) {
						return {
							nodeId,
							content: '',
							error: result.error,
						};
					}

					return {
						nodeId,
						version: result.version,
						content: result.content,
					};
				}),
			);

			return { definitions };
		},
	});
}
