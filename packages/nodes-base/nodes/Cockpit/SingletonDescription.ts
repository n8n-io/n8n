import { INodeProperties } from 'n8n-workflow';

export const singletonOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const singletonFields = [
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
		description: 'Name of the singleton to operate on.',
	},
] as INodeProperties[];
