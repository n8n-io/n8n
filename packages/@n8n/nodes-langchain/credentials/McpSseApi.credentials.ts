import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class McpSseApi implements ICredentialType {
	name = 'mcpSseApi';

	displayName = 'MCP SSE';

	documentationUrl = 'mcpsse';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			description: 'Base URL of your MCP server',
			placeholder: 'e.g. https://my-mcp-server.ai/',
			default: '',
			required: true,
		},
		{
			displayName: 'Authorization Enabled',
			name: 'authEnabled',
			description: 'Indicates whether an Authorization header should be sent',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Authorization Token',
			name: 'token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authEnabled: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Custom endpoints',
			name: 'customEndpoints',
			description:
				'Whether to specify custom endpoints for your MCP server. Defaults are GET /sse and POST /messages',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'SSE endpoint',
			name: 'sseEndpoint',
			type: 'string',
			default: '/sse',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
		},
		{
			displayName: 'Messages endpoint',
			name: 'messagesEndpoint',
			type: 'string',
			default: '/messages',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
		},
	];
}
