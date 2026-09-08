import type { INodeProperties } from 'n8n-workflow';

import { makeSimpleField, personAdditionalFieldsOptions } from './SharedFields';

export const personOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['person'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a person',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a person',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many people',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a person',
			},
		],
		default: 'create',
	},
];

export const personFields: INodeProperties[] = [
	// ----------------------------------------
	//              person: create
	// ----------------------------------------
	makeSimpleField('person', 'create'),
	{
		displayName: 'Email address', // on create, only _one_ must be passed in
		name: 'email_addresses',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add email address field',
		description: 'Person’s email addresses',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Email addresses fields',
				name: 'email_addresses_fields',
				values: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: "Person's email address",
					},
					{
						displayName: 'Primary',
						name: 'primary',
						type: 'hidden',
						default: true,
						description: "Whether this is the person's primary email address",
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: 'subscribed',
						description: 'Subscription status of this email address',
						options: [
							{
								name: 'Bouncing',
								value: 'bouncing',
							},
							{
								name: 'Previous bounce',
								value: 'previous bounce',
							},
							{
								name: 'Previous spam complaint',
								value: 'previous spam complaint',
							},
							{
								name: 'Spam complaint',
								value: 'spam complaint',
							},
							{
								name: 'Subscribed',
								value: 'subscribed',
							},
							{
								name: 'Unsubscribed',
								value: 'unsubscribed',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['create'],
			},
		},
		options: personAdditionalFieldsOptions,
	},

	// ----------------------------------------
	//               person: get
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['get'],
			},
		},
	},
	makeSimpleField('person', 'get'),

	// ----------------------------------------
	//              person: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 25,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 25,
		},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	makeSimpleField('person', 'getAll'),

	// ----------------------------------------
	//              person: update
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['update'],
			},
		},
	},
	makeSimpleField('person', 'update'),
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['update'],
			},
		},
		options: personAdditionalFieldsOptions,
	},
];
