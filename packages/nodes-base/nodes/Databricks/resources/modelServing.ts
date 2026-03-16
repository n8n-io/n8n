import type { INodeProperties } from 'n8n-workflow';

export const modelServingOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['modelServing'],
		},
	},
	options: [
		{
			name: 'Create Serving Endpoint',
			value: 'createEndpoint',
			description: 'Create a new serving endpoint',
			action: 'Create a serving endpoint',
			routing: {
				request: {
					method: 'POST',
					url: '/api/2.0/serving-endpoints',
					body: {
						name: '={{$parameter.endpointName}}',
						config: {
							served_models: '={{$parameter.servedModels}}',
							traffic_config: '={{$parameter.trafficConfig}}',
							served_entities: '={{$parameter.additionalFields?.servedEntities}}',
						},
					},
				},
			},
		},
		{
			name: 'Delete Serving Endpoint',
			value: 'deleteEndpoint',
			description: 'Delete a serving endpoint',
			action: 'Delete a serving endpoint',
			routing: {
				request: {
					method: 'DELETE',
					url: '/api/2.0/serving-endpoints/{{$parameter.endpointName}}',
				},
			},
		},
		{
			name: 'Get Serving Endpoint',
			value: 'getEndpoint',
			description: 'Get a serving endpoint',
			action: 'Get a serving endpoint',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.0/serving-endpoints/{{$parameter.endpointName}}',
				},
			},
		},
		{
			name: 'Get Serving Endpoint Logs',
			value: 'getEndpointLogs',
			action: 'Get serving endpoint logs',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.0/serving-endpoints/{{$parameter.endpointName}}/logs',
				},
			},
		},
		{
			name: 'List Serving Endpoints',
			value: 'listEndpoints',
			description: 'List all serving endpoints',
			action: 'List serving endpoints',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.0/serving-endpoints',
				},
			},
		},
		{
			name: 'Query Endpoint',
			value: 'queryEndpoint',
			description: 'Query a serving endpoint',
			action: 'Query a serving endpoint',
			routing: {
				request: {
					method: 'POST',
					url: '/serving-endpoints/{{$parameter.endpointName}}/invocations',
					body: {
						inputs: '={{$parameter.inputs}}',
					},
				},
			},
		},
		{
			name: 'Update Serving Endpoint',
			value: 'updateEndpoint',
			description: 'Update a serving endpoint configuration',
			action: 'Update a serving endpoint',
			routing: {
				request: {
					method: 'PUT',
					url: '/api/2.0/serving-endpoints/{{$parameter.endpointName}}/config',
					body: {
						served_models: '={{$parameter.servedModels}}',
						traffic_config: '={{$parameter.trafficConfig}}',
						served_entities: '={{$parameter.additionalFields?.servedEntities}}',
					},
				},
			},
		},
	],
	default: 'listEndpoints',
};

export const modelServingParameters: INodeProperties[] = [
	{
		displayName: 'Endpoint Name',
		name: 'endpointName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the serving endpoint',
		displayOptions: {
			show: {
				resource: ['modelServing'],
				operation: [
					'getEndpoint',
					'updateEndpoint',
					'deleteEndpoint',
					'queryEndpoint',
					'getEndpointLogs',
				],
			},
		},
	},
	{
		displayName: 'Served Models',
		name: 'servedModels',
		type: 'json',
		required: true,
		default: '',
		description: 'List of models to serve (in JSON format)',
		displayOptions: {
			show: {
				resource: ['modelServing'],
				operation: ['createEndpoint', 'updateEndpoint'],
			},
		},
	},
	{
		displayName: 'Traffic Config',
		name: 'trafficConfig',
		type: 'json',
		required: true,
		default: '',
		description: 'Traffic configuration for the endpoint (in JSON format)',
		displayOptions: {
			show: {
				resource: ['modelServing'],
				operation: ['createEndpoint', 'updateEndpoint'],
			},
		},
	},
	{
		displayName: 'Input Data',
		name: 'inputs',
		type: 'json',
		required: true,
		default: '',
		description: 'Input data for model inference (in JSON format)',
		displayOptions: {
			show: {
				resource: ['modelServing'],
				operation: ['queryEndpoint'],
			},
		},
	},
];
