import { INodeProperties } from 'n8n-workflow';

export const linkOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'link',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a link',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a link',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a link',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
				resource: [
					'link',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		placeholder: 'https://example.com',
		required: true,
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
					'link',
				],
				operation: [
					'create',
				],
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
				displayName: 'Group',
				name: 'group',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
					loadOptionsDependsOn: [
						'group',
					],
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
		placeholder: 'Add Deep Link',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'link',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'deeplinkUi',
				displayName: 'Deep Link',
				values: [
					{
						displayName: 'App ID',
						name: 'appId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'App URI Path',
						name: 'appUriPath',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Install Type',
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
				resource: [
					'link',
				],
				operation: [
					'update',
				],
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
				resource: [
					'link',
				],
				operation: [
					'update',
				],
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
				displayName: 'Group',
				name: 'group',
				type: 'options',
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
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
					loadOptionsDependsOn: [
						'group',
					],
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
		placeholder: 'Add Deep Link',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'link',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'deeplinkUi',
				displayName: 'Deep Link',
				values: [
					{
						displayName: 'App ID',
						name: 'appId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'App URI Path',
						name: 'appUriPath',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Install Type',
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
				resource: [
					'link',
				],
				operation: [
					'get',
				],
			},
		},
	},
];
