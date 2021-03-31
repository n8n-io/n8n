import {
	INodeProperties,
} from 'n8n-workflow';

export const operationFields = [
	// ----------------------------------
	//              shared
	// ----------------------------------
	{
		displayName: 'Table Name',
		name: 'tableName',
		description: 'Name of the table to operate on.',
		type: 'string',
		required: true,
		default: '',
	},

	// ----------------------------------
	//              delete
	// ----------------------------------
	{
		displayName: 'Partition Key Value',
		name: 'partitionKeyValue',
		description: 'Value of the partition key of the item to delete.',
		default: '',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Partition Key Type',
		name: 'partitionKeyType',
		description: 'Type of the partition key of the item to retrieve.',
		default: 'S',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Binary',
				value: 'B',
			},
			{
				name: 'Number',
				value: 'N',
			},
			{
				name: 'String',
				value: 'S',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//              get
	// ----------------------------------
	{
		displayName: 'Partition Key Value',
		name: 'partitionKeyValue',
		description: 'Value of the partition key of the item to retrieve.',
		default: '',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Partition Key Type',
		name: 'partitionKeyType',
		description: 'Type of the partition key of the item to retrieve.',
		default: 'S',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Binary',
				value: 'B',
			},
			{
				name: 'Number',
				value: 'N',
			},
			{
				name: 'String',
				value: 'S',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//              query
	// ----------------------------------
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
				operation: [
					'query',
				],
			},
		},
	},
	{
		displayName: 'Expression Attribute Values',
		name: 'expressionAttributeValues',
		description: 'Substitution tokens for attribute names in an expression.',
		placeholder: 'Add Metadata',
		type: 'fixedCollection',
		default: '',
		required: true,
		typeOptions: {
			multipleValues: true,
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: [
					'query',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'query',
				],
			},
		},
		options: [
			{
				displayName: 'Index Name',
				name: 'indexName',
				description: 'Name of the index to query. This index can be any <br>secondary local or global index on the table.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Projection Expression',
				name: 'projectionExpression',
				description: 'Comma-separated list of attributes to retrieve.',
				type: 'string',
				placeholder: 'id, name',
				default: '',
			},
		],
	},

	// ----------------------------------
	//             scan
	// ----------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'scan',
				],
			},
		},
		options: [
			{
				displayName: 'Expression Attribute Values',
				name: 'expressionAttributeValues',
				description: 'Substitution tokens for attribute names in an expression.',
				placeholder: 'Add Metadata',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
					minValue: 1,
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
				displayName: 'Filter Expression',
				name: 'filterExpression',
				description: 'Condition to apply after the scan operation, but before the data is returned.',
				type: 'string',
				default: '',
				placeholder: 'id = :id',
			},
			{
				displayName: 'Index Name',
				name: 'indexName',
				description: 'Name of the index to query. This index can be any <br>secondary local or global index on the table.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Key Condition Expression',
				name: 'keyConditionExpression',
				description: 'Condition that determines the items to be retrieved. The condition must perform an equality test<br>on a single partition key value, in this format: <code>partitionKeyName = :partitionkeyval</code>',
				placeholder: 'id = :id',
				default: '',
				type: 'string',
			},
			{
				displayName: 'Projection Expression',
				name: 'projectionExpression',
				description: 'Comma-separated list of attributes to retrieve.',
				type: 'string',
				placeholder: 'id, name',
				default: '',
			},
		],
	},
] as INodeProperties[];
