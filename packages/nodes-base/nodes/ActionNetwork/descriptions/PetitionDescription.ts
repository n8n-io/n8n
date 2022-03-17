import {
	INodeProperties,
} from 'n8n-workflow';

import {
	makeSimpleField,
	petitionAdditionalFieldsOptions,
} from './SharedFields';

export const petitionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
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
];

export const petitionFields: INodeProperties[] = [
	// ----------------------------------------
	//             petition: create
	// ----------------------------------------
	{
		displayName: 'Origin System',
		name: 'originSystem',
		description: 'Source where the petition originated.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the petition to create.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'create',
				],
			},
		},
	},
	makeSimpleField('petition', 'create'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'create',
				],
			},
		},
		options: petitionAdditionalFieldsOptions,
	},

	// ----------------------------------------
	//              petition: get
	// ----------------------------------------
	{
		displayName: 'Petition ID',
		name: 'petitionId',
		description: 'ID of the petition to retrieve.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'get',
				],
			},
		},
	},
	makeSimpleField('petition', 'get'),

	// ----------------------------------------
	//             petition: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	makeSimpleField('petition', 'getAll'),

	// ----------------------------------------
	//             petition: update
	// ----------------------------------------
	{
		displayName: 'Petition ID',
		name: 'petitionId',
		description: 'ID of the petition to update.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'update',
				],
			},
		},
	},
	makeSimpleField('petition', 'update'),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'petition',
				],
				operation: [
					'update',
				],
			},
		},
		options: petitionAdditionalFieldsOptions,
	},
];
