import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'executeStatement',
		displayOptions: {
			show: {
				resource: ['statement'],
			},
		},
		options: [
			{
				name: 'Execute Statement',
				value: 'executeStatement',
				description: 'Execute a SQL statement',
				action: 'Execute a SQL statement',
				routing: {
					request: {
						method: 'POST',
						url: '/Execute',
						headers: {
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							resourceArn: '={{ $parameter["resourceArn"] }}',
							secretArn: '={{ $parameter["secretArn"] }}',
							sql: '={{ $parameter["sql"] }}',
							database: '={{ $parameter["database"] }}',
							parameters: '={{ $parameter["parameters"] }}',
							includeResultMetadata: '={{ $parameter["includeResultMetadata"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Batch Execute Statement',
				value: 'batchExecuteStatement',
				description: 'Execute a SQL statement with multiple parameter sets',
				action: 'Batch execute statement',
				routing: {
					request: {
						method: 'POST',
						url: '/BatchExecute',
						headers: {
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							resourceArn: '={{ $parameter["resourceArn"] }}',
							secretArn: '={{ $parameter["secretArn"] }}',
							sql: '={{ $parameter["sql"] }}',
							database: '={{ $parameter["database"] }}',
							parameterSets: '={{ $parameter["parameterSets"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Begin Transaction',
				value: 'beginTransaction',
				description: 'Start a SQL transaction',
				action: 'Begin transaction',
				routing: {
					request: {
						method: 'POST',
						url: '/BeginTransaction',
						headers: {
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							resourceArn: '={{ $parameter["resourceArn"] }}',
							secretArn: '={{ $parameter["secretArn"] }}',
							database: '={{ $parameter["database"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Commit Transaction',
				value: 'commitTransaction',
				description: 'Commit a SQL transaction',
				action: 'Commit transaction',
				routing: {
					request: {
						method: 'POST',
						url: '/CommitTransaction',
						headers: {
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							resourceArn: '={{ $parameter["resourceArn"] }}',
							secretArn: '={{ $parameter["secretArn"] }}',
							transactionId: '={{ $parameter["transactionId"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Rollback Transaction',
				value: 'rollbackTransaction',
				description: 'Rollback a SQL transaction',
				action: 'Rollback transaction',
				routing: {
					request: {
						method: 'POST',
						url: '/RollbackTransaction',
						headers: {
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							resourceArn: '={{ $parameter["resourceArn"] }}',
							secretArn: '={{ $parameter["secretArn"] }}',
							transactionId: '={{ $parameter["transactionId"] }}',
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
		displayName: 'Resource ARN',
		name: 'resourceArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['statement'],
			},
		},
		default: '',
		description: 'ARN of the Aurora Serverless DB cluster',
	},
	{
		displayName: 'Secret ARN',
		name: 'secretArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['statement'],
			},
		},
		default: '',
		description: 'ARN of the Secrets Manager secret containing database credentials',
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['statement'],
				operation: ['executeStatement', 'batchExecuteStatement', 'beginTransaction'],
			},
		},
		default: '',
		description: 'Database name',
	},
	// Execute Statement
	{
		displayName: 'SQL',
		name: 'sql',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['statement'],
				operation: ['executeStatement', 'batchExecuteStatement'],
			},
		},
		default: '',
		description: 'SQL statement to execute',
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['statement'],
				operation: ['executeStatement'],
			},
		},
		default: '[]',
		description: 'SQL parameters as array of {name, value: {stringValue, longValue, doubleValue, booleanValue}}',
	},
	{
		displayName: 'Include Result Metadata',
		name: 'includeResultMetadata',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['statement'],
				operation: ['executeStatement'],
			},
		},
		default: true,
		description: 'Whether to include column metadata in results',
	},
	// Batch Execute Statement
	{
		displayName: 'Parameter Sets',
		name: 'parameterSets',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['statement'],
				operation: ['batchExecuteStatement'],
			},
		},
		default: '[[]]',
		description: 'Array of parameter sets for batch execution',
	},
	// Transaction operations
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['statement'],
				operation: ['commitTransaction', 'rollbackTransaction'],
			},
		},
		default: '',
		description: 'Transaction ID from BeginTransaction',
	},
];
