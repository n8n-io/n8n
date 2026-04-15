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
		},
		{
			name: 'Create Function',
			value: 'createFunction',
			description: 'Create a new function',
			action: 'Create a function',
		},
		{
			name: 'Create Table',
			value: 'createTable',
			description: 'Register a new table',
			action: 'Create a table',
		},
		{
			name: 'Create Volume',
			value: 'createVolume',
			description: 'Create a new volume',
			action: 'Create a volume',
		},
		{
			name: 'Delete Catalog',
			value: 'deleteCatalog',
			description: 'Delete a catalog',
			action: 'Delete a catalog',
		},
		{
			name: 'Delete Function',
			value: 'deleteFunction',
			description: 'Delete a function',
			action: 'Delete a function',
		},
		{
			name: 'Delete Table',
			value: 'deleteTable',
			description: 'Delete a table',
			action: 'Delete a table',
		},
		{
			name: 'Delete Volume',
			value: 'deleteVolume',
			description: 'Delete a volume',
			action: 'Delete a volume',
		},
		{
			name: 'Get Catalog',
			value: 'getCatalog',
			description: 'Get catalog information',
			action: 'Get a catalog',
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
			name: 'List Catalogs',
			value: 'listCatalogs',
			description: 'List all catalogs',
			action: 'List catalogs',
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
		{
			name: 'Update Catalog',
			value: 'updateCatalog',
			description: 'Update catalog information',
			action: 'Update a catalog',
		},
	],
	default: 'listTables',
};
