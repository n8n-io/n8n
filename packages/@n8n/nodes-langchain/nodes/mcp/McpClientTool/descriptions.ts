import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const transportSelect = ({
	defaultOption,
	displayOptions,
}: {
	defaultOption: 'sse' | 'httpStreamable';
	displayOptions: IDisplayOptions;
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
