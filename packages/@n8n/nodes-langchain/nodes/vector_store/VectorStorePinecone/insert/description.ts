import type { INodeProperties } from 'n8n-workflow';

export const insertOperationDescription: INodeProperties[] = [
	{
		displayName: 'Specify the document to load in the document loader sub-node',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['insert'],
			},
		},
	},
];
