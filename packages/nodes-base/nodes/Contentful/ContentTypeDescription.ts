import {
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

export const resource = {
	name: 'Content Type',
	value: 'contentType',
} as INodePropertyOptions;

export const operations: INodeProperties[] = [
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
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const fields: INodeProperties[] = [
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
				],
			},
		},
		default: 'master',
		description: 'The id for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".',
	},
	{
		displayName: 'Content Type ID',
		name: 'contentTypeId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					resource.value,
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					resource.value,
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: 'If the data should be returned RAW instead of parsed.',
			},
		],
	},
];
