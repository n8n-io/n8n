import { INodeProperties } from 'n8n-workflow';

export const controlOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'control',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a control',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all controls',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const controlFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                   control:get                              */
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
					'control',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'Control ID',
		name: 'controlId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'control',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'The control to get the row from.',
	},
/* -------------------------------------------------------------------------- */
/*                                   control:getAll                           */
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
					'control',
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
					'control',
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
					'control',
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
