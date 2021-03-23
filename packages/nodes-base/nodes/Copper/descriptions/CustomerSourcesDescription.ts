import {
	INodeProperties,
} from 'n8n-workflow';

export const customerSourcesOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'customerSources',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'getAll',
		description: 'Operation to perform',
	},
] as INodeProperties[];
