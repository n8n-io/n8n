import { INodeProperties } from 'n8n-workflow';

import {
	addressFixedCollection,
	emailFixedCollection,
	phoneNumbersFixedCollection,
} from '../utils/sharedFields';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a lead',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all leads',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a lead',
			},
		],
		default: 'create',
	},
];

export const leadFields: INodeProperties[] = [
	// ----------------------------------------
	//               lead: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the lead to create',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [addressFixedCollection, emailFixedCollection, phoneNumbersFixedCollection],
	},

	// ----------------------------------------
	//               lead: delete
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                lead: get
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//               lead: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filterFields',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Name of the country to filter by',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the lead to filter by',
			},
		],
	},

	// ----------------------------------------
	//               lead: update
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
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
				resource: ['lead'],
				operation: ['update'],
			},
		},
		options: [
			addressFixedCollection,
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
				description: 'Description to set for the lead',
			},
			emailFixedCollection,
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name to set for the lead',
			},
			phoneNumbersFixedCollection,
		],
	},
];
