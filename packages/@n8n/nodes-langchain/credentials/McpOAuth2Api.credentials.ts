import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class McpOAuth2Api implements ICredentialType {
	name = 'mcpOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'MCP OAuth2 API';

	documentationUrl = 'mcp';

	properties: INodeProperties[] = [
		{
			displayName: 'Use Dynamic Client Registration',
			name: 'useDynamicClientRegistration',
			type: 'boolean',
			default: true,
		},
		{
			displayName: 'Resource URL',
			name: 'resourceUrl',
			type: 'string',
			typeOptions: { url: true },
			default: '',
			description:
				"Optional. The exact protected resource URL required by the MCP server. Leave empty to use the server's default, discovered automatically.",
		},
	];
}
