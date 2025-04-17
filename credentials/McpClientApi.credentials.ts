import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class McpClientApi implements ICredentialType {
	name = 'mcpClientApi';
	displayName = 'MCP Client (STDIO) API';

	// Cast the icon to the correct type for n8n
	icon = 'file:mcpClient.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Command',
			name: 'command',
			type: 'string',
			default: '',
			required: true,
			description: 'Command to execute (e.g., npx @modelcontextprotocol/client, python script.py)',
		},
		{
			displayName: 'Arguments',
			name: 'args',
			type: 'string',
			default: '',
			description:
				'Command line arguments (space-separated). Do not include API keys or sensitive information here - use Environments instead.',
		},
		{
			displayName: 'Environments',
			name: 'environments',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			description:
				'Environment variables in NAME=VALUE format, separated by commas (e.g., BRAVE_API_KEY=xyz,OPENAI_API_KEY=abc)',
		},
	];
}
