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
				name: 'Message a Model (Deprecated)',
				value: 'message',
				action: 'Message a model(deprecated)',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period, n8n-nodes-base/node-param-description-missing-final-period
				description:
					'Create a completion with GPT 3, 4, etc. (Use "Create a Model Response" instead)',
			},
			{
				name: 'Create a Model Response',
				value: 'response',
				action: 'Create a Model Response',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period
				description: 'Create a model response with GPT 3, 4, 5, etc.',
			},
			{
				name: 'Classify Text for Violations',
				value: 'classify',
				action: 'Classify text for violations',
				description: 'Check whether content complies with usage policies',
			},
		],
		default: 'message',
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
