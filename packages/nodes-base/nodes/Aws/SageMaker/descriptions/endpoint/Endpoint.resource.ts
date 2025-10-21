import type { INodeProperties } from 'n8n-workflow';

export const endpointOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['endpoint'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an endpoint',
				action: 'Create an endpoint',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.CreateEndpoint',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							EndpointName: '={{ $parameter["endpointName"] }}',
							EndpointConfigName: '={{ $parameter["endpointConfigName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an endpoint',
				action: 'Delete an endpoint',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DeleteEndpoint',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							EndpointName: '={{ $parameter["endpointName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about an endpoint',
				action: 'Describe an endpoint',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DescribeEndpoint',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							EndpointName: '={{ $parameter["endpointName"] }}',
						},
					},
				},
			},
			{
				name: 'Invoke',
				value: 'invoke',
				description: 'Invoke an endpoint for predictions',
				action: 'Invoke an endpoint',
				routing: {
					request: {
						method: 'POST',
						url: '=https://runtime.sagemaker.{{$credentials.region}}.amazonaws.com/endpoints/{{$parameter["endpointName"]}}/invocations',
						headers: {
							'Content-Type': '={{ $parameter["contentType"] || "text/csv" }}',
						},
						body: '={{ $parameter["body"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all endpoints',
				action: 'List endpoints',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.ListEndpoints',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an endpoint',
				action: 'Update an endpoint',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.UpdateEndpoint',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							EndpointName: '={{ $parameter["endpointName"] }}',
							EndpointConfigName: '={{ $parameter["endpointConfigName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const endpointFields: INodeProperties[] = [
	{
		displayName: 'Endpoint Name',
		name: 'endpointName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['endpoint'],
				operation: ['create', 'delete', 'describe', 'invoke', 'update'],
			},
		},
		default: '',
		description: 'The name of the endpoint',
	},
	{
		displayName: 'Endpoint Config Name',
		name: 'endpointConfigName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['endpoint'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'The name of the endpoint configuration',
	},
	// Invoke fields
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['endpoint'],
				operation: ['invoke'],
			},
		},
		default: '',
		description: 'The request body for the endpoint invocation',
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['endpoint'],
				operation: ['invoke'],
			},
		},
		default: 'text/csv',
		description: 'The MIME type of the input data',
	},
	// List fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['endpoint'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 10,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
			{
				displayName: 'Status Equals',
				name: 'StatusEquals',
				type: 'options',
				options: [
					{ name: 'OutOfService', value: 'OutOfService' },
					{ name: 'Creating', value: 'Creating' },
					{ name: 'Updating', value: 'Updating' },
					{ name: 'SystemUpdating', value: 'SystemUpdating' },
					{ name: 'RollingBack', value: 'RollingBack' },
					{ name: 'InService', value: 'InService' },
					{ name: 'Deleting', value: 'Deleting' },
					{ name: 'Failed', value: 'Failed' },
				],
				default: '',
				description: 'Filter by status',
			},
		],
	},
];
