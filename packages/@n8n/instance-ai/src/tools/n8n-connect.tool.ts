import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const N8N_CONNECT_TOOL_ID = DOMAIN_TOOL_IDS.N8N_CONNECT;

const listNodesAction = z.object({
	action: z.literal('list-nodes').describe('List all node types supported by n8n Connect'),
});

const listCredentialTypesAction = z.object({
	action: z
		.literal('list-credential-types')
		.describe('List all credential types supported by n8n Connect'),
});

const nodeOperationsAction = z.object({
	action: z
		.literal('node-operations')
		.describe('Get available operations for a specific node type supported by n8n Connect'),
	nodeType: z.string().describe('The node type to query (e.g. "n8n-nodes-base.openAi")'),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listNodesAction,
		listCredentialTypesAction,
		nodeOperationsAction,
	]),
);

type Input =
	| z.infer<typeof listNodesAction>
	| z.infer<typeof listCredentialTypesAction>
	| z.infer<typeof nodeOperationsAction>;

export function createN8nConnectTool(context: InstanceAiContext) {
	return new Tool(N8N_CONNECT_TOOL_ID)
		.description(
			'Query n8n Connect capabilities: list supported nodes, credential types, or get available operations for a specific node type.',
		)
		.input(inputSchema)
		.handler(async (input) => {
			const parsedInput = inputSchema.parse(input) as Input;

			switch (parsedInput.action) {
				case 'list-nodes': {
					const nodes = (await context.credentialService.listAiGatewayNodes?.()) ?? [];
					return { nodes };
				}
				case 'list-credential-types': {
					const credentialTypes =
						(await context.credentialService.listAiGatewayCredentialTypes?.()) ?? [];
					return { credentialTypes };
				}
				case 'node-operations': {
					const operations =
						(await context.credentialService.getAiGatewayNodeOperations?.(parsedInput.nodeType)) ??
						{};
					return { nodeType: parsedInput.nodeType, operations };
				}
			}
		})
		.build();
}
