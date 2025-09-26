import {
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from './types';
import { connectMcpClient, getAllTools, getAuthHeaders } from './utils';

export async function getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const node = this.getNode();
	const serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
	const endpointUrl = this.getNodeParameter('endpointUrl') as string;
	const genericCredentialType = this.getNodeParameter('genericAuthType') as string;

	const { headers } = await getAuthHeaders(this, authentication, genericCredentialType);
	const client = await connectMcpClient({
		serverTransport,
		endpointUrl,
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
