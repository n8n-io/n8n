import { INodeProperties } from 'n8n-workflow';

import { makeSimpleField } from './SharedFields';

export const signatureOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['signature'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a signature',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a signature',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all signatures',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a signature',
			},
		],
		default: 'create',
	},
];

export const signatureFields: INodeProperties[] = [
	// ----------------------------------------
	//            signature: create
	// ----------------------------------------
	{
		displayName: 'Petition ID',
		name: 'petitionId',
		description: 'ID of the petition to sign',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person whose signature to create',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['create'],
			},
		},
	},
	makeSimpleField('signature', 'create'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				default: '',
				description: 'Comments to leave when signing this petition',
			},
		],
	},

	// ----------------------------------------
	//              signature: get
	// ----------------------------------------
	{
		displayName: 'Petition ID',
		name: 'petitionId',
		description: 'ID of the petition whose signature to retrieve',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Signature ID',
		name: 'signatureId',
		description: 'ID of the signature to retrieve',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['get'],
			},
		},
	},
	makeSimpleField('signature', 'get'),

	// ----------------------------------------
	//            signature: getAll
	// ----------------------------------------
	{
		displayName: 'Petition ID',
		name: 'petitionId',
		description: 'ID of the petition whose signatures to retrieve',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	makeSimpleField('signature', 'getAll'),

	// ----------------------------------------
	//            signature: update
	// ----------------------------------------
	{
		displayName: 'Petition ID',
		name: 'petitionId',
		description: 'ID of the petition whose signature to update',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Signature ID',
		name: 'signatureId',
		description: 'ID of the signature to update',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['update'],
			},
		},
	},
	makeSimpleField('signature', 'update'),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				default: '',
				description: 'Comments to leave when signing this petition',
			},
		],
	},
];
