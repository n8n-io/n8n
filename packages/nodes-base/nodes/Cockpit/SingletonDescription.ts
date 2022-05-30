import { INodeProperties } from 'n8n-workflow';

export const singletonOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'singleton',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a singleton',
			},
		],
		default: 'get',
	},
];

export const singletonFields: INodeProperties[] = [
	{
		displayName: 'Singleton',
		name: 'singleton',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getSingletons',
		},
		displayOptions: {
			show: {
				resource: [
					'singleton',
				],
			},
		},
		required: true,
		description: 'Name of the singleton to operate on',
	},
];
