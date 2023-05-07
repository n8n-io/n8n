import type { INodeProperties } from 'n8n-workflow';

import { allCurrencies } from './currencies';

import { activeCampaignDefaultGetAllProperties } from './GenericFunctions';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deal'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
				action: 'Create a deal',
			},
			{
				name: 'Create Note',
				value: 'createNote',
				description: 'Create a deal note',
				action: 'Create a deal note',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
				action: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a deal',
				action: 'Get a deal',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many deals',
				action: 'Get many deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
				action: 'Update a deal',
			},
			{
				name: 'Update Deal Note',
				value: 'updateNote',
				description: 'Update a deal note',
				action: 'Update a deal note',
			},
		],
		default: 'create',
	},
];

export const dealFields: INodeProperties[] = [
	// ----------------------------------
	//         deal:create
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: 'The title of the deal',
	},
	{
		displayName: "Deal's Contact ID",
		name: 'contact',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: "The ID of the deal's contact",
	},
	{
		displayName: 'Deal Value',
		name: 'value',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: 'The value of the deal in cents',
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'options',
		default: 'eur',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		options: allCurrencies,
		description: 'The currency of the deal in 3-character ISO format',
	},
	{
		displayName: 'Deal Pipeline ID',
		name: 'group',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: 'The pipeline ID of the deal',
	},
	{
		displayName: 'Deal Stage ID',
		name: 'stage',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: 'The stage ID of the deal',
	},
	{
		displayName: 'Deal Owner ID',
		name: 'owner',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: 'The owner ID of the deal',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the deal',
			},

			{
				displayName: 'Deal Percentage',
				name: 'percent',
				type: 'number',
				default: 0,
				description: 'The percentage of the deal',
			},
			{
				displayName: 'Deal Status',
				name: 'status',
				type: 'number',
				default: 0,
				description: 'The status of the deal',
			},
		],
	},

	// ----------------------------------
	//         deal:update
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['deal'],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the deal to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['deal'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the deal',
			},
			{
				displayName: "Deal's Contact ID",
				name: 'contact',
				type: 'number',
				default: 0,
				description: "The ID of the deal's contact",
			},
			{
				displayName: 'Deal Value',
				name: 'value',
				type: 'number',
				default: 0,
				description: 'The value of the deal in cents',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'options',
				options: allCurrencies,
				default: 'eur',
				description: 'The currency of the deal in 3-character ISO format',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the deal',
			},
			{
				displayName: 'Deal Pipeline ID',
				name: 'group',
				type: 'string',
				default: '',
				description: 'The pipeline ID of the deal',
			},
			{
				displayName: 'Deal Stage ID',
				name: 'stage',
				type: 'string',
				default: '',
				description: 'The stage ID of the deal',
			},
			{
				displayName: 'Deal Owner ID',
				name: 'owner',
				type: 'string',
				default: '',
				description: 'The owner ID of the deal',
			},
			{
				displayName: 'Deal Percentage',
				name: 'percent',
				type: 'number',
				default: 0,
				description: 'The percentage of the deal',
			},
			{
				displayName: 'Deal Status',
				name: 'status',
				type: 'number',
				default: 0,
				description: 'The status of the deal',
			},
		],
	},

	// ----------------------------------
	//         deal:delete
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['deal'],
			},
		},
		description: 'The ID of the deal to delete',
	},

	// ----------------------------------
	//         deal:get
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['deal'],
			},
		},
		description: 'The ID of the deal to get',
	},

	// ----------------------------------
	//         deal:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('deal', 'getAll'),

	// ----------------------------------
	//         dealNote:create
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['createNote'],
				resource: ['deal'],
			},
		},
		description: 'The ID of the deal note',
	},
	{
		displayName: 'Deal Note',
		name: 'dealNote',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['createNote'],
				resource: ['deal'],
			},
		},
		description: 'The content of the deal note',
	},

	// ----------------------------------
	//         dealNote:update
	// ----------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['updateNote'],
				resource: ['deal'],
			},
		},
		description: 'The ID of the deal note',
	},
	{
		displayName: 'Deal Note ID',
		name: 'dealNoteId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['updateNote'],
				resource: ['deal'],
			},
		},
		description: 'The ID of the deal note',
	},
	{
		displayName: 'Deal Note',
		name: 'dealNote',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['updateNote'],
				resource: ['deal'],
			},
		},
		description: 'The content of the deal note',
	},
];
