import type { INodeProperties } from 'n8n-workflow';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transaction'],
			},
		},
		options: [
			// https://craftmypdf.com/docs/index.html#tag/Account-Management-API/operation/list-transactions
			{
				name: 'List',
				value: 'list',
				description: 'List transactions',
				action: 'List transactions',
			},
		],
		default: 'list',
	},
];

export const transactionFields: INodeProperties[] = [
	// ----------------------------------
	// transaction:list
	// https://craftmypdf.com/docs/index.html#tag/Account-Management-API/operation/list-transactions
	// ----------------------------------
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 300,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['list'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		description: 'Offset is used to skip the number of records from the results',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['list'],
			},
		},
	},
];
