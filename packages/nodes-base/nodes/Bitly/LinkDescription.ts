import type { INodeProperties } from 'n8n-workflow';

export const linkOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['link'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a link',
				action: 'Create a link',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a link',
				action: 'Get a link',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a link',
				action: 'Update a link',
			},
		],
		default: 'create',
	},
];

export const linkFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                link:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Long URL',
		name: 'longUrl',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['create'],
			},
		},
		default: '',
		placeholder: 'https://example.com',
		required: true,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: 'bit.ly',
			},
			{
				displayName: 'Group name or ID',
				name: 'group',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
					loadOptionsDependsOn: ['group'],
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Deeplinks',
		name: 'deeplink',
		placeholder: 'Add deep link',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'deeplinkUi',
				displayName: 'Deep link',
				values: [
					{
						displayName: 'App ID',
						name: 'appId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'App URI path',
						name: 'appUriPath',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Install type',
						name: 'installType',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Install URL',
						name: 'installUrl',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                link:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bitlink',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'bit.ly/22u3ypK',
		required: true,
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Group name or ID',
				name: 'group',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
			},
			{
				displayName: 'Long URL',
				name: 'longUrl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
					loadOptionsDependsOn: ['group'],
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Deeplinks',
		name: 'deeplink',
		placeholder: 'Add deep link',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				name: 'deeplinkUi',
				displayName: 'Deep link',
				values: [
					{
						displayName: 'App ID',
						name: 'appId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'App URI path',
						name: 'appUriPath',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Install type',
						name: 'installType',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Install URL',
						name: 'installUrl',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 link:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bitlink',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'bit.ly/22u3ypK',
		required: true,
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['get'],
			},
		},
	},
];
