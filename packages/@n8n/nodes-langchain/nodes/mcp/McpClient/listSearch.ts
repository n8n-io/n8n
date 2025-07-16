import {
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	NodeOperationError,
} from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from './types';
import { connectMcpClient, getAuthHeaders } from './utils';

export async function getTools(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
	const mcpServerUrl = this.getNodeParameter('mcpServerUrl') as string;
	const node = this.getNode();
	const { headers } = await getAuthHeaders(this, authentication);
	const client = await connectMcpClient({
		serverTransport,
		mcpServerUrl,
		headers,
		name: node.type,
		version: node.typeVersion,
	});

	if (!client.ok) {
		throw new NodeOperationError(this.getNode(), 'Could not connect to your MCP server');
	}

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
}
