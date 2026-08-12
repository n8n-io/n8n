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
	{
		name: 'httpMultipleHeadersAuth',
		required: true,
		displayOptions: {
			show: {
				authentication: ['multipleHeadersAuth'],
			},
		},
	},
];
