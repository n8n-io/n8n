import type { INodeProperties } from 'n8n-workflow';

import { tableRLC } from './common.descriptions';

export const tableOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['table'],
		},
	},
	options: [
		{
			name: 'Create',
			value: 'create',
			action: 'Create a table',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a table',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a table',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many table',
		},
		// {
		// 	name: 'Update',
		// 	value: 'update',
		// 	action: 'Update a table',
		// },
	],
	default: 'create',
};

export const tableDescriptions: INodeProperties[] = [
	// create --------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'fixedCollection',
		default: [],
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						requiresDataPath: 'single',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						description: 'The field value type',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'String',
								value: 'string',
							},
							{
								name: 'Number',
								value: 'number',
							},
							{
								name: 'Boolean',
								value: 'boolean',
							},
							{
								name: 'Date',
								value: 'date',
							},
						],
						default: 'string',
					},
					{
						displayName: 'Required',
						name: 'required',
						type: 'boolean',
						default: false,
						requiresDataPath: 'single',
					},
				],
			},
		],
	},

	{ ...tableRLC, displayOptions: { show: { resource: ['table'], operation: ['delete', 'get'] } } },
];
