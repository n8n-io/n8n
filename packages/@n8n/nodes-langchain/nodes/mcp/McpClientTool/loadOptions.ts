import {
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import type { McpAuthenticationOption } from './types';
import { connectMcpClient, getAllTools, getAuthHeaders } from './utils';

export async function getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const protocol = this.getNodeParameter('protocol') as string;
	const sseEndpoint = this.getNodeParameter('sseEndpoint') as string;
	const node = this.getNode();

	let headers: Record<string, string> | undefined = undefined;
	let authentication: McpAuthenticationOption | undefined = undefined;
	if (protocol === 'sse' || protocol === 'streamable-http') {
		authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
		headers = (await getAuthHeaders(this, authentication)).headers;
	}

	const client = await connectMcpClient({
		sseEndpoint,
		protocol,
		headers,
		name: node.type,
		version: node.typeVersion,
	});

	if (!client.ok) {
		throw new NodeOperationError(this.getNode(), 'Could not connect to your MCP server');
	}

	const tools = await getAllTools(client.result);
	return tools.map((tool) => ({
		name: tool.name,
		value: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
	}));
}
