import { INodeProperties } from 'n8n-workflow';

export const objectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an object',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an object',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an object',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all objects',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an object',
			},
		],
		displayOptions: {
			show: {
				resource: ['object'],
			},
		},
	},
];

export const objectFields: INodeProperties[] = [
	// ----------------------------------
	//         object: create
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to create',
		default: '',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Properties',
		name: 'properties',
		placeholder: 'Add Property',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Property',
				name: 'property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Field to set for the object to create',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the object to create',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         object: get
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to retrieve',
		default: '',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get', 'delete'],
			},
		},
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		description: 'ID of the object to retrieve',
		default: '',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get', 'delete'],
			},
		},
	},

	// ----------------------------------
	//         object: update
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to update',
		default: '',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		description: 'ID of the object to update',
		default: '',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Properties',
		name: 'properties',
		placeholder: 'Add Property',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Property',
				name: 'property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Field to set for the object to create',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the object to create',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         object:getAll
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to create',
		default: '',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['object'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						'/jsonParameters': [false],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Field to set for the object to create',
							},
							{
								displayName: 'Constrain',
								name: 'constraint_type',
								type: 'options',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									{
										name: 'Equals',
										value: 'equals',
										description: 'Use to test strict equality, for all field types',
									},
									{
										name: 'Not Equal',
										value: 'not equal',
										description: 'Use to test strict equality, for all field types',
									},
									{
										name: 'Is Empty',
										value: 'is_empty',
										description:
											"Use to test whether a thing's given field is empty, for all field types",
									},
									{
										name: 'Is Not Empty',
										value: 'is_not_empty',
										description:
											"Use to test whether a thing's given field is not empty, for all field types",
									},
									{
										name: 'Text Contains',
										value: 'text contains',
										description:
											'Use to test if a text field contains a string, for text fields only',
									},
									{
										name: 'Not Text Contains',
										value: 'not text contains',
										description:
											'Use to test if a text field does not contain a string, for text fields only',
									},
									{
										name: 'Greater Than',
										value: 'greater than',
										description:
											"Use to compare a thing's field value relative to a string or number, for text, number, and date fields",
									},
									{
										name: 'Less Than',
										value: 'less than',
										description:
											"Use to compare a thing's field value relative to a string or number, for text, number, and date fields",
									},
									{
										name: 'In',
										value: 'in',
										description:
											"Use to test whether a thing's field is in a list, for all field types",
									},
									{
										name: 'Not In',
										value: 'not in',
										description:
											"Use to test whether a thing's field is not in a list, for all field types",
									},
									{
										name: 'Contains',
										value: 'contains',
										description:
											'Use to test whether a list field contains an entry, for list fields only',
									},
									{
										name: 'Not Contains',
										value: 'not contains',
										description:
											'Use to test whether a list field does not contains an entry, for list fields only',
									},
									{
										name: 'Empty',
										value: 'empty',
										description: 'Use to test whether a list field is empty, for list fields only',
									},
									{
										name: 'Not Empty',
										value: 'not empty',
										description:
											'Use to test whether a list field is not empty, for list fields only',
									},
									{
										name: 'Geographic Search',
										value: 'geographic_search',
										description:
											'Use to test if the current thing is within a radius from a central address. To use this, the value sent with the constraint must have an address and a range. See <a href="https://manual.bubble.io/core-resources/api/data-api">link</a>.',
									},
								],
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								displayOptions: {
									hide: {
										constraint_type: ['is_empty', 'is_not_empty', 'empty', 'not empty'],
									},
								},
								default: '',
								description: 'Value to set for the object to create',
							},
						],
					},
				],
			},
			{
				displayName: 'Filters (JSON)',
				name: 'filtersJson',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				placeholder: `[ { "key": "name", "constraint_type": "text contains", "value": "cafe" } , { "key": "address", "constraint_type": "geographic_search", "value": { "range":10, "origin_address":"New York" } } ]`,
				description:
					'Refine the list that is returned by the Data API with search constraints, exactly as you define a search in Bubble. See <a href="https://manual.bubble.io/core-resources/api/data-api#search-constraints">link</a>.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
							{
								displayName: 'Sort Field',
								name: 'sort_field',
								type: 'string',
								default: '',
								description:
									'Specify the field to use for sorting. Either use a fielddefined for the current typeor use <code>_random_sorting</code> to get the entries in a random order.',
							},
							{
								displayName: 'Descending',
								name: 'descending',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Geo Reference',
								name: 'geo_reference',
								type: 'string',
								default: '',
								description:
									"When the field's type is geographic address, you need to add another parameter geo_reference and provide an address as a string",
							},
						],
					},
				],
			},
		],
	},
];
