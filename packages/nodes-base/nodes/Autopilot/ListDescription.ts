import {
	INodeProperties,
} from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a list.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all lists.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const listFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 list:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'list',
				],
			},
		},
		default: '',
		description: 'Name of the list to create.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 list:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'list',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'list',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
];
