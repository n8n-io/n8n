import type { ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { convertJsonSchemaToResourceMapperFields } from './utils';
import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import {
	getAuthHeaders,
	connectMcpClient,
	getAllTools,
	tryRefreshOAuth2Token,
	mapToNodeOperationError,
} from '../shared/utils';

export async function getToolParameters(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const toolId = this.getNodeParameter('tool', 0, {
		extractValue: true,
	}) as string;
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
	const endpointUrl = this.getNodeParameter('endpointUrl') as string;
	const node = this.getNode();
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

	const result = await getAllTools(client.result);
	const tool = result.find((tool) => tool.name === toolId);
	if (!tool) {
		throw new NodeOperationError(this.getNode(), 'Tool not found');
	}

	const fields = convertJsonSchemaToResourceMapperFields(tool.inputSchema);
	return {
		fields,
	};
}
