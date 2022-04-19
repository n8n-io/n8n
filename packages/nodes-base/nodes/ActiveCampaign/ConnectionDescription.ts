import {
	INodeProperties,
} from 'n8n-workflow';

import {
	activeCampaignDefaultGetAllProperties,
} from './GenericFunctions';

export const connectionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'connection',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a connection',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a connection',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a connection',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all connections',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a connection',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},

];

export const connectionFields: INodeProperties[] = [
	// ----------------------------------
	//         connection:create
	// ----------------------------------
	{
		displayName: 'Service',
		name: 'service',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'connection',
				],
			},
		},
		description: 'The name of the service.',
	},
	{
		displayName: 'External accout ID',
		name: 'externalid',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'connection',
				],
			},
		},
		description: 'The id of the account in the external service.',
	},
	{
		displayName: 'Account Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'connection',
				],
			},
		},
		description: 'The name associated with the account in the external service. Often this will be a company name (e.g., "My Toystore, Inc.").',
	},
	{
		displayName: 'Logo URL',
		name: 'logoUrl',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'connection',
				],
			},
		},
		description: 'The URL to a logo image for the external service.',
	},
	{
		displayName: 'Link URL',
		name: 'linkUrl',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'connection',
				],
			},
		},
		description: 'The URL to a page where the integration with the external service can be managed in the third-party\'s website.',
	},

	// ----------------------------------
	//         connection:update
	// ----------------------------------
	{
		displayName: 'Connection ID',
		name: 'connectionId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'connection',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the connection to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update.',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'connection',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Service',
				name: 'service',
				type: 'string',
				default: '',
				description: 'The name of the service.',
			},
			{
				displayName: 'External accout ID',
				name: 'externalid',
				type: 'string',
				default: '',
				description: 'The id of the account in the external service.',
			},
			{
				displayName: 'Account Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name associated with the account in the external service. Often this will be a company name (e.g., "My Toystore, Inc.").',
			},
			{
				displayName: 'Logo URL',
				name: 'logoUrl',
				type: 'string',
				default: '',
				description: 'The URL to a logo image for the external service.',
			},
			{
				displayName: 'Link URL',
				name: 'linkUrl',
				type: 'string',
				default: '',
				description: 'The URL to a page where the integration with the external service can be managed in the third-party\'s website.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'number',
				default: 1,
				description: 'The status of the connection (0 = error; 1 = connected)',
			},
			{
				displayName: 'Syncronisation Status',
				name: 'syncStatus',
				type: 'number',
				default: 1,
				description: 'The status of a sync triggered on the connection (0 = sync stopped; 1 = sync running).',
			},
		],
	},

	// ----------------------------------
	//         connection:delete
	// ----------------------------------
	{
		displayName: 'Connection ID',
		name: 'connectionId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'connection',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the connection to delete.',
	},

	// ----------------------------------
	//         connection:get
	// ----------------------------------
	{
		displayName: 'Connection ID',
		name: 'connectionId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'connection',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the connection to get.',
	},

	// ----------------------------------
	//         connection:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('connection', 'getAll'),

];
