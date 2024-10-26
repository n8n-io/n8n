import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			// https://craftmypdf.com/docs/index.html#tag/Account-Management-API/operation/get-account-info
			{
				name: 'Get',
				value: 'get',
				description: 'Get account information',
				action: 'Get account information',
			},
		],
		default: 'get',
	},
];
