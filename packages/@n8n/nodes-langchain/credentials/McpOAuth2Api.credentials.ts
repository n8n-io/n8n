import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class McpOAuth2Api implements ICredentialType {
	name = 'mcpOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'MCP OAuth2 API';

	documentationUrl = 'mcp';

	properties: INodeProperties[] = [
		{
			displayName: 'Register Client Automatically',
			name: 'useDynamicClientRegistration',
			type: 'boolean',
			default: true,
			description:
				"When on, n8n registers itself with the server for you, so you don't need to set anything up. It uses a Client ID Metadata Document (CIMD) when the server supports it and your instance has it turned on, and Dynamic Client Registration (DCR) otherwise. Most servers support one of these. Turn it off if the provider gives you a fixed client ID and secret, requires you to register a redirect URL, or doesn't support automatic registration.",
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
