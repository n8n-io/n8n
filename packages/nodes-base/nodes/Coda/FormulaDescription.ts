import { INodeProperties } from 'n8n-workflow';

export const formulaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'formula',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a formula',
				action: 'Get a formula',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all formulas',
				action: 'Get all formulas',
			},
		],
		default: 'get',
	},
];

export const formulaFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                   formula:get                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'formula',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Formula ID',
		name: 'formulaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'formula',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'The formula to get the row from',
	},
/* -------------------------------------------------------------------------- */
/*                                   formula:getAll                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'formula',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'formula',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'formula',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
