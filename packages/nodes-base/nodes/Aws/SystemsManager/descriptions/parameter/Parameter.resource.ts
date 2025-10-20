import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		displayOptions: {
			show: {
				resource: ['parameter'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a parameter',
				action: 'Delete a parameter',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.DeleteParameter',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["parameterName"] }}',
						},
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
				description: 'Get a parameter',
				action: 'Get a parameter',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.GetParameter',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["parameterName"] }}',
							WithDecryption: '={{ $parameter["withDecryption"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Multiple',
				value: 'getMultiple',
				description: 'Get multiple parameters',
				action: 'Get multiple parameters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.GetParameters',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Names: '={{ $parameter["parameterNames"] }}',
							WithDecryption: '={{ $parameter["withDecryption"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get By Path',
				value: 'getByPath',
				description: 'Get parameters by path',
				action: 'Get parameters by path',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.GetParametersByPath',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Path: '={{ $parameter["path"] }}',
							Recursive: '={{ $parameter["recursive"] }}',
							WithDecryption: '={{ $parameter["withDecryption"] }}',
							MaxResults: '={{ $parameter["maxResults"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
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
				description: 'List parameters',
				action: 'List parameters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.DescribeParameters',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							MaxResults: '={{ $parameter["maxResults"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
							Filters: '={{ $parameter["filters"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Put',
				value: 'put',
				description: 'Create or update a parameter',
				action: 'Put a parameter',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.PutParameter',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["parameterName"] }}',
							Value: '={{ $parameter["value"] }}',
							Type: '={{ $parameter["type"] }}',
							Description: '={{ $parameter["description"] }}',
							Overwrite: '={{ $parameter["overwrite"] }}',
							KeyId: '={{ $parameter["keyId"] }}',
							Tags: '={{ $parameter["tags"] }}',
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
	// Common field
	{
		displayName: 'Parameter Name',
		name: 'parameterName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['get', 'delete', 'put'],
			},
		},
		default: '',
		description: 'Name of the parameter',
	},
	// Get/Put operations
	{
		displayName: 'With Decryption',
		name: 'withDecryption',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['get', 'getMultiple', 'getByPath'],
			},
		},
		default: false,
		description: 'Whether to decrypt SecureString parameters',
	},
	// Put operation fields
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['put'],
			},
		},
		default: '',
		description: 'Parameter value',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'String', value: 'String' },
			{ name: 'String List', value: 'StringList' },
			{ name: 'Secure String', value: 'SecureString' },
		],
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['put'],
			},
		},
		default: 'String',
		description: 'Parameter type',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['put'],
			},
		},
		default: '',
		description: 'Parameter description',
	},
	{
		displayName: 'Overwrite',
		name: 'overwrite',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['put'],
			},
		},
		default: true,
		description: 'Whether to overwrite existing parameter',
	},
	{
		displayName: 'KMS Key ID',
		name: 'keyId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['put'],
				type: ['SecureString'],
			},
		},
		default: '',
		description: 'KMS key ID for SecureString encryption',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['put'],
			},
		},
		default: '[]',
		description: 'Tags as array of {Key, Value} objects',
	},
	// Get Multiple operation
	{
		displayName: 'Parameter Names',
		name: 'parameterNames',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['getMultiple'],
			},
		},
		default: '[]',
		description: 'Array of parameter names',
	},
	// Get By Path operation
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['getByPath'],
			},
		},
		default: '/',
		description: 'Parameter path (e.g., /my-app/)',
	},
	{
		displayName: 'Recursive',
		name: 'recursive',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['getByPath'],
			},
		},
		default: false,
		description: 'Whether to retrieve all parameters in hierarchy',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['list', 'getByPath'],
			},
		},
		default: 50,
		description: 'Maximum number of results',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['list', 'getByPath'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['parameter'],
				operation: ['list'],
			},
		},
		default: '[]',
		description: 'Filters as array of {Key, Values} objects',
	},
];
