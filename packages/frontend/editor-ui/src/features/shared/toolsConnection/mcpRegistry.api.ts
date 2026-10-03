import type {
	McpRegistryDiscoveryRequest,
	McpRegistryDiscoveryResponse,
	McpRegistryServerResponse,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function fetchMcpRegistryCatalog(
	context: IRestApiContext,
): Promise<McpRegistryServerResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/mcp-registry/servers');
}

export async function discoverMcpConnection(
	context: IRestApiContext,
	request: McpRegistryDiscoveryRequest,
): Promise<McpRegistryDiscoveryResponse> {
	return await makeRestApiRequest(context, 'POST', '/mcp-registry/discover', request);
}
