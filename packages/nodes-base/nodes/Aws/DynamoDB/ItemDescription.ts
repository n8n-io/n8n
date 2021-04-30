import {
	INodeProperties,
} from 'n8n-workflow';

export const itemOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
			},
		},
		options: [
			{
				name: 'Create/Update',
				value: 'upsert',
				description: 'Create/Update an item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an item',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all item',
			},
		],
		default: 'upsert',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const itemFields = [
	// ----------------------------------
	//              all
	// ----------------------------------
	{
		displayName: 'Table Name',
		name: 'tableName',
		description: 'Table to operate on.',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'item',
				],
			},
		},
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
	},

	// ----------------------------------
	//           upsert
	// ----------------------------------
	{
		displayName: 'Expression Attribute Values',
		name: 'expressionAttributeValues',
		description: 'Substitution tokens for attribute names in an expression.',
		placeholder: 'Add Metadata',
		type: 'fixedCollection',
		default: {},
		required: true,
		typeOptions: {
			multipleValues: true,
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'upsert',
				],
			},
		},
		options: [
			{
				name: 'details',
				displayName: 'Details',
				values: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Number',
								value: 'N',
							},
							{
								name: 'String',
								value: 'S',
							},
						],
						default: 'S',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Condition Expression',
		name: 'conditionExpression',
		description: 'Condition to be satisfied for the create/update operation to succeed.',
		type: 'string',
		default: '',
		placeholder: 'id = :id',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'upsert',
				],
			},
		},
	},

	// ----------------------------------
	//              delete
	// ----------------------------------
	{
		displayName: 'Keys',
		name: 'keysUi',
		type: 'fixedCollection',
		placeholder: 'Add Key',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				displayName: 'Key',
				name: 'keyValues',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Binary',
								value: 'b',
							},
							{
								name: 'Number',
								value: 'n',
							},
							{
								name: 'String',
								value: 's',
							},
						],
						default: 's',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description: `For the primary key, you must provide all of the attributes. For example, with a simple primary key,</br>
		you only need to provide a value for the partition key. For a composite primary key, you must provide values for both the partition key and the sort key.`,
	},
	{
		displayName: 'Return Values',
		name: 'returnValues',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				name: 'All Old',
				value: 'ALL_OLD',
			},
			{
				name: 'None',
				value: 'NONE',
			},
		],
		default: 'NONE',
		description: `Use ReturnValues if you want to get the item attributes as they appeared before they were deleted. For DeleteItem, the valid values are:</br>
				NONE - If ReturnValues is not specified, or if its value is NONE, then nothing is returned. (This setting is the default for ReturnValues.)</br>
				ALL_OLD - The content of the old item is returned.`,
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
				],
				returnValues: [
					'ALL_OLD',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				displayName: 'Condition Expression',
				name: 'conditionExpression',
				type: 'string',
				default: '',
				description: `A condition that must be satisfied in order for a conditional DeleteItem to succeed.`,
			},
			{
				displayName: 'Expression Attribute Names',
				name: 'expressionAttributeNamesUi',
				placeholder: 'Add Expression',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'expressionAttributeNamesValues',
						displayName: 'Expression',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Expression Attribute Values',
				name: 'expressionAttributeValuesUi',
				type: 'fixedCollection',
				placeholder: 'Add Attribute Value',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Expression Attribute Value',
						name: 'expressionAttributeValuesValues',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Binary',
										value: 'b',
									},
									{
										name: 'Boolean',
										value: 'bool',
									},
									{
										name: 'Binary Set',
										value: 'bs',
									},
									{
										name: 'List',
										value: 'l',
									},
									{
										name: 'Map',
										value: 'm',
									},
									{
										name: 'Number',
										value: 'n',
									},
									{
										name: 'Number Set',
										value: 'ns',
									},
									{
										name: 'Null',
										value: 'null',
									},
									{
										name: 'String',
										value: 's',
									},
									{
										name: 'String Set',
										value: 'ss',
									},
								],
								default: 's',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				description: `For the primary key, you must provide all of the attributes. For example, with a simple primary key,</br>
		you only need to provide a value for the partition key. For a composite primary key, you must provide values for both the partition key and the sort key.`,
			},
		],
	},

	// ----------------------------------
	//              get
	// ----------------------------------
	{
		displayName: 'Keys',
		name: 'keysUi',
		type: 'fixedCollection',
		placeholder: 'Add Key',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Key',
				name: 'keyValues',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Binary',
								value: 'b',
							},
							{
								name: 'Number',
								value: 'n',
							},
							{
								name: 'String',
								value: 's',
							},
						],
						default: 's',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description: `For the primary key, you must provide all of the attributes. For example, with a simple primary key,</br>
		you only need to provide a value for the partition key. For a composite primary key, you must provide values for both the partition key and the sort key.`,
	},
	{
		displayName: 'Select',
		name: 'select',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				name: 'All Attributes',
				value: 'ALL_ATTRIBUTES',
			},
			{
				name: 'All Projected Attributes',
				value: 'ALL_PROJECTED_ATTRIBUTES',
			},
			{
				name: 'Specific Attributes',
				value: 'SPECIFIC_ATTRIBUTES',
			},
		],
		default: 'ALL_ATTRIBUTES',
		description: `The attributes to be returned in the result. You can retrieve all item attributes, specific item attributes, the count of matching items, or in the case of an index, some or all of the attributes projected into the index.`,
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
				select: [
					'ALL_PROJECTED_ATTRIBUTES',
					'ALL_ATTRIBUTES',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Consistent Read',
				name: 'consistentRead',
				type: 'boolean',
				default: false,
				description: `Determines the read consistency model: If set to true, then the operation uses strongly consistent reads; otherwise, the operation uses eventually consistent reads.`,
			},
			{
				displayName: 'Projection Expression',
				name: 'projectionExpression',
				type: 'string',
				placeholder: 'id, name',
				default: '',
				description: 'Attributes to select',
			},
			{
				displayName: 'Expression Attribute Names',
				name: 'expressionAttributeNames',
				placeholder: 'Add Expression',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'ExpressionAttributeNamesValues',
						displayName: 'Expression',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//              Get All
	// ----------------------------------
	{
		displayName: 'Scan',
		name: 'scan',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		default: false,
	},
	{
		displayName: 'Key Condition Expression',
		name: 'keyConditionExpression',
		description: 'Condition to determine the items to be retrieved. The condition must perform an equality test<br>on a single partition key value, in this format: <code>partitionKeyName = :partitionkeyval</code>',
		placeholder: 'id = :id',
		default: '',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Expression Attribute Values',
		name: 'expressionAttributeUi',
		description: 'Substitution tokens for attribute names in an expression.',
		placeholder: 'Add Attribute Value',
		type: 'fixedCollection',
		default: '',
		required: true,
		typeOptions: {
			multipleValues: true,
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				name: 'expressionAttributeValues',
				displayName: 'Expression Attribute Vaue',
				values: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Number',
								value: 'N',
							},
							{
								name: 'String',
								value: 'S',
							},
						],
						default: 'S',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
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
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Select',
		name: 'select',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				name: 'All Attributes',
				value: 'ALL_ATTRIBUTES',
			},
			{
				name: 'All Projected Attributes',
				value: 'ALL_PROJECTED_ATTRIBUTES',
			},
			{
				name: 'Count',
				value: 'COUNT',
			},
			{
				name: 'Specific Attributes',
				value: 'SPECIFIC_ATTRIBUTES',
			},
		],
		default: 'ALL_ATTRIBUTES',
		description: `The attributes to be returned in the result. You can retrieve all item attributes, specific item attributes, the count of matching items, or in the case of an index, some or all of the attributes projected into the index.`,
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
				select: [
					'ALL_PROJECTED_ATTRIBUTES',
					'ALL_ATTRIBUTES',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Index Name',
				name: 'indexName',
				description: 'Name of the index to query. It can be any <br>secondary local or global index on the table.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Projection Expression',
				name: 'projectionExpression',
				type: 'string',
				default: '',
				description: `A string that identifies one or more attributes to retrieve from the table. These attributes can include scalars, sets, or elements of a JSON document. The attributes in the expression must be separated by commas.`,
			},
			{
				displayName: 'Filter Expression',
				name: 'filterExpression',
				type: 'string',
				default: '',
				description: `A string that contains conditions that DynamoDB applies after the Query operation, but before the data is returned to you. Items that do not satisfy the FilterExpression criteria are not returned.`,
			},
			{
				displayName: 'Read Consistency Model',
				name: 'readConsistencyModel',
				type: 'options',
				default: 'stronglyConsistent',
				description: 'Select the <a href="https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html">read consistency model</a>.',
				options: [
					{
						name: 'Eventually Consistent',
						value: 'eventuallyConsistent',
					},
					{
						name: 'Strongly Consistent',
						value: 'stronglyConsistent',
					},
				],
			},
			{
				displayName: 'Expression Attribute Names',
				name: 'expressionAttributeNamesUi',
				placeholder: 'Add Expression',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'expressionAttributeNamesValues',
						displayName: 'Expression',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
