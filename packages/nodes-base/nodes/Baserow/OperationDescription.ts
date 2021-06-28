import {
	INodeProperties,
} from 'n8n-workflow';

export const operationFields = [
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the table to operate on. Found as part of the table URL:<br><code>https://baserow.io/database/{databaseId}/table/{tableId}</code><br>You can also enter the full URL.',
	},
	// ----------------------------------
	//               get
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to return.',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Use IDs',
				name: 'disableAutoMapping',
				type: 'boolean',
				default: true,
				description: 'Use table fields as <code>field_n</code> instead of column names.',
			},
		],
	},

	// ----------------------------------
	//              update
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to update.',
	},

	// ----------------------------------
	//             delete
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to delete.',
	},

	// ----------------------------------
	//         shared fields
	// ----------------------------------
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
					'delete',
				],
			},
		},
		options: [
			{
				displayName: 'Use IDs',
				name: 'disableAutoMapping',
				type: 'boolean',
				default: true,
				description: 'Use table fields as <code>field_n</code> instead of column names.',
			},
		],
	},

	// ----------------------------------
	//            getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter',
				description: 'Filter rows based on comparison operators.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'options',
								default: '',
								description: 'Field to compare.',
								typeOptions: {
									loadOptionsDependsOn: [
										'tableId',
									],
									loadOptionsMethod: 'getTableFields',
								},
							},
							{
								displayName: 'Filter',
								name: 'operator',
								type: 'options',
								options: [
									{
										name: 'Equal',
										value: 'equal',
										description: 'Field is equal to value.',
									},
									{
										name: 'Not Equal',
										value: 'not_equal',
										description: 'Field is not equal to value.',
									},
									{
										name: 'Date Equal',
										value: 'date_equal',
										description: 'Field is date. Format: \'YYY-MM-DD\'.',
									},
									{
										name: 'Date Not Equal',
										value: 'date_not_equal',
										description: 'Field is not date. Format: \'YYY-MM-DD\'.',
									},
									{
										name: 'Date Equals Today',
										value: 'date_equals_today',
										description: 'Field is today. Format: string.',
									},
									{
										name: 'Date Equals Month',
										value: 'date_equals_month',
										description: 'Field in this month. Format: string.',
									},
									{
										name: 'Date Equals Year',
										value: 'date_equals_year',
										description: 'Field in this year. Format: string.',
									},
									{
										name: 'Contains',
										value: 'contains',
										description: 'Field contains value.',
									},
									{
										name: 'File Name Contains',
										value: 'filename_contains',
										description: 'Field filename contains value.',
									},
									{
										name: 'Contains Not',
										value: 'contains_not',
										description: 'Field does not contain value.',
									},
									{
										name: 'Higher Than',
										value: 'higher_than',
										description: 'Field is higher than value.',
									},
									{
										name: 'Lower Than',
										value: 'lower_than',
										description: 'Field is lower than value.',
									},
									{
										name: 'Single Select Equal',
										value: 'single_select_equal',
										description: 'Field selected option is value.',
									},
									{
										name: 'Single Select Not Equal',
										value: 'single_select_not_equal',
										description: 'Field selected option is not value.',
									},
									{
										name: 'Is True',
										value: 'boolean',
										description: 'Boolean field is true.',
									},
									{
										name: 'Is Empty',
										value: 'empty',
										description: 'Field is empty.',
									},
									{
										name: 'Not Empty',
										value: 'not_empty',
										description: 'Field is not empty.',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to compare to.',
							},
						],
					},
				],
			},
			{
				displayName: 'Sort Order',
				name: 'order',
				placeholder: 'Add Sort Order',
				description: 'Set the sort order of the result rows.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'options',
								default: '',
								description: 'Field name to order.',
								typeOptions: {
									loadOptionsDependsOn: [
										'tableId',
									],
									loadOptionsMethod: 'getTableFields',
								},
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'ASC',
										value: '',
										description: 'Sort in ascending order.',
									},
									{
										name: 'DESC',
										value: '-',
										description: 'Sort in descending order.',
									},
								],
								default: '',
								description: 'Sort direction, either ascending or descending.',
							},
						],
					},
				],
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Return only rows with data matching the search conditions.',
			},
			{
				displayName: 'Use IDs',
				name: 'disableAutoMapping',
				type: 'boolean',
				default: false,
				description: 'Use table fields as <code>field_n</code> instead of column names.',
			},
		],
	},
] as INodeProperties[];
