import type { INodeProperties } from 'n8n-workflow';
import { handleInspectorError } from '../../helpers/errorHandler';

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
						url: '/',
						headers: {
							'X-Amz-Target': 'Inspector2.BatchGetFindingDetails',
						},
					},
					output: {
						postReceive: [handleInspectorError],
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
						url: '/',
						headers: {
							'X-Amz-Target': 'Inspector2.ListFindings',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'findings',
								},
							},
							handleInspectorError,
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update finding status',
				action: 'Update finding',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Inspector2.UpdateFindingAggregation',
						},
					},
					output: {
						postReceive: [handleInspectorError],
					},
				},
			},
		],
	},
];

export const findingFields: INodeProperties[] = [
	// Get fields
	{
		displayName: 'Finding ARNs',
		name: 'findingArns',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['get'],
			},
		},
		description: 'Comma-separated list of finding ARNs to retrieve',
		routing: {
			request: {
				body: {
					findingArns: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},

	// List fields
	{
		displayName: 'Filter Criteria',
		name: 'filterCriteria',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['list'],
			},
		},
		description: 'Filter criteria for findings. Example: {"severities":[{"comparison":"EQUALS","value":"HIGH"}]}',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const filterCriteria = this.getNodeParameter('filterCriteria', 0) as string;
						if (filterCriteria && filterCriteria !== '{}') {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).filterCriteria = JSON.parse(filterCriteria);
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 100,
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
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['list'],
			},
		},
		description: 'Pagination token for next page',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const nextToken = this.getNodeParameter('nextToken', 0) as string;
						if (nextToken) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).nextToken = nextToken;
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Sort Criteria',
		name: 'sortCriteria',
		type: 'json',
		default: '{"field":"SEVERITY","sortOrder":"DESC"}',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['list'],
			},
		},
		description: 'Sort criteria for findings',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const sortCriteria = this.getNodeParameter('sortCriteria', 0) as string;
						if (sortCriteria) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).sortCriteria = JSON.parse(sortCriteria);
						}
						return requestOptions;
					},
				],
			},
		},
	},

	// Update fields
	{
		displayName: 'Aggregation Type',
		name: 'aggregationType',
		type: 'options',
		required: true,
		default: 'FINDING_TYPE',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'Finding Type',
				value: 'FINDING_TYPE',
			},
			{
				name: 'Package',
				value: 'PACKAGE',
			},
			{
				name: 'Title',
				value: 'TITLE',
			},
			{
				name: 'Repository',
				value: 'REPOSITORY',
			},
			{
				name: 'AMI',
				value: 'AMI',
			},
		],
		description: 'The aggregation type to update',
		routing: {
			request: {
				body: {
					aggregationType: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Aggregation Request',
		name: 'aggregationRequest',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['update'],
			},
		},
		description: 'The aggregation request details',
		routing: {
			request: {
				body: {
					aggregationRequest: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
