import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class McpSseApi implements ICredentialType {
	name = 'mcpSseApi';

	displayName = 'MCP SSE';

	documentationUrl = 'mcpsse';

	properties: INodeProperties[] = [
		{
			displayName: 'SSE Endpoint',
			name: 'sseEndpoint',
			type: 'string',
			description: 'SSE Endpoint of your MCP server',
			placeholder: 'e.g. https://my-mcp-server.ai/sse',
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
			displayName: 'Bearer Token',
			description: 'Bearer token to send in the Authorization header',
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
	];
}
