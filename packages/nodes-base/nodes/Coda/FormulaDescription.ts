import { INodeProperties } from 'n8n-workflow';

export const formulaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all formulas',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const formulaFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                   formula:get                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
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
		description: 'ID of the doc.',
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
		description: 'The formula to get the row from.',
	},
/* -------------------------------------------------------------------------- */
/*                                   formula:getAll                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
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
		description: 'ID of the doc.',
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
		description: 'If all results should be returned or only up to a given limit.',
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
		description: 'How many results to return.',
	},
];
