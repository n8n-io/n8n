import type { INodeProperties } from 'n8n-workflow';

import * as classify from './classify.operation';
import * as message from './message.operation';
import * as response from './response.operation';

export { classify, message, response };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate a Model Response',
				value: 'response',
				action: 'Generate a model response',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period, n8n-nodes-base/node-param-description-missing-final-period
				description: 'Generate a model response with GPT 3, 4, 5, etc. using Responses API',
			},
			{
				name: 'Generate a Chat Completion',
				value: 'message',
				action: 'Generate a chat completion',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period, n8n-nodes-base/node-param-description-missing-final-period
				description: 'Create a completion with GPT 3, 4, 5, etc. using Completions API',
			},
			{
				name: 'Classify Text for Violations',
				value: 'classify',
				action: 'Classify text for violations',
				description: 'Check whether content complies with usage policies',
			},
		],
		default: 'response',
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
	},

	...classify.description,
	...message.description,
	...response.description,
];
