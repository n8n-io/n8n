import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
				action: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 contact:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		required: true,
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'The email address of the contact',
	},
	{
		displayName: 'List Name or ID',
		name: 'listId',
		required: true,
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
					loadOptionsMethod: 'getCustomFields',
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Key Name or ID',
								name: 'key',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								description: 'The end user specified key of the user defined data. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
					},
					{
						name: 'Banned',
						value: 'BANNED',
					},
					{
						name: 'Bounced',
						value: 'BOUNCED',
					},
					{
						name: 'Inactive',
						value: 'INACTIVE',
					},

					{
						name: 'Unsubscribed',
						value: 'UNSUBSCRIBED',
					},
				],
				default: '',
				description: 'The status of the contact. You can only send email to contacts with ACTIVE status.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The tags you want to set to the contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Can be ID or email',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Can be ID or email',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List Name or ID',
		name: 'listId',
		required: true,
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contact',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'contact',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Defines the direction in which search results are ordered. Default value is DESC. Note: It has to be using with the Sort By parameter',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'string',
				default: 'Defines the field in which search results are sort by. Note: It has to be using with the Direcction parameter',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		required: true,
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Add Tag Names or IDs',
				name: 'addTags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The tags you want to add to the contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
					loadOptionsMethod: 'getCustomFields',
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Key Name or ID',
								name: 'key',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								description: 'The end user specified key of the user defined data. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Remove Tags',
				name: 'removeTags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The tags you want to add to the contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
					},
					{
						name: 'Banned',
						value: 'BANNED',
					},
					{
						name: 'Bounced',
						value: 'BOUNCED',
					},
					{
						name: 'Inactive',
						value: 'INACTIVE',
					},
					{
						name: 'Unsubscribed',
						value: 'UNSUBSCRIBED',
					},
				],
				default: '',
				description: 'The status of the contact. You can only send email to contacts with ACTIVE status.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The tags you want to set to the contact. Will replace all existing ones. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
		],
	},
];
