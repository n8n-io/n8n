import type { INodeProperties } from 'n8n-workflow';

import * as getAll from './getAll.operation';
import * as react from './react.operation';
import * as send from './send.operation';
import * as deleteMessage from './deleteMessage.operation';
import * as get from './get.operation';

export { getAll, react, send, deleteMessage, get };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'deleteMessage',
				description: 'Delete a message in a channel',
				action: 'Delete a message in a channel',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message in a channel',
				action: 'Get a message in a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many the latest messages in a channel',
				action: 'Get many records',
			},
			{
				name: 'React with Emoji',
				value: 'react',
				description: 'React to a message with an emoji',
				action: 'React to a message with an emoji',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message to a channel, thread, or member',
				action: 'Send message',
			},
		],
		default: 'send',
	},
	...getAll.description,
	...react.description,
	...send.description,
	...deleteMessage.description,
	...get.description,
];
