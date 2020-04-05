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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all singletons',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	}
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
					'singletons',
				],
			},
		},
		required: true,
		description: 'Name of the singleton to operate on.'
	},
] as INodeProperties[];