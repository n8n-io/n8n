import { INodeType, INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

import * as listSearch from './listSearch';

export class McpClient implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Client',
		description: 'Standalone MCP Client',
		name: 'mcpClient',
		icon: 'file:mcp.svg',
		group: ['transform'],
		version: 1,
		defaults: {
			name: 'MCP Client',
		},
		credentials: [
			{
				name: 'httpBearerAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['bearerAuth'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
			},
		],
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Server Transport',
				name: 'serverTransport',
				type: 'options',
				options: [
					{
						name: 'HTTP Streamable',
						value: 'httpStreamable',
					},
					{
						name: 'SSE (Deprecated)',
						value: 'sse',
					},
				],
				default: 'httpStreamable',
			},
			{
				displayName: 'MCP Server URL',
				name: 'mcpServerUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://some.server.com/mcp',
				required: true,
				description: 'The URL of the MCP server to connect to',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Bearer Auth',
						value: 'bearerAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate with your SSE endpoint',
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: {
					show: {
						authentication: ['headerAuth', 'bearerAuth'],
					},
				},
			},
		],
	};

	methods = {
		listSearch,
	};
}
