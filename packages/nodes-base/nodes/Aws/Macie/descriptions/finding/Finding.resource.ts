import type { INodeProperties } from 'n8n-workflow';
import { handleMacieError } from '../../helpers/errorHandler';

export const findingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['finding'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of findings',
				action: 'Get findings',
				routing: {
					request: {
						method: 'POST',
						url: '/findings/describe',
					},
					output: {
						postReceive: [handleMacieError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all findings',
				action: 'List findings',
				routing: {
					request: {
						method: 'POST',
						url: '/findings',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'findingIds',
								},
							},
							handleMacieError,
						],
					},
				},
			},
		],
	},
];

export const findingFields: INodeProperties[] = [
	{
		displayName: 'Finding IDs',
		name: 'findingIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['get'],
			},
		},
		description: 'Comma-separated list of finding IDs',
		routing: {
			request: {
				body: {
					findingIds: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['list'],
			},
		},
		description: 'Max number of results to return',
		routing: {
			request: {
				body: {
					maxResults: '={{ $value }}',
				},
			},
		},
	},
];
