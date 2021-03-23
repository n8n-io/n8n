import {
	INodeProperties,
} from 'n8n-workflow';

import {
	addressFixedCollection,
	emailsFixedCollection,
	phoneNumbersFixedCollection,
} from './sharedFields';

export const personOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'person',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const personFields = [
	// ----------------------------------------
	//              person: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the person to create.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			addressFixedCollection,
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
				description: 'Description to set for the person.',
			},
			{
				displayName: 'Email Domain',
				name: 'email_domain',
				type: 'string',
				default: '',
			},
			emailsFixedCollection,
			phoneNumbersFixedCollection,
		],
	},

	// ----------------------------------------
	//              person: delete
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//               person: get
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              person: getAll
	// ----------------------------------------
	{
		displayName: 'Filter Fields',
		name: 'filterFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the person to filter by.',
			},
		],
	},

	// ----------------------------------------
	//              person: update
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'person',
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
		default: {},
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			addressFixedCollection,
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
				description: 'Description to set for the person.',
			},
			{
				displayName: 'Email Domain',
				name: 'email_domain',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Emails',
				name: 'emails',
				type: 'string',
				default: '',
				description: 'Comma-separated list of emails to set for the person.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name to set for the person.',
			},
			phoneNumbersFixedCollection,
		],
	},
] as INodeProperties[];
