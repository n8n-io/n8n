import type { INodeProperties } from 'n8n-workflow';

import * as classify from './classify.operation';
import * as message from './message.operation';

export { classify, message };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Message a Model',
				value: 'message',
				action: 'Message a model',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period
				description: 'Create a completion with GPT 3, 4, etc.',
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
];
