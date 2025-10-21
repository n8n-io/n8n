import type { INodeProperties } from 'n8n-workflow';
import { handleForecastError } from '../../helpers/errorHandler';

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
				description: 'Create a new dataset',
				action: 'Create a dataset',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.CreateDataset',
						},
					},
					output: {
						postReceive: [handleForecastError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a dataset',
				action: 'Delete a dataset',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.DeleteDataset',
						},
					},
					output: {
						postReceive: [handleForecastError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a dataset',
				action: 'Describe a dataset',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.DescribeDataset',
						},
					},
					output: {
						postReceive: [handleForecastError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all datasets',
				action: 'List datasets',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.ListDatasets',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Datasets',
								},
							},
							handleForecastError,
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
		name: 'datasetName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		description: 'The name of the dataset',
		routing: {
			request: {
				body: {
					DatasetName: '={{ $value }}',
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
		description: 'The ARN of the dataset',
		routing: {
			request: {
				body: {
					DatasetArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'options',
		required: true,
		default: 'RETAIL',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Retail',
				value: 'RETAIL',
			},
			{
				name: 'Custom',
				value: 'CUSTOM',
			},
			{
				name: 'Inventory Planning',
				value: 'INVENTORY_PLANNING',
			},
			{
				name: 'EC2 Capacity',
				value: 'EC2_CAPACITY',
			},
			{
				name: 'Work Force',
				value: 'WORK_FORCE',
			},
			{
				name: 'Web Traffic',
				value: 'WEB_TRAFFIC',
			},
			{
				name: 'Metrics',
				value: 'METRICS',
			},
		],
		description: 'The domain associated with the dataset',
		routing: {
			request: {
				body: {
					Domain: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Dataset Type',
		name: 'datasetType',
		type: 'options',
		required: true,
		default: 'TARGET_TIME_SERIES',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Target Time Series',
				value: 'TARGET_TIME_SERIES',
			},
			{
				name: 'Related Time Series',
				value: 'RELATED_TIME_SERIES',
			},
			{
				name: 'Item Metadata',
				value: 'ITEM_METADATA',
			},
		],
		description: 'The type of dataset',
		routing: {
			request: {
				body: {
					DatasetType: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'json',
		required: true,
		default: '{"Attributes": []}',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		description: 'Dataset schema (JSON format)',
		routing: {
			request: {
				body: {
					Schema: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
