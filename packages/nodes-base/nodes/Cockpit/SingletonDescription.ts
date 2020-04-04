import { INodeProperties } from 'n8n-workflow';

export const singletonOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'singletons',
				],
			},
		},
		options: [
			{
				name: 'Get data',
				value: 'get',
				description: 'Get singleton data',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	}
] as INodeProperties[];
