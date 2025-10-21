import type { INodeProperties } from 'n8n-workflow';
import { handleKendraError } from '../../helpers/errorHandler';

export const dataSourceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['dataSource'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new data source',
				action: 'Create a data source',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.CreateDataSource',
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
				description: 'Delete a data source',
				action: 'Delete a data source',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.DeleteDataSource',
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
				description: 'Get details of a data source',
				action: 'Describe a data source',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.DescribeDataSource',
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
				description: 'List all data sources',
				action: 'List data sources',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.ListDataSources',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'SummaryItems',
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

export const dataSourceFields: INodeProperties[] = [
	{
		displayName: 'Index ID',
		name: 'indexId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataSource'],
			},
		},
		description: 'The identifier of the index',
		routing: {
			request: {
				body: {
					IndexId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Data Source Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
			},
		},
		description: 'The name of the data source',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Data Source ID',
		name: 'dataSourceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The identifier of the data source',
		routing: {
			request: {
				body: {
					Id: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'S3',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'S3',
				value: 'S3',
			},
			{
				name: 'SharePoint',
				value: 'SHAREPOINT',
			},
			{
				name: 'Salesforce',
				value: 'SALESFORCE',
			},
			{
				name: 'OneDrive',
				value: 'ONEDRIVE',
			},
		],
		description: 'The type of data source',
		routing: {
			request: {
				body: {
					Type: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Configuration',
		name: 'configuration',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
			},
		},
		description: 'Data source configuration (JSON format)',
		routing: {
			request: {
				body: {
					Configuration: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
