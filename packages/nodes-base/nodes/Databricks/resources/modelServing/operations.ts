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
			name: 'Query Endpoint',
			value: 'queryEndpoint',
			description:
				'Query a serving endpoint. The input format is automatically detected from the endpoint schema.',
			action: 'Query a serving endpoint',
		},
	],
	default: 'queryEndpoint',
};
