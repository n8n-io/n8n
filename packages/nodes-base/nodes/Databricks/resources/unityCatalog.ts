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
		// Volume Operations
		{
			name: 'Create Volume',
			value: 'createVolume',
			description: 'Create a new volume',
			action: 'Create a volume',
			routing: {
				request: {
					method: 'POST',
					url: '/api/2.1/unity-catalog/volumes',
					body: {
						catalog_name: '={{$parameter.catalog}}',
						schema_name: '={{$parameter.schema}}',
						name: '={{$parameter.volumeName}}',
						volume_type: '={{$parameter.volumeType}}',
					},
				},
			},
		},
		{
			name: 'Delete Volume',
			value: 'deleteVolume',
			description: 'Delete a volume',
			action: 'Delete a volume',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/api/2.1/unity-catalog/volumes/{{$parameter.catalog}}.{{$parameter.schema}}.{{$parameter.volumeName}}',
				},
			},
		},
		{
			name: 'Get Volume',
			value: 'getVolume',
			description: 'Get volume information',
			action: 'Get a volume',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/volumes/{{$parameter.fullName}}',
				},
			},
		},
		{
			name: 'List Volumes',
			value: 'listVolumes',
			description: 'List volumes in schema',
			action: 'List volumes',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/volumes',
					qs: {
						catalog_name: '={{$parameter.catalogName}}',
						schema_name: '={{$parameter.schemaName}}',
					},
				},
			},
		},
		// Table Operations
		{
			name: 'Get Table',
			value: 'getTable',
			description: 'Get table information',
			action: 'Get a table',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/tables/{{$parameter.fullName}}',
				},
			},
		},
		{
			name: 'List Tables',
			value: 'listTables',
			description: 'List tables in schema',
			action: 'List tables',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/tables',
					qs: {
						catalog_name: '={{$parameter.catalog}}',
						schema_name: '={{$parameter.schema}}',
					},
				},
			},
		},
		// Function Operations
		{
			name: 'Create Function',
			value: 'createFunction',
			description: 'Create a new function',
			action: 'Create a function',
			routing: {
				request: {
					method: 'POST',
					url: '/api/2.1/unity-catalog/functions',
					body: {
						name: '={{$parameter.functionName}}',
						catalog_name: '={{$parameter.catalogName}}',
						schema_name: '={{$parameter.schemaName}}',
						input_params: '={{$parameter.inputParams}}',
						data_type: '={{$parameter.returnType}}',
						routine_body: '={{$parameter.routineBody}}',
					},
				},
			},
		},
		{
			name: 'Delete Function',
			value: 'deleteFunction',
			description: 'Delete a function',
			action: 'Delete a function',
			routing: {
				request: {
					method: 'DELETE',
					url: '/api/2.1/unity-catalog/functions/{{$parameter.fullName}}',
				},
			},
		},
		{
			name: 'Get Function',
			value: 'getFunction',
			description: 'Get function information',
			action: 'Get a function',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/functions/{{$parameter.fullName}}',
				},
			},
		},
		{
			name: 'List Functions',
			value: 'listFunctions',
			description: 'List functions in schema',
			action: 'List functions',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/functions',
					qs: {
						catalog_name: '={{$parameter.catalog}}',
						schema_name: '={{$parameter.schema}}',
					},
				},
			},
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
