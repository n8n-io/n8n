import {
	INodeProperties,
} from 'n8n-workflow';

import {
	makeSimpleField,
} from './SharedFields';

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tag',
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
		],
		default: 'create',
		description: 'Operation to perform',
	},
];

export const tagFields: INodeProperties[] = [
	// ----------------------------------------
	//               tag: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the tag to create.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'create',
				],
			},
		},
	},
	makeSimpleField('tag', 'create'),

	// ----------------------------------------
	//                 tag: get
	// ----------------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		description: 'ID of the tag to retrieve.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'get',
				],
			},
		},
	},
	makeSimpleField('tag', 'get'),

	// ----------------------------------------
	//               tag: getAll
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
					'tag',
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
					'tag',
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
	makeSimpleField('tag', 'getAll'),
];
