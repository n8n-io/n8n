import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a document',
				action: 'Create a document',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a document',
				action: 'Delete a document',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a document',
				action: 'Get a document',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all documents',
				action: 'Get all documents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a document',
				action: 'Update a document',
			},
		],
		default: 'create',
	},
];

export const documentFields: INodeProperties[] = [
	// ----------------------------------
	//       document: getAll
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'DocType whose documents to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		placeholder: 'Customer',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
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
		typeOptions: {
			minValue: 1,
		},
		default: 10,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDocFilters',
					loadOptionsDependsOn: [
						'docType',
					],
				},
				default: [],
				description: 'Comma-separated list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				placeholder: 'name,country',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Filter',
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getDocFields',
									loadOptionsDependsOn: [
										'docType',
									],
								},
								default: '',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'is',
								options: [
									{
										name: 'EQUALS, or GREATER',
										value: 'equalsGreater',
									},
									{
										name: 'EQUALS, or LESS',
										value: 'equalsLess',
									},
									{
										name: 'IS',
										value: 'is',
									},
									{
										name: 'IS GREATER',
										value: 'greater',
									},
									{
										name: 'IS LESS',
										value: 'less',
									},
									{
										name: 'IS NOT',
										value: 'isNot',
									},
								],
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the operator condition',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//       document: create
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		required: true,
		description: 'DocType you would like to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		placeholder: 'Customer',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Properties',
		name: 'properties',
		type: 'fixedCollection',
		placeholder: 'Add Property',
		required: true,
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Property',
				name: 'customProperty',
				placeholder: 'Add Property',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'field',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDocFields',
							loadOptionsDependsOn: [
								'docType',
							],
						},
						default: [],
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

	// ----------------------------------
	//          document: get
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The type of document you would like to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
	},

	// ----------------------------------
	//       document: delete
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The type of document you would like to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},

	// ----------------------------------
	//       document: update
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The type of document you would like to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Properties',
		name: 'properties',
		type: 'fixedCollection',
		placeholder: 'Add Property',
		description: 'Properties of request body',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Property',
				name: 'customProperty',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'field',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDocFields',
							loadOptionsDependsOn: [
								'docType',
							],
						},
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
];
