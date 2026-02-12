import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import {
	connectMcpClient,
	getAuthHeaders,
	mapToNodeOperationError,
	tryRefreshOAuth2Token,
} from '../shared/utils';

export async function getTools(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
	const endpointUrl = this.getNodeParameter('endpointUrl') as string;
	const node = this.getNode();
	const { headers } = await getAuthHeaders(this, authentication);
	// MCP_CONNECTION: listSearch.getTools() — connects when user opens tool dropdown in editor UI
	console.log('client.connect at UI:tool-dropdown McpClient/listSearch.ts getTools()');
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
		const result = await client.result.listTools({ cursor: paginationToken });
		const tools = filter
			? result.tools.filter((tool) => tool.name.toLowerCase().includes(filter.toLowerCase()))
			: result.tools;

		return {
			results: tools.map((tool) => ({
				name: tool.name,
				value: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
			})),
			paginationToken: result.nextCursor,
		};
	} finally {
		console.log('client.close at UI:tool-dropdown McpClient/listSearch.ts getTools()');
		await client.result.close();
	}
}
