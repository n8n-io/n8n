import type { IDisplayOptions, INodeCredentialDescription, INodeProperties } from 'n8n-workflow';

export const transportSelect = ({
	defaultOption,
	displayOptions,
}: {
	defaultOption: 'sse' | 'httpStreamable';
	displayOptions?: IDisplayOptions;
}): INodeProperties => ({
	displayName: 'Server Transport',
	name: 'serverTransport',
	type: 'options',
	options: [
		{
			name: 'HTTP Streamable',
			value: 'httpStreamable',
		},
		{
			name: 'Server Sent Events (Deprecated)',
			value: 'sse',
		},
	],
	default: defaultOption,
	description: 'The transport used by your endpoint',
	displayOptions,
});

export const credentials: INodeCredentialDescription[] = [
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
	{
		name: 'mcpOAuth2Api',
		required: true,
		displayOptions: {
			show: {
				authentication: ['mcpOAuth2Api'],
			},
		},
	},
];

export const authenticationProperties: INodeProperties[] = [
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		options: [
			{
				name: 'MCP OAuth2',
				value: 'mcpOAuth2Api',
			},
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
		description: 'The way to authenticate with your endpoint',
	},
	{
		displayName: 'Credentials',
		name: 'credentials',
		type: 'credentials',
		default: '',
		displayOptions: {
			show: {
				authentication: ['headerAuth', 'bearerAuth', 'mcpOAuth2Api'],
			},
		},
	},
];
