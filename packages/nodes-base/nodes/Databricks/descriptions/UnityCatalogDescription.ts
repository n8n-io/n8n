import type { INodeProperties } from 'n8n-workflow';

export const unityCatalogOperations: INodeProperties[] = [
	{
		displayName: 'Entity',
		name: 'entity',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
			},
		},
		options: [
			{
				name: 'Catalog',
				value: 'catalog',
				description: 'Manage Unity Catalog catalogs',
			},
			{
				name: 'Function',
				value: 'function',
				description: 'Manage Unity Catalog functions',
			},
			{
				name: 'Schema',
				value: 'schema',
				description: 'Manage Unity Catalog schemas',
			},
			{
				name: 'Table',
				value: 'table',
				description: 'Manage Unity Catalog tables',
			},
			{
				name: 'Volume',
				value: 'volume',
				description: 'Manage Unity Catalog volumes',
			},
		],
		default: 'catalog',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['catalog'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a catalog',
				action: 'Create a catalog',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a catalog',
				action: 'Delete a catalog',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a catalog',
				action: 'Get a catalog',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many catalogs',
				action: 'Get many catalogs',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a catalog',
				action: 'Update a catalog',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['schema'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a schema',
				action: 'Create a schema',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a schema',
				action: 'Delete a schema',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a schema',
				action: 'Get a schema',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many schemas in a catalog',
				action: 'Get many schemas',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a schema',
				action: 'Update a schema',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a table',
				action: 'Create a table',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a table',
				action: 'Delete a table',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a table',
				action: 'Get a table',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tables in a schema',
				action: 'Get many tables',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a volume',
				action: 'Create a volume',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a volume',
				action: 'Delete a volume',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a volume',
				action: 'Get a volume',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many volumes in a schema',
				action: 'Get many volumes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a volume',
				action: 'Update a volume',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a function',
				action: 'Create a function',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a function',
				action: 'Delete a function',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a function',
				action: 'Get a function',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many functions in a schema',
				action: 'Get many functions',
			},
		],
		default: 'getAll',
	},
];

