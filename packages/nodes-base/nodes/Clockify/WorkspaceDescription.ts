import {
	INodeProperties,
} from 'n8n-workflow';

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'workspace',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all workspaces',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];
