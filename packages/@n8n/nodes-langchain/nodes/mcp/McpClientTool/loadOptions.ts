import { type ILoadOptionsFunctions, type INodePropertyOptions } from 'n8n-workflow';

import { loadMcpToolOptions } from '../shared/runtime';
import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';

export async function getTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const timeout = this.getNodeParameter('options.timeout', 60000) as number;
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

	return await loadMcpToolOptions(this, {
		authentication,
		transport: serverTransport,
		endpointUrl,
		timeout,
	});
}
