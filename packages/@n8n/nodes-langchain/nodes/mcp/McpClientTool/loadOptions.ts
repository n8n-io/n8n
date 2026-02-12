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
		serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
		endpointUrl = this.getNodeParameter('endpointUrl') as string;
	}
	const { headers } = await getAuthHeaders(this, authentication);
	// MCP_CONNECTION: loadOptions.getTools() — connects when user opens include/exclude tool dropdown in editor UI
	console.log(
		'client.connect at UI:include/exclude-dropdown McpClientTool/loadOptions.ts getTools()',
	);
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

	try {
		const tools = await getAllTools(client.result);
		return tools.map((tool) => ({
			name: tool.name,
			value: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
		}));
	} finally {
		console.log(
			'client.close at UI:include/exclude-dropdown McpClientTool/loadOptions.ts getTools()',
		);
		await client.result.close();
	}
}
