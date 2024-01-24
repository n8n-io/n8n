import type { INodeProperties } from 'n8n-workflow';

import * as createModeration from './createModeration.operation';
import * as messageModel from './messageModel.operation';
import * as messageAssistant from './messageAssistant.operation';

export { createModeration, messageModel, messageAssistant };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Classify Text for Violations',
				value: 'createModeration',
				action: 'Classify text for violations',
				description: 'Check whether content complies with usage policies',
			},
			{
				name: 'Message a Model',
				value: 'messageModel',
				action: 'Message a model',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period
				description: 'Create a completion with GPT 3, 4, etc.',
			},
			{
				name: 'Message an Assistant',
				value: 'messageAssistant',
				action: 'Message an assistant',
				description: 'Send messages to an assistant',
			},
		],
		default: 'messageModel',
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
	},

	...createModeration.description,
	...messageModel.description,
	...messageAssistant.description,
];
