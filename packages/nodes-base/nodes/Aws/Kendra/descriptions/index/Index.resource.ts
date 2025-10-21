import type { INodeProperties } from 'n8n-workflow';
import { handleKendraError } from '../../helpers/errorHandler';

export const indexOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['index'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new index',
				action: 'Create an index',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.CreateIndex',
						},
					},
					output: {
						postReceive: [handleKendraError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an index',
				action: 'Delete an index',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.DeleteIndex',
						},
					},
					output: {
						postReceive: [handleKendraError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of an index',
				action: 'Describe an index',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.DescribeIndex',
						},
					},
					output: {
						postReceive: [handleKendraError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all indexes',
				action: 'List indexes',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.ListIndices',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'IndexConfigurationSummaryItems',
								},
							},
							handleKendraError,
						],
					},
				},
			},
		],
	},
];

export const indexFields: INodeProperties[] = [
	{
		displayName: 'Index Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
		description: 'The name of the index',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Index ID',
		name: 'indexId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The identifier of the index',
		routing: {
			request: {
				body: {
					Id: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
		description: 'IAM role ARN for the index',
		routing: {
			request: {
				body: {
					RoleArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Edition',
		name: 'edition',
		type: 'options',
		default: 'DEVELOPER_EDITION',
		displayOptions: {
			show: {
				resource: ['index'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Developer Edition',
				value: 'DEVELOPER_EDITION',
			},
			{
				name: 'Enterprise Edition',
				value: 'ENTERPRISE_EDITION',
			},
		],
		description: 'The edition of Amazon Kendra',
		routing: {
			request: {
				body: {
					Edition: '={{ $value }}',
				},
			},
		},
	},
];
