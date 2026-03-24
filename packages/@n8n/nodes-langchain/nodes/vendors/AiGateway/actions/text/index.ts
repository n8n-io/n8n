import type { INodeProperties } from 'n8n-workflow';

import * as json from './json.operation';
import * as message from './message.operation';
import * as messageVision from './messageVision.operation';

export { json, message, messageVision };

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
				description: 'Chat completion with plain text',
			},
			{
				name: 'Message with Images',
				value: 'messageVision',
				action: 'Message with images',
				description: 'Multimodal chat using image URLs',
			},
			{
				name: 'JSON',
				value: 'json',
				action: 'Generate JSON',
				description: 'Structured JSON output (models that support response_format)',
			},
		],
		default: 'message',
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
	},
	...message.description,
	...messageVision.description,
	...json.description,
];
