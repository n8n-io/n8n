import {
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import type { McpSseCredential } from './types';
import { connectMcpClient, getAllTools } from './utils';

export async function getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const sseCredentials = await this.getCredentials<McpSseCredential>('mcpSseApi');
	const client = await connectMcpClient({
		credential: sseCredentials,
		version: this.getNode().typeVersion,
	});

	if (!client.ok) {
		throw new NodeOperationError(this.getNode(), 'Could not connect to your MCP server');
	}

	const tools = await getAllTools(client.result);
	return tools.map((tool) => ({
		name: tool.name,
		value: tool.name,
		description: tool.description,
	}));
}
