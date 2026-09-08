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
			name: 'Create catalog',
			value: 'createCatalog',
			description: 'Create a new catalog',
			action: 'Create a catalog',
		},
		{
			name: 'Create function',
			value: 'createFunction',
			description: 'Create a new function',
			action: 'Create a function',
		},
		{
			name: 'Create table',
			value: 'createTable',
			description: 'Register a new table',
			action: 'Create a table',
		},
		{
			name: 'Create volume',
			value: 'createVolume',
			description: 'Create a new volume',
			action: 'Create a volume',
		},
		{
			name: 'Delete catalog',
			value: 'deleteCatalog',
			description: 'Delete a catalog',
			action: 'Delete a catalog',
		},
		{
			name: 'Delete function',
			value: 'deleteFunction',
			description: 'Delete a function',
			action: 'Delete a function',
		},
		{
			name: 'Delete table',
			value: 'deleteTable',
			description: 'Delete a table',
			action: 'Delete a table',
		},
		{
			name: 'Delete volume',
			value: 'deleteVolume',
			description: 'Delete a volume',
			action: 'Delete a volume',
		},
		{
			name: 'Get catalog',
			value: 'getCatalog',
			description: 'Get catalog information',
			action: 'Get a catalog',
		},
		{
			name: 'Get function',
			value: 'getFunction',
			description: 'Get function information',
			action: 'Get a function',
		},
		{
			name: 'Get table',
			value: 'getTable',
			description: 'Get table information',
			action: 'Get a table',
		},
		{
			name: 'Get volume',
			value: 'getVolume',
			description: 'Get volume information',
			action: 'Get a volume',
		},
		{
			name: 'List catalogs',
			value: 'listCatalogs',
			description: 'List all catalogs',
			action: 'List catalogs',
		},
		{
			name: 'List functions',
			value: 'listFunctions',
			description: 'List functions in schema',
			action: 'List functions',
		},
		{
			name: 'List tables',
			value: 'listTables',
			description: 'List tables in schema',
			action: 'List tables',
		},
		{
			name: 'List volumes',
			value: 'listVolumes',
			description: 'List volumes in schema',
			action: 'List volumes',
		},
		{
			name: 'Update catalog',
			value: 'updateCatalog',
			description: 'Update catalog information',
			action: 'Update a catalog',
		},
	],
	default: 'listTables',
};
