import {
	INodeProperties,
	INodePropertyOptions
} from 'n8n-workflow';

export const resource = {
  name: 'Locale',
  value: 'locale',
} as INodePropertyOptions;

export const operations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					resource.value,
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
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const fields = [
	{
		displayName: 'Environment ID',
		name: 'environmentId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					resource.value,
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		default: 'master',
		description: 'The id for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".'
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					resource.value,
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					resource.value,
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
] as INodeProperties[];
