import type { INodeProperties } from 'n8n-workflow';

export const unityCatalogOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['unityCatalog'],
		},
	},
	options: [
		{
			name: 'Create Function',
			value: 'createFunction',
			description: 'Create a new function',
			action: 'Create a function',
		},
		{
			name: 'Create Volume',
			value: 'createVolume',
			description: 'Create a new volume',
			action: 'Create a volume',
		},
		{
			name: 'Delete Function',
			value: 'deleteFunction',
			description: 'Delete a function',
			action: 'Delete a function',
		},
		{
			name: 'Delete Volume',
			value: 'deleteVolume',
			description: 'Delete a volume',
			action: 'Delete a volume',
		},
		{
			name: 'Get Function',
			value: 'getFunction',
			description: 'Get function information',
			action: 'Get a function',
		},
		{
			name: 'Get Table',
			value: 'getTable',
			description: 'Get table information',
			action: 'Get a table',
		},
		{
			name: 'Get Volume',
			value: 'getVolume',
			description: 'Get volume information',
			action: 'Get a volume',
		},
		{
			name: 'List Functions',
			value: 'listFunctions',
			description: 'List functions in schema',
			action: 'List functions',
		},
		{
			name: 'List Tables',
			value: 'listTables',
			description: 'List tables in schema',
			action: 'List tables',
		},
		{
			name: 'List Volumes',
			value: 'listVolumes',
			description: 'List volumes in schema',
			action: 'List volumes',
		},
	],
	default: 'listTables',
};

export const unityCatalogParameters: INodeProperties[] = [
	{
		displayName: 'Catalog',
		name: 'catalog',
		type: 'string',
		required: true,
		default: '',
		description: 'The catalog to use for the query',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
			},
		},
	},
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'string',
		required: true,
		default: '',
		description: 'The schema to use for the query',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
			},
		},
	},
	{
		displayName: 'Volume Name',
		name: 'volumeName',
		type: 'string',
		required: true,
		default: '',
		description: 'The volume to use for the query',
		displayOptions: {
			show: {
				operation: ['createVolume', 'deleteVolume'],
			},
		},
	},
	{
		displayName: 'Volume Type',
		name: 'volumeType',
		type: 'options',
		required: true,
		default: '',
		description: 'The type of volume to create',
		options: [
			{
				name: 'EXTERNAL',
				value: 'EXTERNAL',
			},
			{
				name: 'MANAGED',
				value: 'MANAGED',
			},
		],
		displayOptions: {
			show: {
				operation: ['createVolume'],
			},
		},
	},
];
