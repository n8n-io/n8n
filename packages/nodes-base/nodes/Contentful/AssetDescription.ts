import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const resource = {
	name: 'Asset',
	value: 'asset',
} as INodePropertyOptions;

export const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [resource.value],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'getAll',
	},
];

export const fields: INodeProperties[] = [
	{
		displayName: 'Environment ID',
		name: 'environmentId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: ['get', 'getAll'],
			},
		},
		default: 'master',
		description:
			'The ID for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: [resource.value],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: [resource.value],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [resource.value],
				operation: ['get'],
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
				resource: [resource.value],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Equal',
				name: 'equal',
				type: 'string',
				default: '',
				placeholder: 'fields.title=n8n',
				description:
					'Search for all data that matches the condition: {attribute}={value}. Attribute can use dot notation.',
			},
			{
				displayName: 'Exclude',
				name: 'exclude',
				type: 'string',
				default: '',
				placeholder: 'fields.tags[nin]=accessories,flowers',
				description:
					'Search for all data that matches the condition: {attribute}[nin]={value}. Attribute can use dot notation.',
			},
			{
				displayName: 'Exist',
				name: 'exist',
				type: 'string',
				default: '',
				placeholder: 'fields.tags[exists]=true',
				description:
					'Search for all data that matches the condition: {attribute}[exists]={value}. Attribute can use dot notation.',
			},
			{
				displayName: 'Fields',
				name: 'select',
				type: 'string',
				placeholder: 'fields.title',
				default: '',
				description:
					'The select operator allows you to choose what fields to return from an entity. You can choose multiple values by combining comma-separated operators.',
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'string',
				default: '',
				placeholder: 'fields.tags[in]=accessories,flowers',
				description:
					'Search for all data that matches the condition: {attribute}[in]={value}. Attribute can use dot notation.',
			},
			{
				displayName: 'Not Equal',
				name: 'notEqual',
				type: 'string',
				default: '',
				placeholder: 'fields.title[ne]=n8n',
				description:
					'Search for all data that matches the condition: {attribute}[ne]={value}. Attribute can use dot notation.',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'string',
				default: '',
				placeholder: 'sys.createdAt',
				description:
					'You can order items in the response by specifying the order search parameter. You can use sys properties (such as sys.createdAt) or field values (such as fields.myCustomDateField) for ordering.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description:
					'Full-text search is case insensitive and might return more results than expected. A query will only take values with more than 1 character.',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: 'Whether the data should be returned RAW instead of parsed',
			},
		],
	},
];
