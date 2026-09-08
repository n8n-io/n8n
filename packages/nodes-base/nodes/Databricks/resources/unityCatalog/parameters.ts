import type { INodeProperties } from 'n8n-workflow';

export const unityCatalogParameters: INodeProperties[] = [
	// Catalog Name parameter (resourceLocator) - for catalog operations and create/delete/get operations
	{
		displayName: 'Catalog',
		name: 'catalogName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The catalog to use',
		displayOptions: {
			show: {
				operation: [
					'getCatalog',
					'updateCatalog',
					'deleteCatalog',
					'createCatalog',
					'createVolume',
					'getVolume',
					'deleteVolume',
					'createFunction',
					'getFunction',
					'deleteFunction',
					'createTable',
					'getTable',
					'deleteTable',
				],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getCatalogs',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'string',
				type: 'string',
				placeholder: 'main',
				hint: 'Enter catalog name or leave empty to list all',
			},
		],
	},

	// Catalog Name (optional) - for list operations
	{
		displayName: 'Catalog',
		name: 'catalogName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Filter by catalog (optional)',
		displayOptions: {
			show: {
				operation: ['listVolumes', 'listTables', 'listFunctions'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getCatalogs',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'string',
				type: 'string',
				placeholder: 'main',
				hint: 'Enter catalog name or leave empty to list all',
			},
		],
	},

	// Schema Name parameter (resourceLocator) - for create/delete/get operations
	{
		displayName: 'Schema',
		name: 'schemaName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The schema to use',
		displayOptions: {
			show: {
				operation: [
					'createVolume',
					'getVolume',
					'deleteVolume',
					'createFunction',
					'getFunction',
					'deleteFunction',
					'createTable',
					'getTable',
					'deleteTable',
				],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getSchemas',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'string',
				type: 'string',
				placeholder: 'default',
				hint: 'Enter schema name or leave empty to list all',
			},
		],
	},

	// Schema Name (optional) - for list operations
	{
		displayName: 'Schema',
		name: 'schemaName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Filter by schema (optional, requires catalog)',
		displayOptions: {
			show: {
				operation: ['listVolumes', 'listTables', 'listFunctions'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getSchemas',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'string',
				type: 'string',
				placeholder: 'schema',
				hint: 'Enter full schema name or leave empty to list all',
			},
		],
	},

	{
		displayName: 'Table',
		name: 'fullName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The table to access',
		displayOptions: {
			show: {
				operation: ['getTable', 'deleteTable'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getTables',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'string',
				type: 'string',
				placeholder: 'catalog.schema.table',
				hint: 'Enter full table name in format: catalog.schema.table',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^(`[^`]+`|[^\\s.`]+)\\.(`[^`]+`|[^\\s.`]+)\\.(`[^`]+`|[^\\s.`]+)$',
							errorMessage: 'Must be in format: catalog.schema.table (e.g., main.default.my_table)',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Function',
		name: 'fullName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The function to access',
		displayOptions: {
			show: {
				operation: ['getFunction', 'deleteFunction'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getFunctions',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'string',
				type: 'string',
				placeholder: 'catalog.schema.function',
				hint: 'Enter full function name in format: catalog.schema.function',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^(`[^`]+`|[^\\s.`]+)\\.(`[^`]+`|[^\\s.`]+)\\.(`[^`]+`|[^\\s.`]+)$',
							errorMessage:
								'Must be in format: catalog.schema.function (e.g., main.default.my_function)',
						},
					},
				],
			},
		],
	},

	// Volume Name - for create/get/delete volume
	{
		displayName: 'Volume name',
		name: 'volumeName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'my_volume',
		description: 'Name of the volume',
		displayOptions: {
			show: {
				operation: ['createVolume', 'getVolume', 'deleteVolume'],
			},
		},
	},

	// Volume Type - for create volume
	{
		displayName: 'Volume type',
		name: 'volumeType',
		type: 'options',
		required: true,
		default: 'MANAGED',
		description: 'The type of volume to create',
		options: [
			{
				name: 'Managed',
				value: 'MANAGED',
				description: 'Databricks manages the volume storage',
			},
			{
				name: 'External',
				value: 'EXTERNAL',
				description: 'Volume points to external storage',
			},
		],
		displayOptions: {
			show: {
				operation: ['createVolume'],
			},
		},
	},

	// Function Name - for create function
	{
		displayName: 'Function name',
		name: 'functionName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'my_function',
		description: 'Name of the function to create',
		displayOptions: {
			show: {
				operation: ['createFunction'],
			},
		},
	},

	// Input Parameters - for create function
	{
		displayName: 'Input parameters',
		name: 'inputParams',
		type: 'json',
		required: true,
		default: '[]',
		placeholder: '[{"name": "param1", "type_name": "STRING", "type_text": "STRING"}]',
		description:
			'Array of input parameters. Each parameter requires name, type_name, and type_text.',
		displayOptions: {
			show: {
				operation: ['createFunction'],
			},
		},
	},

	// Return Type - for create function
	{
		displayName: 'Return type',
		name: 'returnType',
		type: 'string',
		required: true,
		default: 'STRING',
		placeholder: 'STRING',
		description: 'The return type of the function (e.g., STRING, INT, DOUBLE)',
		displayOptions: {
			show: {
				operation: ['createFunction'],
			},
		},
	},

	// Routine Body - for create function
	{
		displayName: 'Routine body',
		name: 'routineBody',
		type: 'string',
		required: true,
		default: 'SQL',
		description: 'The language of the function body',
		displayOptions: {
			show: {
				operation: ['createFunction'],
			},
		},
	},

	// Routine Definition - for create function
	{
		displayName: 'Routine definition',
		name: 'routineDefinition',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'RETURN x + 1',
		description: 'The function body (SQL expression)',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: ['createFunction'],
			},
		},
	},

	// Comment - for create/update catalog
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		placeholder: 'Catalog description',
		description: 'Optional comment or description',
		displayOptions: {
			show: {
				operation: ['createCatalog', 'updateCatalog'],
			},
		},
	},

	// Additional Fields for volume operations
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['createVolume'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Optional comment or description for the volume',
			},
			{
				displayName: 'Storage location',
				name: 'storage_location',
				type: 'string',
				default: '',
				description: 'External storage location (required for EXTERNAL volumes)',
			},
		],
	},

	// Table Name - for createTable
	{
		displayName: 'Table name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'my_table',
		description: 'Name of the table to create',
		displayOptions: {
			show: {
				operation: ['createTable'],
			},
		},
	},

	// Storage Location - for createTable (required; API only supports EXTERNAL tables)
	{
		displayName: 'Storage location',
		name: 'storageLocation',
		type: 'string',
		required: true,
		default: '',
		placeholder: 's3://my-bucket/path/to/table',
		description:
			'External storage root URL for the table. The Create Table API only supports external Delta tables.',
		displayOptions: {
			show: {
				operation: ['createTable'],
			},
		},
	},

	// Additional Fields for createTable
	{
		displayName: 'Additional fields',
		name: 'tableAdditionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['createTable'],
			},
		},
		options: [
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'json',
				default: '[]',
				description:
					'Array of column definitions. Each column requires name and type_name (e.g. STRING, LONG, DOUBLE, BOOLEAN, DATE, TIMESTAMP).',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Optional comment or description for the table',
			},
		],
	},
];
