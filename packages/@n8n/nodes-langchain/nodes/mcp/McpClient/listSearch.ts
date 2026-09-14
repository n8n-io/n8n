import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import { connectMcpClientForCredential, mapToNodeOperationError } from '../shared/utils';

export async function getTools(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
	const endpointUrl = this.getNodeParameter('endpointUrl') as string;
	const node = this.getNode();
	const client = await connectMcpClientForCredential(this, {
		authentication,
		serverTransport,
		endpointUrl,
		surface: 'MCP Client',
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
		await client.result.close();
	}
}