export const unityCatalogFields: INodeProperties[] = [
	// ========================================================
	//                        CATALOG
	// ========================================================

	// catalog: create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the catalog to create',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['catalog'],
				operation: ['create'],
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
				resource: ['unityCatalog'],
				entity: ['catalog'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Description of the catalog',
			},
		],
	},

	// catalog: get / delete / update
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['catalog'],
				operation: ['get', 'delete', 'update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['catalog'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'New description for the catalog',
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				description: 'New name for the catalog',
			},
		],
	},

	// ========================================================
	//                        SCHEMA
	// ========================================================

	// schema: create
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['schema'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the schema to create',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['schema'],
				operation: ['create'],
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
				resource: ['unityCatalog'],
				entity: ['schema'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Description of the schema',
			},
		],
	},

	// schema: getAll
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the catalog to list schemas from',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['schema'],
				operation: ['getAll'],
			},
		},
	},

	// schema: get / delete / update — full name like catalog.schema
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		default: '',
		description: 'Full name of the schema in the format <code>catalog_name.schema_name</code>',
		placeholder: 'my_catalog.my_schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['schema'],
				operation: ['get', 'delete', 'update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['schema'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'New description for the schema',
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				description: 'New name for the schema',
			},
		],
	},

	// ========================================================
	//                         TABLE
	// ========================================================

	// table: create
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Schema Name',
		name: 'schemaName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the table to create',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Table Type',
		name: 'tableType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Managed', value: 'MANAGED' },
			{ name: 'External', value: 'EXTERNAL' },
		],
		default: 'MANAGED',
		description: 'Whether the table is managed or external',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Data Source Format',
		name: 'dataSourceFormat',
		type: 'options',
		required: true,
		options: [
			{ name: 'CSV', value: 'CSV' },
			{ name: 'Delta', value: 'DELTA' },
			{ name: 'JSON', value: 'JSON' },
			{ name: 'Parquet', value: 'PARQUET' },
		],
		default: 'DELTA',
		description: 'Storage format for the table data',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Columns (JSON)',
		name: 'columns',
		type: 'json',
		required: true,
		default: '[]',
		description:
			'Array of column definitions. Each item must have <code>name</code> and <code>type_text</code>.',
		typeOptions: { alwaysOpenEditWindow: true },
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
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
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Description of the table',
			},
			{
				displayName: 'Storage Location',
				name: 'storageLocation',
				type: 'string',
				default: '',
				description: 'Storage location for external tables (e.g. <code>s3://bucket/path</code>)',
			},
		],
	},

	// table: getAll
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Schema Name',
		name: 'schemaName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['getAll'],
			},
		},
	},

	// table: get / delete
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		default: '',
		description:
			'Full name of the table in the format <code>catalog_name.schema_name.table_name</code>',
		placeholder: 'my_catalog.my_schema.my_table',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['table'],
				operation: ['get', 'delete'],
			},
		},
	},

	// ========================================================
	//                        VOLUME
	// ========================================================

	// volume: create
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Schema Name',
		name: 'schemaName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the volume to create',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Volume Type',
		name: 'volumeType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Managed', value: 'MANAGED' },
			{ name: 'External', value: 'EXTERNAL' },
		],
		default: 'MANAGED',
		description: 'Whether the volume is managed or external',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['create'],
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
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Description of the volume',
			},
			{
				displayName: 'Storage Location',
				name: 'storageLocation',
				type: 'string',
				default: '',
				description: 'Storage location for external volumes',
			},
		],
	},

	// volume: getAll
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Schema Name',
		name: 'schemaName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['getAll'],
			},
		},
	},

	// volume: get / delete / update
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		default: '',
		description:
			'Full name of the volume in the format <code>catalog_name.schema_name.volume_name</code>',
		placeholder: 'my_catalog.my_schema.my_volume',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['get', 'delete', 'update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['volume'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'New description for the volume',
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				description: 'New name for the volume',
			},
		],
	},

	// ========================================================
	//                       FUNCTION
	// ========================================================

	// function: create
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Schema Name',
		name: 'schemaName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the parent schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the function to create',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'options',
		required: true,
		options: [
			{ name: 'Python', value: 'PYTHON' },
			{ name: 'Scala', value: 'SCALA' },
			{ name: 'SQL', value: 'SQL' },
		],
		default: 'SQL',
		description: 'Programming language of the function',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Routine Definition',
		name: 'routineDefinition',
		type: 'string',
		required: true,
		default: '',
		description: 'Function body (SQL expression or Python/Scala code)',
		typeOptions: { rows: 4 },
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['create'],
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
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Description of the function',
			},
			{
				displayName: 'Input Parameters (JSON)',
				name: 'inputParams',
				type: 'json',
				default: '[]',
				description:
					'Array of input parameter definitions. Each must have <code>name</code> and <code>type_text</code>.',
				typeOptions: { alwaysOpenEditWindow: true },
			},
			{
				displayName: 'Return Parameters (JSON)',
				name: 'returnParams',
				type: 'json',
				default: '[]',
				description:
					'Array of return parameter definitions. Each must have <code>name</code> and <code>type_text</code>.',
				typeOptions: { alwaysOpenEditWindow: true },
			},
		],
	},

	// function: getAll
	{
		displayName: 'Catalog Name',
		name: 'catalogName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the catalog',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Schema Name',
		name: 'schemaName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the schema',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['getAll'],
			},
		},
	},

	// function: get / delete
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		default: '',
		description:
			'Full name of the function in the format <code>catalog_name.schema_name.function_name</code>',
		placeholder: 'my_catalog.my_schema.my_function',
		displayOptions: {
			show: {
				resource: ['unityCatalog'],
				entity: ['function'],
				operation: ['get', 'delete'],
			},
		},
	},
];
