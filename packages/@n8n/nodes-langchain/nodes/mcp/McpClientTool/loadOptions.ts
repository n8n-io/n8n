import { type ILoadOptionsFunctions, type INodePropertyOptions } from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import {
	connectMcpClient,
	getAllTools,
	getAuthHeaders,
	mapToNodeOperationError,
	tryRefreshOAuth2Token,
} from '../shared/utils';

export async function getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const node = this.getNode();
	let serverTransport: McpServerTransport;
	let endpointUrl: string;
	if (node.typeVersion === 1) {
		serverTransport = 'sse';
		endpointUrl = this.getNodeParameter('sseEndpoint') as string;
	} else {
		// Get serverTransport parameter with proper fallback based on version
		// For version 1.1, default is 'sse', for 1.2+ default is 'httpStreamable'
		const defaultTransport: McpServerTransport =
			node.typeVersion >= 1.2 ? 'httpStreamable' : 'sse';
		
		const transportParam = this.getNodeParameter('serverTransport', 0, defaultTransport);
		serverTransport = (transportParam as McpServerTransport) || defaultTransport;
		
		// Validate transport value
		if (serverTransport !== 'sse' && serverTransport !== 'httpStreamable') {
			serverTransport = defaultTransport;
		}
		
		endpointUrl = this.getNodeParameter('endpointUrl') as string;
	}
	const { headers } = await getAuthHeaders(this, authentication);
	const client = await connectMcpClient({
		serverTransport,
		endpointUrl,
		headers,
		name: node.type,
		version: node.typeVersion,
		onUnauthorized: async (headers) => await tryRefreshOAuth2Token(this, authentication, headers),
	});

	if (!client.ok) {
		throw mapToNodeOperationError(node, client.error);
	}

	const tools = await getAllTools(client.result);
	return tools.map((tool) => ({
		name: tool.name,
		value: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
	}));
}
