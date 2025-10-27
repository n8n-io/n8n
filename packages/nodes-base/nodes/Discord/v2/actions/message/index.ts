import { SEND_AND_WAIT_OPERATION, type INodeProperties } from 'n8n-workflow';

import * as deleteMessage from './deleteMessage.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as react from './react.operation';
import * as send from './send.operation';
import * as sendAndWait from './sendAndWait.operation';
import { guildRLC } from '../common.description';

export { getAll, react, send, deleteMessage, get, sendAndWait };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
				authentication: ['botToken', 'oAuth2'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'deleteMessage',
				description: 'Delete a message in a channel',
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message in a channel',
				action: 'Get a message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve the latest messages in a channel',
				action: 'Get many messages',
			},
			{
				name: 'React with Emoji',
				value: 'react',
				description: 'React to a message with an emoji',
				action: 'React with an emoji to a message',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message to a channel, thread, or member',
				action: 'Send a message',
			},
			{
				name: 'Send and Wait for Response',
				value: SEND_AND_WAIT_OPERATION,
				description: 'Send a message and wait for response',
				action: 'Send message and wait for response',
			},
		],
		default: 'send',
	},
	{
		...guildRLC,
		displayOptions: {
			show: {
				resource: ['message'],
				authentication: ['botToken', 'oAuth2'],
			},
		},
	},
	...getAll.description,
	...react.description,
	...send.description,
	...deleteMessage.description,
	...get.description,
	...sendAndWait.description,
];
