import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
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
				description: 'Create a data source',
				action: 'Create a data source',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							name: '={{ $parameter["dataSourceName"] }}',
							type: '={{ $parameter["dataSourceType"] }}',
							serviceRoleArn: '={{ $parameter["serviceRoleArn"] }}',
							dynamodbConfig: '={{ $parameter["dynamodbConfig"] }}',
							lambdaConfig: '={{ $parameter["lambdaConfig"] }}',
							elasticsearchConfig: '={{ $parameter["elasticsearchConfig"] }}',
							httpConfig: '={{ $parameter["httpConfig"] }}',
							relationalDatabaseConfig: '={{ $parameter["relationalDatabaseConfig"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
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
						method: 'DELETE',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources/{{ $parameter["dataSourceName"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a data source',
				action: 'Get a data source',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources/{{ $parameter["dataSourceName"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List data sources',
				action: 'List data sources',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources?maxResults={{ $parameter["maxResults"] }}&nextToken={{ $parameter["nextToken"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a data source',
				action: 'Update a data source',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources/{{ $parameter["dataSourceName"] }}',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							type: '={{ $parameter["dataSourceType"] }}',
							serviceRoleArn: '={{ $parameter["serviceRoleArn"] }}',
							dynamodbConfig: '={{ $parameter["dynamodbConfig"] }}',
							lambdaConfig: '={{ $parameter["lambdaConfig"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Common fields
	{
		displayName: 'API ID',
		name: 'apiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
			},
		},
		default: '',
		description: 'GraphQL API ID',
	},
	{
		displayName: 'Data Source Name',
		name: 'dataSourceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'Name of the data source',
	},
	// Create/Update operations
	{
		displayName: 'Data Source Type',
		name: 'dataSourceType',
		type: 'options',
		options: [
			{ name: 'DynamoDB', value: 'AMAZON_DYNAMODB' },
			{ name: 'Lambda', value: 'AWS_LAMBDA' },
			{ name: 'Elasticsearch', value: 'AMAZON_ELASTICSEARCH' },
			{ name: 'OpenSearch', value: 'AMAZON_OPENSEARCH_SERVICE' },
			{ name: 'HTTP', value: 'HTTP' },
			{ name: 'RDS', value: 'RELATIONAL_DATABASE' },
			{ name: 'None', value: 'NONE' },
		],
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'update'],
			},
		},
		default: 'AMAZON_DYNAMODB',
		description: 'Type of data source',
	},
	{
		displayName: 'Service Role ARN',
		name: 'serviceRoleArn',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'IAM role ARN for AppSync to access the data source',
	},
	{
		displayName: 'DynamoDB Config',
		name: 'dynamodbConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'update'],
				dataSourceType: ['AMAZON_DYNAMODB'],
			},
		},
		default: '{"tableName": "MyTable", "awsRegion": "us-east-1"}',
		description: 'DynamoDB table configuration',
	},
	{
		displayName: 'Lambda Config',
		name: 'lambdaConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'update'],
				dataSourceType: ['AWS_LAMBDA'],
			},
		},
		default: '{"lambdaFunctionArn": "arn:aws:lambda:region:account:function:name"}',
		description: 'Lambda function configuration',
	},
	{
		displayName: 'Elasticsearch Config',
		name: 'elasticsearchConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
				dataSourceType: ['AMAZON_ELASTICSEARCH'],
			},
		},
		default: '{"endpoint": "https://search-domain.region.es.amazonaws.com", "awsRegion": "us-east-1"}',
		description: 'Elasticsearch domain configuration',
	},
	{
		displayName: 'HTTP Config',
		name: 'httpConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
				dataSourceType: ['HTTP'],
			},
		},
		default: '{"endpoint": "https://api.example.com"}',
		description: 'HTTP endpoint configuration',
	},
	{
		displayName: 'Relational Database Config',
		name: 'relationalDatabaseConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
				dataSourceType: ['RELATIONAL_DATABASE'],
			},
		},
		default: '{"relationalDatabaseSourceType": "RDS_HTTP_ENDPOINT", "rdsHttpEndpointConfig": {"awsRegion": "us-east-1", "dbClusterIdentifier": "cluster-id", "awsSecretStoreArn": "arn:aws:secretsmanager:region:account:secret:name"}}',
		description: 'RDS configuration',
	},
	// List operation
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['list'],
			},
		},
		default: 25,
		description: 'Maximum number of data sources to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
];
