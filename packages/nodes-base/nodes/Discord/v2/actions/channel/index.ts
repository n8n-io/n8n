import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteChannel from './deleteChannel.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';
import { guildRLC } from '../common.description';

export { create, get, getAll, update, deleteChannel };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				authentication: ['botToken', 'oAuth2'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new channel',
				action: 'Create a channel',
			},
			{
				name: 'Delete',
				value: 'deleteChannel',
				description: 'Delete a channel',
				action: 'Delete a channel',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a channel',
				action: 'Get a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve the channels of a server',
				action: 'Get many channels',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a channel',
				action: 'Update a channel',
			},
		],
		default: 'create',
	},
	{
		...guildRLC,
		displayOptions: {
			show: {
				resource: ['channel'],
				authentication: ['botToken', 'oAuth2'],
			},
		},
	},
	...create.description,
	...deleteChannel.description,
	...get.description,
	...getAll.description,
	...update.description,
];
