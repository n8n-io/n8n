import type { INodeProperties } from 'n8n-workflow';

export const captureWebsiteFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['capture-website'],
			},
		},
		placeholder: 'https://...',
		description: 'The URL of the website',
	},
];
