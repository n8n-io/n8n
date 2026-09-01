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

export const credentials = [
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
	{
		name: 'oAuth2Api',
		required: true,
		hint: 'The oAuth2Api credential does not include the RFC 8707 Resource URL field that mcpOAuth2Api provides. MCP servers that require a resource parameter must use mcpOAuth2Api instead.',
		displayOptions: {
			show: {
				authentication: ['oAuth2Api'],
			},
		},
	},
	{
		name: 'httpMultipleHeadersAuth',
		required: true,
		displayOptions: {
			show: {
				authentication: ['multipleHeadersAuth'],
			},
		},
	},
] satisfies Array<INodeCredentialDescription & { hint?: string }>;
