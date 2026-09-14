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
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: {
			show: {
				operation: ['executeQuery'],
			},
		},
		default: {},
		placeholder: 'Add Parameter',
		description:
			'Named parameters for the query. Reference them in your SQL as <code>:name</code>, e.g. <code>WHERE ID = :user_id</code>.',
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. user_id',
						description: 'Parameter name, referenced in the query as :name',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: '',
						description: 'Leave unset to treat the value as a string',
						options: [
							{ name: '(Default)', value: '' },
							{ name: 'Boolean', value: 'BOOLEAN' },
							{ name: 'Date', value: 'DATE' },
							{ name: 'Double', value: 'DOUBLE' },
							{ name: 'Float', value: 'FLOAT' },
							{ name: 'Integer', value: 'INT' },
							{ name: 'Long', value: 'LONG' },
							{ name: 'String', value: 'STRING' },
							{ name: 'Timestamp', value: 'TIMESTAMP' },
						],
					},
				],
			},
		],
	},
];
