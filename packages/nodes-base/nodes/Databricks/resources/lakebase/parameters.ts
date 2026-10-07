import type { INodeProperties } from 'n8n-workflow';

const showForLakebase = { resource: ['lakebase'] };
const showForGetAll = { resource: ['lakebase'], operation: ['getAll'] };
const showForExecuteFunction = { resource: ['lakebase'], operation: ['executeFunction'] };

export const lakebaseParameters: INodeProperties[] = [
	{
		displayName: 'Project',
		name: 'lakebaseProject',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Lakebase project',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseProjects',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. my-project',
			},
		],
	},
	{
		displayName: 'Branch',
		name: 'lakebaseBranch',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The branch of the project',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseBranches',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. production',
			},
		],
	},
	{
		displayName: 'Database',
		name: 'lakebaseDatabase',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Postgres database on the branch',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. databricks_postgres',
			},
		],
	},
	{
		displayName: 'Schema',
		name: 'lakebaseSchema',
		type: 'resourceLocator',
		default: { mode: 'list', value: 'public', cachedResultName: 'public' },
		required: true,
		description:
			'The Postgres schema. To use a schema other than public, select By ID and enter its name.',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseSchemas',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. public',
			},
		],
	},
	{
		displayName: 'Table',
		name: 'lakebaseTable',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The table in the schema',
		displayOptions: {
			show: showForLakebase,
			hide: { operation: ['executeFunction'] },
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseTables',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. orders',
			},
		],
	},

	// Everything below this line belongs to the operations, not to PR #40407.
	// Keep the locators above unmodified so that PR rebases in cleanly.
	{
		displayName: 'Function',
		name: 'lakebaseFunction',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Postgres function in the schema',
		displayOptions: {
			show: showForExecuteFunction,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseFunctions',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. spike_add',
			},
		],
	},
	{
		displayName: 'Specify Arguments',
		name: 'specifyArguments',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Using Fields Below', value: 'fields' },
			{ name: 'Using JSON', value: 'json' },
		],
		default: 'fields',
		description: 'Fill in one field per argument, or send the arguments as one JSON object',
		displayOptions: {
			show: showForExecuteFunction,
		},
	},
	{
		displayName:
			'Leave an optional argument blank, or remove it, to use its default in the function. A boolean argument always sends its switch value.',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: { ...showForExecuteFunction, specifyArguments: ['fields'] },
		},
	},
	{
		displayName: 'Arguments',
		name: 'functionArguments',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		typeOptions: {
			loadOptionsDependsOn: [
				'lakebaseProject.value',
				'lakebaseBranch.value',
				'lakebaseDatabase.value',
				'lakebaseSchema.value',
				'lakebaseFunction.value',
			],
			resourceMapper: {
				resourceMapperMethod: 'getLakebaseFunctionArguments',
				mode: 'add',
				fieldWords: {
					singular: 'argument',
					plural: 'arguments',
				},
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
				refreshStaleSchemaOnOpen: true,
			},
		},
		displayOptions: {
			show: { ...showForExecuteFunction, specifyArguments: ['fields'] },
		},
	},
	{
		displayName: 'Arguments (JSON)',
		name: 'argumentsJson',
		type: 'json',
		default: '{}',
		placeholder: '{ "a": 1, "b": 2 }',
		description: 'A JSON object with one key for each argument',
		displayOptions: {
			show: { ...showForExecuteFunction, specifyArguments: ['json'] },
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: showForGetAll,
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: { ...showForGetAll, returnAll: [false] },
		},
	},
	{
		displayName: 'Select Rows',
		name: 'where',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Condition',
		default: {},
		description: 'If not set, the node returns all rows',
		displayOptions: {
			show: showForGetAll,
		},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getLakebaseColumns',
							loadOptionsDependsOn: [
								'lakebaseProject.value',
								'lakebaseBranch.value',
								'lakebaseDatabase.value',
								'lakebaseSchema.value',
								'lakebaseTable.value',
							],
						},
						default: '',
					},
					{
						displayName: 'Condition',
						name: 'condition',
						type: 'options',
						options: [
							{ name: 'Equals', value: 'eq' },
							{ name: 'Greater Than', value: 'gt' },
							{ name: 'Greater Than or Equal', value: 'gte' },
							{ name: 'Is Not Null', value: 'not.is.null' },
							{ name: 'Is Null', value: 'is.null' },
							{ name: 'Less Than', value: 'lt' },
							{ name: 'Less Than or Equal', value: 'lte' },
							{
								name: 'Like',
								value: 'like',
								description: 'Use * in place of %, and _ for a single character',
							},
							{
								name: 'Like (Case-Insensitive)',
								value: 'ilike',
								description: 'Use * in place of %, and _ for a single character',
							},
							{ name: 'Not Equals', value: 'neq' },
						],
						default: 'eq',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: {
							hide: {
								condition: ['is.null', 'not.is.null'],
							},
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Combine Conditions',
		name: 'combineConditions',
		type: 'options',
		description:
			'How to combine the conditions above. AND requires all of them, OR requires any one of them.',
		options: [
			{ name: 'AND', value: 'AND' },
			{ name: 'OR', value: 'OR' },
		],
		default: 'AND',
		displayOptions: {
			show: showForGetAll,
		},
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: {
			show: showForGetAll,
		},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getLakebaseColumns',
							loadOptionsDependsOn: [
								'lakebaseProject.value',
								'lakebaseBranch.value',
								'lakebaseDatabase.value',
								'lakebaseSchema.value',
								'lakebaseTable.value',
							],
						},
						default: '',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{ name: 'ASC', value: 'asc' },
							{ name: 'DESC', value: 'desc' },
						],
						default: 'asc',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: showForGetAll,
		},
		options: [
			{
				displayName: 'Output Column Names or IDs',
				name: 'outputColumns',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getLakebaseColumnsMultiOptions',
					loadOptionsDependsOn: [
						'lakebaseProject.value',
						'lakebaseBranch.value',
						'lakebaseDatabase.value',
						'lakebaseSchema.value',
						'lakebaseTable.value',
					],
				},
			},
		],
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		noDataExpression: true,
		required: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		typeOptions: {
			loadOptionsDependsOn: [
				'lakebaseProject.value',
				'lakebaseBranch.value',
				'lakebaseDatabase.value',
				'lakebaseSchema.value',
				'lakebaseTable.value',
			],
			resourceMapper: {
				resourceMapperMethod: 'getLakebaseMappingColumns',
				mode: 'add',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: false,
				// The saved schema is what core validates against, not a fresh read
				refreshStaleSchemaOnOpen: true,
			},
		},
		displayOptions: {
			show: { resource: ['lakebase'], operation: ['insert'] },
		},
	},
];
