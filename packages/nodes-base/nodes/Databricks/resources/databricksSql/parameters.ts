import type { INodeProperties } from 'n8n-workflow';

export const databricksSqlParameters: INodeProperties[] = [
	{
		displayName: 'Warehouse',
		name: 'warehouseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The SQL warehouse to use',
		displayOptions: {
			show: {
				resource: ['databricksSql'],
				operation: ['executeQuery'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getWarehouses',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 1234567890abcdef',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]+',
							errorMessage: 'Must be a valid warehouse ID',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://adb-xxx.azuredatabricks.net/sql/warehouses/xxx',
				extractValue: {
					type: 'regex',
					regex: 'https://[^/]+/sql/warehouses/([a-zA-Z0-9]+)',
				},
			},
		],
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'StandardSQL',
			rows: 10, // Increased from 4 for better SQL editing experience
			alwaysOpenEditWindow: false, // Optional: set to true to always open in full editor
		},
		displayOptions: {
			show: {
				operation: ['executeQuery'],
			},
		},
		default: '',
		placeholder: 'SELECT * FROM my_table LIMIT 10',
		required: true,
		description: 'SQL query to execute',
	},
	{
		displayName: 'Query ID',
		name: 'queryId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the query to update',
		displayOptions: {
			show: {
				operation: ['updateQuery', 'deleteQuery'],
			},
		},
	},
];
