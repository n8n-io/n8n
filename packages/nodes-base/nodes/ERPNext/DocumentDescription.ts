import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a document.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a document.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all documents.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a document.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const documentFields = [
/* -------------------------------------------------------------------------- */
/*                                document:getAll                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'DocType',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The DocType of which the documents you want to get.',
		placeholder: 'Customer',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll'
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all items.',
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
		default: 10,
		description: 'Limit number of results returned.',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDocFields',
					loadOptionsDependsOn: [
						'docType',
					],
				},
				default: '',
				description: 'Comma separated fields you wish returned.',
				placeholder: 'name,country'
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
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
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Specific field of the Doctype.',
								placeholder: 'country'
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'is',
								description: 'Property value.',
								options: [
									{
										name: 'IS',
										value: 'is'
									},
									{
										name: 'IS NOT',
										value: 'isNot'
									},
									{
										name: 'IS GREATER',
										value: 'greater'
									},
									{
										name: 'IS LESS',
										value: 'less'
									},
									{
										name: 'EQUALS, or GREATER',
										value: 'equalsGreater'
									},
									{
										name: 'EQUALS, or LESS',
										value: 'equalsLess'
									},
								]
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of operator condition.',
								placeholder: 'india'
							},
						],
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                document:create                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'DocType',
		name: 'docType',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		description: 'DocType you would like to create.',
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
		description: 'Properties of request body.',
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
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDocFields',
							loadOptionsDependsOn: [
								'docType',
							],
						},
						default: '',
						description: 'Name of field.',
						placeholder: 'Name'
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of field.',
						placeholder: 'John'
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                document:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'DocType',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The type of document you would like to get.',
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
		required: true
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get'
				],
			},
		},
		required: true
	},
/* -------------------------------------------------------------------------- */
/*                                document:remove                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'DocType',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The type of document you would like to delete.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete'
				],
			},
		},
		required: true
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete'
				],
			},
		},
		required: true
	},
/* -------------------------------------------------------------------------- */
/*                                document:update                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'DocType',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'The type of document you would like to update',
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
		required: true
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get.',
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
		required: true
	},
	{
		displayName: 'Properties',
		name: 'properties',
		type: 'fixedCollection',
		description: 'Properties of request body.',
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
						displayName: 'Field',
						name: 'field',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDocFields',
							loadOptionsDependsOn: [
								'docType',
							],
						},
						default: '',
						description: 'Name of field.',
						placeholder: 'Name'
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of field.',
						placeholder: 'John'
					},
				],
			},
		],
	},
] as INodeProperties[];
