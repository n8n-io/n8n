import { INodeProperties } from 'n8n-workflow';

export const folderMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folderMessage'],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the messages in a folder',
				action: 'Get all folder messages',
			},
		],
		default: 'create',
	},
];

export const folderMessageFields: INodeProperties[] = [
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
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
				resource: ['folderMessage'],
				operation: ['getAll'],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description:
					'Microsoft Graph API OData $filter query. Information about the syntax can be found <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">here</a>.',
			},
		],
	},
];
