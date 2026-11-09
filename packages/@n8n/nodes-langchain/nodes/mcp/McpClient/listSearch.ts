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

export async function getResources(
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
		const result = await client.result.listResources({ cursor: paginationToken });
		const resources = filter
			? result.resources.filter(
					(resource) =>
						resource.name.toLowerCase().includes(filter.toLowerCase()) ||
						resource.uri.toLowerCase().includes(filter.toLowerCase()),
				)
			: result.resources;

		return {
			results: resources.map((resource) => ({
				name: resource.name || resource.uri,
				value: resource.uri,
				description: resource.description,
			})),
			paginationToken: result.nextCursor,
		};
	} catch (error) {
		// The picker must stay usable on servers that do not expose resources.
		this.logger?.debug?.('MCP Client: Failed to list resources for the picker', {
			error: error instanceof Error ? error.message : String(error),
		});
		return { results: [] };
	} finally {
		await client.result.close();
	}
}

export async function getPrompts(
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
		const result = await client.result.listPrompts({ cursor: paginationToken });
		const prompts = filter
			? result.prompts.filter((prompt) => prompt.name.toLowerCase().includes(filter.toLowerCase()))
			: result.prompts;

		return {
			results: prompts.map((prompt) => ({
				name: prompt.name,
				value: prompt.name,
				description: prompt.description,
			})),
			paginationToken: result.nextCursor,
		};
	} catch (error) {
		// The picker must stay usable on servers that do not expose prompts.
		this.logger?.debug?.('MCP Client: Failed to list prompts for the picker', {
			error: error instanceof Error ? error.message : String(error),
		});
		return { results: [] };
	} finally {
		await client.result.close();
	}
}
