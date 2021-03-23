import {
	INodeProperties,
} from 'n8n-workflow';

import {
	isoCountryCodes,
} from './IsoCountryCodes';

import {
	addressFixedCollection,
	phoneNumbersFixedCollection,
} from './sharedFields';

export const companyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'getAll',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const companyFields = [
	// ----------------------------------------
	//             company: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the company to create.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
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
					'company',
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
				description: 'Description of the company to create.',
			},
			{
				displayName: 'Email Domain',
				name: 'email_domain',
				type: 'string',
				default: '',
			},
			phoneNumbersFixedCollection,
		]
	},

	// ----------------------------------------
	//             company: delete
	// ----------------------------------------
	{
		displayName: 'Company ID',
		name: 'companyId',
		description: 'ID of the company to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//               company: get
	// ----------------------------------------
	{
		displayName: 'Company ID',
		name: 'companyId',
		description: 'ID of the company to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             company: getAll
	// ----------------------------------------
	{
		displayName: 'Filter Fields',
		name: 'filterFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'options',
				options: isoCountryCodes.map(({ name, alpha2 }) => ({ name, value: alpha2 })),
				default: '',
				description: 'Country of the company to filter by.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the company to filter by.',
			},
		]
	},

	// ----------------------------------------
	//             company: update
	// ----------------------------------------
	{
		displayName: 'Company ID',
		name: 'companyId',
		description: 'ID of the company to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
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
					'company',
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
				description: 'Description to set for the company.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name to set for the company.',
			},
			phoneNumbersFixedCollection,
		]
	},
] as INodeProperties[];
