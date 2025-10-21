import type { INodeProperties } from 'n8n-workflow';
import { handlePersonalizeError } from '../../helpers/errorHandler';

export const datasetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['dataset'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a dataset',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.CreateDataset',
						},
					},
					output: {
						postReceive: [handlePersonalizeError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a dataset',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.DeleteDataset',
						},
					},
					output: {
						postReceive: [handlePersonalizeError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a dataset',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.DescribeDataset',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'dataset',
								},
							},
							handlePersonalizeError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List datasets',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.ListDatasets',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'datasets',
								},
							},
							handlePersonalizeError,
						],
					},
				},
			},
		],
	},
];

export const datasetFields: INodeProperties[] = [
	{
		displayName: 'Dataset Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Dataset ARN',
		name: 'datasetArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					datasetArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Dataset Group ARN',
		name: 'datasetGroupArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create', 'list'],
			},
		},
		routing: {
			request: {
				body: {
					datasetGroupArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Dataset Type',
		name: 'datasetType',
		type: 'options',
		required: true,
		default: 'Interactions',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Interactions',
				value: 'Interactions',
			},
			{
				name: 'Items',
				value: 'Items',
			},
			{
				name: 'Users',
				value: 'Users',
			},
		],
		routing: {
			request: {
				body: {
					datasetType: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Schema ARN',
		name: 'schemaArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					schemaArn: '={{ $value }}',
				},
			},
		},
	},
];
