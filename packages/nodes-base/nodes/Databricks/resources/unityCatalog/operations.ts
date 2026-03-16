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
			name: 'Create Catalog',
			value: 'createCatalog',
			description: 'Create a new catalog',
			action: 'Create a catalog',
			routing: {
				request: {
					method: 'POST',
					url: '/api/2.1/unity-catalog/catalogs',
					body: {
						name: '={{$parameter.catalogName}}',
						comment: '={{$parameter.comment}}',
					},
				},
			},
		},
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
			name: 'Create Volume',
			value: 'createVolume',
			description: 'Create a new volume',
			action: 'Create a volume',
			routing: {
				request: {
					method: 'POST',
					url: '/api/2.1/unity-catalog/volumes',
					body: {
						catalog_name: '={{$parameter.catalogName}}',
						schema_name: '={{$parameter.schemaName}}',
						name: '={{$parameter.volumeName}}',
						volume_type: '={{$parameter.volumeType}}',
						comment: '={{$parameter.additionalFields.comment}}',
						storage_location: '={{$parameter.additionalFields.storage_location}}',
					},
				},
			},
		},
		{
			name: 'Delete Catalog',
			value: 'deleteCatalog',
			description: 'Delete a catalog',
			action: 'Delete a catalog',
			routing: {
				request: {
					method: 'DELETE',
					url: '/api/2.1/unity-catalog/catalogs/{{$parameter.catalogName}}',
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
			name: 'Delete Volume',
			value: 'deleteVolume',
			description: 'Delete a volume',
			action: 'Delete a volume',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/api/2.1/unity-catalog/volumes/{{$parameter.fullName}}',
				},
			},
		},
		{
			name: 'Get Catalog',
			value: 'getCatalog',
			description: 'Get catalog information',
			action: 'Get a catalog',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/catalogs/{{$parameter.catalogName}}',
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
			name: 'List Catalogs',
			value: 'listCatalogs',
			description: 'List all catalogs',
			action: 'List catalogs',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.1/unity-catalog/catalogs',
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
						catalog_name: '={{$parameter.catalogName}}',
						schema_name: '={{$parameter.schemaName}}',
					},
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
						catalog_name: '={{$parameter.catalogName}}',
						schema_name: '={{$parameter.schemaName}}',
					},
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
		{
			name: 'Update Catalog',
			value: 'updateCatalog',
			description: 'Update catalog information',
			action: 'Update a catalog',
			routing: {
				request: {
					method: 'PATCH',
					url: '/api/2.1/unity-catalog/catalogs/{{$parameter.catalogName}}',
					body: {
						comment: '={{$parameter.comment}}',
					},
				},
			},
		},
	],
	default: 'listTables',
};
