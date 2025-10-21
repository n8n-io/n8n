import type { INodeProperties } from 'n8n-workflow';
import { handleLakeFormationError } from '../../helpers/errorHandler';

export const resourceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['resource'],
			},
		},
		options: [
			{
				name: 'Register',
				value: 'register',
				action: 'Register a resource',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.RegisterResource',
						},
					},
					output: {
						postReceive: [handleLakeFormationError],
					},
				},
			},
			{
				name: 'Deregister',
				value: 'deregister',
				action: 'Deregister a resource',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.DeregisterResource',
						},
					},
					output: {
						postReceive: [handleLakeFormationError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a resource',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.DescribeResource',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'ResourceInfo',
								},
							},
							handleLakeFormationError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List resources',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.ListResources',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'ResourceInfoList',
								},
							},
							handleLakeFormationError,
						],
					},
				},
			},
		],
	},
];

export const resourceFields: INodeProperties[] = [
	{
		displayName: 'Resource ARN',
		name: 'resourceArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['resource'],
				operation: ['register', 'deregister', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					ResourceArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Use Service Linked Role',
		name: 'useServiceLinkedRole',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['resource'],
				operation: ['register'],
			},
		},
		routing: {
			request: {
				body: {
					UseServiceLinkedRole: '={{ $value }}',
				},
			},
		},
	},
];
