import type { INodeProperties } from 'n8n-workflow';

export const insertOperationDescription: INodeProperties[] = [
	{
		displayName:
			'The embbded data are stored in the server memory, so they will be lost when the server is restarted. Additionally, if the amount of data is too large, it may cause the server to crash due to insufficient memory.',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Clear Store',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the store before inserting new data',
	},
];
